// Prueba el comando público, no las funciones internas del ejecutor. Requiere Chrome instalado.
// HTTP sirve fixtures del límite externo; nunca se usan usuarios, datos ni proveedores reales.
// Ejecutar: node --test qa/browser/runner.test.mjs
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

import { launchChrome, newContext, openPage } from './cdp.mjs'

const runner = fileURLToPath(new URL('./run.mjs', import.meta.url))
const titles = {
    '/login': 'Accede a tu espacio financiero',
    '/register': 'Crea tu acceso',
    '/forgot-password': 'Recupera tu contraseña',
}

async function fixture(handler) {
    const server = createServer(handler)

    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))

    return {
        origin: `http://127.0.0.1:${server.address().port}`,
        close: () => new Promise((resolve) => server.close(resolve)),
    }
}

async function invoke(t, { only = 'F-UI-07', html, inaccessible = false, previous, relativeOutput = false } = {}) {
    const out = await mkdtemp(join(tmpdir(), 'fintrack-qa-runner-'))
    const app = await fixture((request, response) => {
        if (request.url === '/reset-limits') {
            response.setHeader('Content-Type', 'application/json')
            response.end('{}')
            return
        }

        response.setHeader('Content-Type', 'text/html; charset=utf-8')
        response.end(html?.(request.url) ?? `<h1>${titles[request.url]}</h1><form><input aria-label="Correo electrónico"></form>`)
    })
    const portReservation = await fixture((_request, response) => response.end())
    const port = new URL(portReservation.origin).port
    const unavailable = await fixture((_request, response) => response.end())
    const base = inaccessible ? unavailable.origin : app.origin

    await portReservation.close()
    await unavailable.close()
    t.after(async () => {
        await app.close()
        await rm(out, { force: true, recursive: true })
    })

    if (previous) {
        await writeFile(join(out, 'results.json'), JSON.stringify(previous))
    }

    const env = { ...process.env, QA_BASE: base, QA_CONTROL: app.origin, QA_CDP_PORT: port, QA_ACCESS_TTL_SECONDS: '', QA_CHROME_PROFILE_DIR: join(out, 'profile') }

    if (relativeOutput) {
        delete env.QA_CHROME_PROFILE_DIR
    }

    const child = spawn(process.execPath, [runner, '--only', only, '--out', relativeOutput ? relative(process.cwd(), out) : out], {
        env,
        stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''

    child.stdout.on('data', (data) => { output += data })
    child.stderr.on('data', (data) => { output += data })
    const timer = setTimeout(() => child.kill(), 60_000)
    const code = await new Promise((resolve, reject) => {
        child.on('error', reject)
        child.on('exit', resolve)
    })

    clearTimeout(timer)
    const results = await readFile(join(out, 'results.json'), 'utf8').then(JSON.parse).catch(() => null)

    return { code, output, results }
}

test('a failed scenario makes the public command fail', async (t) => {
    const run = await invoke(t, { html: () => '<h1>Uno</h1><h1>Dos</h1>' })

    assert.equal(run.results['F-UI-07'].status, 'fallido', run.output)
    assert.equal(run.code, 1, run.output)
})

test('an inaccessible app cannot be approved as a Chrome error page', async (t) => {
    const run = await invoke(t, { inaccessible: true })

    assert.equal(run.results['F-UI-07'].status, 'fallido', run.output)
    assert.equal(run.code, 1, run.output)
    assert.match(run.results['F-UI-07'].error, /navegación|net::|origen/i)
})

test('one incorrect heading cannot impersonate the authentication pages', async (t) => {
    const run = await invoke(t, { html: () => '<h1>No se puede acceder a este sitio</h1><form><input></form>' })

    assert.equal(run.results['F-UI-07'].status, 'fallido', run.output)
    assert.equal(run.code, 1, run.output)
})

test('a blocked scenario is not a successful validation', async (t) => {
    const run = await invoke(t, { only: 'F-AUTH-01' })

    assert.equal(run.results['F-AUTH-01'].status, 'bloqueado', run.output)
    assert.equal(run.code, 1, run.output)
})

test('a passing selection writes only the results of the current run', async (t) => {
    const run = await invoke(t, { previous: { OLD: { id: 'OLD', status: 'aprobado' } } })

    assert.equal(run.code, 0, run.output)
    assert.deepEqual(Object.keys(run.results), ['F-UI-07'])
    assert.equal(run.results['F-UI-07'].status, 'aprobado')
})

test('a relative output directory works without a shared Chrome profile', async (t) => {
    const run = await invoke(t, { relativeOutput: true })

    assert.equal(run.code, 0, run.output)
    assert.equal(run.results['F-UI-07'].status, 'aprobado')
})

test('unknown and empty selections fail without manufacturing successful results', async (t) => {
    for (const only of ['UNKNOWN-SCENARIO', '']) {
        const run = await invoke(t, { only })

        assert.equal(run.code, 1, run.output)
        assert.match(run.output, /selección|desconocido|vacío/i)
        assert.equal(run.results, null)
    }
})

test('navigation permits internal authentication redirects and rejects a different origin', async (t) => {
    const out = await mkdtemp(join(tmpdir(), 'fintrack-qa-navigation-'))
    const external = await fixture((_request, response) => response.end('<h1>Sitio externo</h1>'))
    const app = await fixture((request, response) => {
        if (request.url === '/protected') {
            response.writeHead(302, { Location: '/login' })
        } else if (request.url === '/external') {
            response.writeHead(302, { Location: external.origin })
        }

        response.end('<h1>Accede a tu espacio financiero</h1>')
    })
    const portReservation = await fixture((_request, response) => response.end())
    const port = Number(new URL(portReservation.origin).port)

    await portReservation.close()
    let browser
    let context
    let page

    t.after(async () => {
        await page?.close()
        await context?.dispose()
        await browser?.close()
        await app.close()
        await external.close()
        await rm(out, { force: true, recursive: true })
    })
    browser = await launchChrome({ port, profileDir: join(out, 'profile') })
    context = await newContext(browser)
    page = await openPage(browser, { baseUrl: app.origin, contextId: context.id })
    await page.goto('/protected')
    assert.equal(await page.evaluate('location.pathname'), '/login')
    await page.reload()
    assert.equal(await page.evaluate('document.querySelector("h1").textContent'), 'Accede a tu espacio financiero')
    await assert.rejects(page.goto('/external'), /Origen inesperado/)
})

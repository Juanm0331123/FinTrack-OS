// Escenarios del QA frontend contra la compilación de producción (next start) conectada por su
// proxy /api/* a la API real de backend/test/support/frontend-qa-api.ts sobre PostgreSQL aislado.
//
//   node qa/browser/run.mjs [--only id1,id2] [--out <dir>]
//
// Variables: QA_BASE (http://127.0.0.1:3300), QA_CONTROL (http://127.0.0.1:4411), QA_CDP_PORT (9333).
// Resultado por escenario: aprobado | fallido | bloqueado, con lo observado y lo esperado.
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

import { decodeJwtSubject, ensureDir, launchChrome, network, newContext, openPage, pathJoin, sleep } from './cdp.mjs'
import { contrastRatio, decodePng } from './png.mjs'
import { createRemediationScenarios } from './remediation-scenarios.mjs'

const BASE = process.env.QA_BASE ?? 'http://127.0.0.1:3300'
const CONTROL = process.env.QA_CONTROL ?? 'http://127.0.0.1:4411'
const CDP_PORT = Number(process.env.QA_CDP_PORT ?? 9333)
const args = process.argv.slice(2)

function option(name) {
    const index = args.indexOf(name)

    if (index === -1) {
        return null
    }

    const value = args[index + 1]

    if (!value?.trim() || value.startsWith('--')) {
        throw new Error(`Valor vacío o ausente para ${name}; la selección debe ser explícita.`)
    }

    return value
}

for (let index = 0; index < args.length; index += 2) {
    if (!['--only', '--out'].includes(args[index]) || args.indexOf(args[index]) !== index) {
        throw new Error(`Argumento desconocido o repetido: ${args[index]}`)
    }

    option(args[index])
}

const only = option('--only')?.split(',').map((id) => id.trim()) ?? null
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url))
const OUT = option('--out') ?? pathJoin(repoRoot, '.local', 'frontend-qa-remediation', 'browser')
const PASSWORD = 'Clave-segura-2026'

async function control(method, path, body) {
    const response = await fetch(`${CONTROL}${path}`, {
        body: body === undefined ? undefined : JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
        method,
    })
    const data = await response.json()

    if (!response.ok) {
        throw new Error(`control ${path}: ${data.error}`)
    }

    return data
}

const qa = {
    code: (email) => control('GET', `/code?email=${encodeURIComponent(email)}`).then((data) => data.code),
    finance: (user, steps) => control('POST', '/finance', { email: user.email, password: user.password, steps }),
    resetLimits: () => control('POST', '/reset-limits', {}),
    user: (label) => control('POST', '/users', { label }),
    workbook: (user) => control('POST', '/workbook', { email: user.email, password: user.password }),
}

// Usuario con cuenta, hoja del mes de octubre de 2026 (y opcionalmente septiembre) y filas base.
async function seededUser(label, { months = ['2026-10'], salary = 3_000_000, entries = true } = {}) {
    const user = await qa.user(label)
    const steps = [{ body: { name: 'Cuenta principal' }, method: 'POST', path: '/accounts' }]

    for (const yearMonth of months) {
        steps.push({ body: { yearMonth }, method: 'POST', path: '/sheets' })
        steps.push({ body: { salary }, method: 'PATCH', path: `/sheets/${yearMonth}` })
    }

    const [account] = await qa.finance(user, steps)

    if (entries) {
        const last = months.at(-1)

        await qa.finance(user, [
            { body: { accountId: account.body.data.id, amount: 800_000, category: 'FIXED', concept: 'Arriendo', dueDay: 10 }, method: 'POST', path: `/sheets/${last}/entries` },
            { body: { accountId: account.body.data.id, amount: 400_000, category: 'POCKET', concept: 'Mercado' }, method: 'POST', path: `/sheets/${last}/entries` },
        ])
    }

    return { ...user, accountId: account.body.data.id }
}

const q = {
    button: (name) => `__qa.byRole('button', ${JSON.stringify(name)})[0]`,
    link: (name) => `__qa.byRole('link', ${JSON.stringify(name)})[0]`,
    label: (name) => `__qa.byLabel(${JSON.stringify(name)})[0]`,
    text: (value) => `__qa.byText(${JSON.stringify(value)})[0]`,
}

async function login(page, user, month = '2026-10') {
    await page.goto('/login')
    await page.waitFor(`!!${q.button('Acceder a FinTrack OS')}`, { label: 'formulario de acceso' })
    await page.fill(q.label('Correo electrónico'), user.email)
    await page.fill(q.label('Contraseña'), user.password)
    await page.clickAt(q.button('Acceder a FinTrack OS'))
    await page.waitFor(`location.pathname.startsWith('/dashboard')`, { label: 'llegada al dashboard' })

    if (month) {
        await page.goto(`/dashboard?month=${month}`)
        await page.waitFor(`!!${q.label('Salario')}`, { label: 'hoja del mes cargada' })
    }
}

// En escritorio el cierre de sesión está en el sidebar; en móvil, en el menú de usuario.
async function logout(page) {
    if (await page.evaluate(`!!__qa.byRole('button', 'Cerrar sesión')[0]`)) {
        await page.clickAt(`__qa.byRole('button', 'Cerrar sesión')[0]`)
        return
    }

    await page.clickAt(`__qa.byRole('button', 'Menú de')[0]`)
    await page.clickAt(`__qa.byText('Cerrar sesión')[0]`)
}

async function otpValues(page) {
    return page.evaluate(`[...document.querySelectorAll('input[aria-label^="Dígito"]')].map((input) => input.value)`)
}

async function pasteInto(page, locator, text) {
    await page.evaluate(`(() => { const el = ${locator}; el.focus(); const data = new DataTransfer(); data.setData('text', ${JSON.stringify(text)}); el.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: data })) })()`)
}

async function registerUntilCode(page, label) {
    const email = `${label}-${Date.now()}@fintrack.test`

    await page.goto('/register')
    await page.waitFor(`!!${q.button('Crear cuenta en FinTrack OS')}`, { label: 'formulario de registro' })
    await page.fill(q.label('Nombre'), 'Persona')
    await page.fill(q.label('Correo electrónico'), email)
    await page.fill(`document.getElementById('password')`, PASSWORD)
    await page.fill(`document.getElementById('confirmPassword')`, PASSWORD)
    await page.clickAt(q.button('Crear cuenta en FinTrack OS'))
    await page.waitFor(`document.querySelectorAll('input[aria-label^="Dígito"]').length === 6`, { label: 'pantalla del código' })

    return email
}

function result(id, ok, observed, expected, extra = {}) {
    return { expected, id, observed, status: ok ? 'aprobado' : 'fallido', ...extra }
}

// ——— Escenarios ——————————————————————————————————————————————————————————————

const scenarios = {
    // Registro → código fuera de orden, borrado intermedio, flechas y pegado → sesión.
    async 'F-AUTH-02'({ page }) {
        await registerUntilCode(page, 'otp')
        const digit = (n) => `document.querySelector('input[aria-label="Dígito ${n} del código"]')`

        await page.clickAt(digit(3))
        await page.typeText('3')
        await sleep(150)

        const outOfOrder = await otpValues(page)

        await pasteInto(page, digit(1), '123456')
        await sleep(150)
        await page.focus(digit(3))
        await page.press('Backspace')
        await sleep(150)

        const middleDeleted = await otpValues(page)

        await page.focus(digit(1))
        await page.press('ArrowRight')
        await page.press('ArrowRight')

        const focusedAfterArrows = await page.evaluate(`document.activeElement?.getAttribute('aria-label')`)
        const ok =
            JSON.stringify(outOfOrder) === JSON.stringify(['', '', '3', '', '', '']) &&
            JSON.stringify(middleDeleted) === JSON.stringify(['1', '2', '', '4', '5', '6']) &&
            focusedAfterArrows === 'Dígito 3 del código'

        return result('F-AUTH-02', ok, { focusedAfterArrows, middleDeleted, outOfOrder }, {
            focusedAfterArrows: 'Dígito 3 del código',
            middleDeleted: ['1', '2', '', '4', '5', '6'],
            outOfOrder: ['', '', '3', '', '', ''],
        })
    },

    // Registro completo con el código real de la bandeja controlada → dashboard.
    async 'AUTH-registro'({ page }) {
        const email = await registerUntilCode(page, 'registro')

        await pasteInto(page, `document.querySelector('input[aria-label="Dígito 1 del código"]')`, await qa.code(email))
        await page.clickAt(q.button('Validar correo y continuar'))
        await page.waitFor(`location.pathname.startsWith('/dashboard')`, { label: 'sesión tras verificar' })

        return result('AUTH-registro', true, { path: await page.evaluate('location.pathname') }, { path: '/dashboard' })
    },

    // Respuesta tardía de verificación tras «Usar otro correo»: no adopta sesión ni redirige.
    async 'F-AUTH-03-verificacion'({ page }) {
        const email = await registerUntilCode(page, 'cancel')
        const held = []

        await pasteInto(page, `document.querySelector('input[aria-label="Dígito 1 del código"]')`, await qa.code(email))
        await page.intercept({ handle: network.hold(held), match: (request) => request.url.includes('/api/auth/verify-email-code'), urlPattern: '*verify-email-code*' })
        await page.clickAt(q.button('Validar correo y continuar'))
        await page.waitFor('true')
        for (let i = 0; i < 50 && held.length === 0; i += 1) await sleep(100)
        await page.clickAt(q.button('Usar otro correo'))
        await page.waitFor(`!!${q.button('Crear cuenta en FinTrack OS')}`, { label: 'vuelve al registro' })

        // Si el cliente ya canceló la petición al abandonar el paso, el navegador la descarta y no
        // hay respuesta que soltar: se registra como cancelada.
        const release = await held[0]?.release().then(() => 'soltada', () => 'cancelada por el cliente')

        await sleep(2_500)

        const observed = await page.evaluate(`({ path: location.pathname, registerForm: !!${q.button('Crear cuenta en FinTrack OS')}, hint: localStorage.getItem('fintrack.auth.has-session') })`)

        return result('F-AUTH-03-verificacion', observed.path === '/register' && observed.registerForm && observed.hint === null, { ...observed, release }, { hint: null, path: '/register', registerForm: true }, { held: held.length })
    },

    // «Volver a empezar» mientras se valida el código: la respuesta tardía no revive el paso.
    async 'F-AUTH-03-recuperacion'({ page }) {
        const user = await qa.user('forgot')
        const held = []

        await page.goto('/forgot-password')
        await page.fill(q.label('Correo electrónico'), user.email)
        await page.clickAt(q.button('Enviar código de recuperación'))
        await page.waitFor(`document.querySelectorAll('input[aria-label^="Dígito"]').length === 6`, { label: 'paso del código' })
        await pasteInto(page, `document.querySelector('input[aria-label="Dígito 1 del código"]')`, await qa.code(user.email))
        await page.intercept({ handle: network.hold(held), match: (request) => request.url.includes('/forgot-password/verify-code'), urlPattern: '*verify-code*' })
        await page.clickAt(q.button('Validar código'))
        for (let i = 0; i < 50 && held.length === 0; i += 1) await sleep(100)
        await page.clickAt(q.button('Volver a empezar'))
        await page.waitFor(`!!${q.button('Enviar código de recuperación')}`, { label: 'vuelve al paso del correo' })

        const release = await held[0]?.release().then(() => 'soltada', () => 'cancelada por el cliente')

        await sleep(2_500)

        const observed = await page.evaluate(`({ newPassword: !!document.getElementById('forgot-password-new-password'), requestStep: !!${q.button('Enviar código de recuperación')} })`)

        return result('F-AUTH-03-recuperacion', !observed.newPassword && observed.requestStep, { ...observed, release }, { newPassword: false, requestStep: true }, { held: held.length })
    },

    // Estado de verificación persistido incompatible, nulo, inválido o vencido.
    async 'F-AUTH-04'({ page }) {
        const cases = {
            emailInvalido: JSON.stringify({ email: 5, expiresAt: new Date(Date.now() + 600_000).toISOString(), source: 'login' }),
            fuenteInvalida: JSON.stringify({ email: 'x@fintrack.test', expiresAt: new Date(Date.now() + 600_000).toISOString(), source: 'otra' }),
            jsonNulo: 'null',
            objetoVacio: '{}',
            vencido: JSON.stringify({ email: 'x@fintrack.test', expiresAt: new Date(Date.now() - 60_000).toISOString(), source: 'login' }),
        }
        const observed = {}

        for (const [name, value] of Object.entries(cases)) {
            await page.goto('/login')
            await page.evaluate(`sessionStorage.setItem('fintrack.auth.pending-verification', ${JSON.stringify(value)})`)
            page.exceptions.length = 0
            await page.reload()
            await sleep(1_200)
            observed[name] = await page.evaluate(`({ form: !!${q.button('Acceder a FinTrack OS')}, stored: sessionStorage.getItem('fintrack.auth.pending-verification') })`)
            observed[name].exceptions = page.exceptions.slice()
        }

        const ok = Object.values(observed).every((item) => item.form && item.stored === null && item.exceptions.length === 0)

        return result('F-AUTH-04', ok, observed, 'formulario de acceso usable, estado descartado y sin excepciones en cada caso')
    },

    // Storage cuyas operaciones lanzan: el formulario funciona y un registro exitoso avanza.
    async 'F-AUTH-05'({ page }) {
        await page.send('Page.addScriptToEvaluateOnNewDocument', {
            source: `for (const name of ['getItem', 'setItem', 'removeItem']) { const original = Storage.prototype[name]; Storage.prototype[name] = function (...args) { if (this === window.sessionStorage) throw new DOMException('Bloqueado por la política del navegador', name === 'setItem' ? 'QuotaExceededError' : 'SecurityError'); return original.apply(this, args) } }`,
        })
        page.exceptions.length = 0
        await page.goto('/login')
        await sleep(1_200)

        const loginUsable = await page.evaluate(`!!${q.button('Acceder a FinTrack OS')}`)
        let reachedCode = false

        try {
            await registerUntilCode(page, 'storage')
            reachedCode = true
        } catch {
            reachedCode = false
        }

        const observed = { exceptions: page.exceptions.slice(0, 3), loginUsable, reachedCode, serverError: await page.evaluate(`__qa.byRole('alert').map(__qa.text)`) }

        return result('F-AUTH-05', loginUsable && reachedCode && observed.exceptions.length === 0, observed, { exceptions: [], loginUsable: true, reachedCode: true })
    },

    async 'F-AUTH-06'({ page }) {
        await page.goto('/auth/oauth/callback')
        await sleep(4_000)

        const observed = await page.evaluate(`({ heading: __qa.byRole('heading').map(__qa.text), loading: !!${q.text('Terminando el acceso')}, loginLink: !!${q.link('iniciar sesión')} })`)

        return result('F-AUTH-06', !observed.loading && observed.loginLink, observed, { loading: false, loginLink: true })
    },

    // Handoff de recuperación: estable en SSR/hidratación y al recargar.
    async 'F-ENG-01'({ page }) {
        const user = await qa.user('handoff')

        await page.goto('/login')
        await page.evaluate(`sessionStorage.setItem('fintrack.auth.password-reset-required', ${JSON.stringify(JSON.stringify({ email: user.email, expiresAt: new Date(Date.now() + 600_000).toISOString() }))})`)
        page.consoleErrors.length = 0
        page.exceptions.length = 0
        await page.goto('/forgot-password')
        await sleep(1_500)

        const first = await page.evaluate(`({ verifyStep: document.querySelectorAll('input[aria-label^="Dígito"]').length === 6, stored: sessionStorage.getItem('fintrack.auth.password-reset-required') !== null })`)

        await page.reload()
        await sleep(1_500)

        const afterReload = await page.evaluate(`({ verifyStep: document.querySelectorAll('input[aria-label^="Dígito"]').length === 6 })`)
        const hydration = [...page.consoleErrors, ...page.exceptions].filter((line) => /418|hydrat/i.test(line))

        return result('F-ENG-01', first.verifyStep && afterReload.verifyStep && hydration.length === 0, { afterReload, first, hydration }, { afterReload: { verifyStep: true }, first: { verifyStep: true }, hydration: [] })
    },

    // A inicia un cambio de contraseña con token vencido; el refresh queda retenido; otra pestaña
    // entra como B. Nada del formulario de A puede salir con la identidad de B.
    async 'F-AUTH-01'({ browser, context, page }) {
        const ttl = Number(process.env.QA_ACCESS_TTL_SECONDS ?? 0)

        if (!ttl) {
            return { id: 'F-AUTH-01', status: 'bloqueado', observed: 'requiere la API con QA_ACCESS_TTL corto (grupo identidad)', expected: 'ejecución con QA_ACCESS_TTL_SECONDS' }
        }

        const a = await seededUser('ident-a')
        const b = await seededUser('ident-b')
        const held = []

        await login(page, a)
        await page.goto('/dashboard/settings')
        await page.waitFor(`!!${q.button('Actualizar contraseña')}`, { label: 'panel de seguridad' })
        // El access token deja de estar «fresco» 30 s antes de vencer.
        await sleep(Math.max(0, ttl - 30 + 3) * 1000)
        await page.intercept({ handle: network.hold(held), match: (request) => request.url.includes('/api/auth/refresh'), urlPattern: '*api/auth/refresh*' })
        await page.fill(q.label('Contraseña actual'), a.password)
        await page.fill(q.label('Contraseña nueva'), 'Nueva-clave-2026')
        await page.fill(q.label('Repite la contraseña nueva'), 'Nueva-clave-2026')
        await page.clickAt(q.button('Actualizar contraseña'))
        for (let i = 0; i < 80 && held.length === 0; i += 1) await sleep(100)

        // Otra pestaña del mismo navegador entra como B y difunde su sesión, igual que
        // session-manager.setSession (BroadcastChannel 'fintrack-auth').
        const other = await openPage(browser, { baseUrl: BASE, contextId: context.id })
        const sessionB = await control('POST', '/session', { email: b.email, password: b.password })

        await other.goto('/')
        await other.evaluate(`new BroadcastChannel('fintrack-auth').postMessage({ type: 'session', session: { accessToken: ${JSON.stringify(sessionB.accessToken)}, accessTokenExpiresAt: new Date(Date.now() + ${sessionB.accessTokenExpiresInSeconds} * 1000).toISOString(), user: ${JSON.stringify(sessionB.user)} } })`)
        await sleep(1_500)
        await held[0]?.release()
        await sleep(4_000)

        const passwordRequests = page.requests.filter((request) => request.url.includes('/api/auth/password') && request.method === 'POST')
        const identities = passwordRequests.map((request) => decodeJwtSubject(request.authorization))
        const feedback = await page.evaluate(`[...__qa.byRole('alert'), ...__qa.byRole('status')].map(__qa.text)`)
        let bStillUsesOldPassword = true

        try {
            await qa.workbook(b)
        } catch {
            bStillUsesOldPassword = false
        }

        await other.close()

        const ok = !identities.includes(b.id) && bStillUsesOldPassword

        return result('F-AUTH-01', ok, { bStillUsesOldPassword, feedback, held: held.length, identities: identities.map((id) => (id === a.id ? 'A' : id === b.id ? 'B' : id)) }, { bStillUsesOldPassword: true, identities: 'ninguna petición con la identidad B' })
    },

    // ——— Integridad de datos ——————————————————————————————————————————————

    async 'F-DATA-01'({ page }) {
        const user = await seededUser('data01')

        await login(page, user)
        await page.intercept({ handle: network.fulfill(503, { message: 'Servicio no disponible', success: false }), match: (request) => request.method === 'PATCH' && request.url.includes('/sheets/2026-10'), urlPattern: '*api/finance/sheets/2026-10' })
        await page.fill(q.label('Salario'), '1000')
        await page.press('Tab')
        await page.waitFor(`!!${q.button('Reintentar')}`, { label: 'error de guardado visible' })
        await page.fill(q.label('Salario'), '2000')
        await page.press('Tab')
        await sleep(1_500)
        await page.clickAt(q.button('Reintentar'))
        await sleep(2_000)

        const ui = await page.evaluate(`${q.label('Salario')}.value`)
        const server = (await qa.workbook(user)).sheets.find((sheet) => sheet.yearMonth === '2026-10').salary

        await page.reload()
        await page.waitFor(`!!${q.label('Salario')}`)

        const afterReload = await page.evaluate(`${q.label('Salario')}.value`)
        const ok = server === 2000 && ui.replace(/\D/g, '') === '2000' && afterReload.replace(/\D/g, '') === '2000'

        return result('F-DATA-01', ok, { afterReload, server, ui }, { afterReload: '2.000', server: 2000, ui: '2.000' })
    },

    async 'F-DATA-02'({ page }) {
        const user = await seededUser('data02')

        await login(page, user, null)
        await page.goto('/dashboard/debts?month=2026-10')
        await page.clickAt(q.button('Agregar deuda'))
        await page.waitFor(`!!${q.label('Nombre')}`, { label: 'drawer de deuda' })
        await page.fill(q.label('Nombre'), 'Deuda respuesta perdida')
        await page.fill(q.label('Saldo total'), '100000')
        await page.intercept({ handle: network.fail('ConnectionReset'), match: (request) => request.method === 'POST' && request.url.endsWith('/api/finance/debts'), stage: 'response', urlPattern: '*api/finance/debts' })
        await page.clickAt(q.button('Guardar deuda'))
        await page.waitFor(`__qa.byRole('alert').length > 0`, { label: 'error de red mostrado' })
        await page.clickAt(q.button('Guardar deuda'))
        await sleep(2_000)

        const server = (await qa.workbook(user)).debts.filter((debt) => debt.name === 'Deuda respuesta perdida').length

        await page.goto('/dashboard/debts?month=2026-10')
        await sleep(1_500)

        const ui = await page.evaluate(`__qa.byText('Deuda respuesta perdida').length`)

        return result('F-DATA-02', server === 1 && ui >= 1, { server, ui }, { server: 1, ui: '≥1 tarjeta' })
    },

    // PATCH de salario retenido + «Copiar mes anterior»; el salario destino no cero se conserva.
    async 'F-DATA-03'({ page }) {
        const user = await seededUser('data03', { months: ['2026-09', '2026-10'], salary: 800 })
        const held = []

        await login(page, user)
        await page.intercept({ handle: network.hold(held), match: (request) => request.method === 'PATCH' && request.url.includes('/sheets/2026-10'), urlPattern: '*api/finance/sheets/2026-10' })
        await page.fill(q.label('Salario'), '401')
        await page.press('Tab')
        for (let i = 0; i < 40 && held.length === 0; i += 1) await sleep(100)
        await page.clickAt(q.button('Copiar mes anterior'))
        await sleep(300)

        if (await page.evaluate(`!!${q.button('Copiar filas')}`)) {
            await page.clickAt(q.button('Copiar filas'))
        }

        await sleep(500)
        await held[0]?.release()
        await sleep(3_000)

        const ui = await page.evaluate(`${q.label('Salario')}.value`)
        const server = (await qa.workbook(user)).sheets.find((sheet) => sheet.yearMonth === '2026-10').salary

        await page.reload()
        await page.waitFor(`!!${q.label('Salario')}`)

        const afterReload = await page.evaluate(`${q.label('Salario')}.value`)
        const ok = server === 401 && ui.replace(/\D/g, '') === '401' && afterReload.replace(/\D/g, '') === '401'

        return result('F-DATA-03', ok, { afterReload, server, ui }, { afterReload: '401', server: 401, ui: '401' })
    },

    async 'F-DATA-05'({ page }) {
        const user = await seededUser('data05')

        await login(page, user)
        await page.fill(q.label('Salario'), '1.234,56')
        await page.press('Tab')
        await sleep(1_500)

        const observed = await page.evaluate(`({ invalid: ${q.label('Salario')}.getAttribute('aria-invalid'), message: (() => { const ids = (${q.label('Salario')}.getAttribute('aria-describedby') || '').split(' '); return ids.map((id) => document.getElementById(id)?.textContent?.trim()).filter(Boolean) })() })`)
        const server = (await qa.workbook(user)).sheets.find((sheet) => sheet.yearMonth === '2026-10').salary

        return result('F-DATA-05', server === 3_000_000 && observed.invalid === 'true' && observed.message.length > 0, { ...observed, server }, { invalid: 'true', message: 'motivo asociado', server: 3_000_000 })
    },

    async 'F-DATA-07'({ page }) {
        const user = await seededUser('data07')

        await login(page, user, null)
        await page.goto('/dashboard/settings')
        await page.waitFor(`!!${q.label('Prestaciones')}`)
        await page.fill(q.label('Prestaciones'), '12,3456')
        await page.press('Tab')
        await sleep(2_000)

        const ui = await page.evaluate(`${q.label('Prestaciones')}.value`)
        const server = (await qa.workbook(user)).settings.benefitsRate

        return result('F-DATA-07', server === 0.1235 && ui === '12,35', { server, ui }, { server: 0.1235, ui: '12,35' })
    },

    async 'F-DATA-09'({ page }) {
        const user = await seededUser('data09')

        await login(page, user, null)

        const observed = {}

        for (const month of ['1999-12', '2100-01', '0000-01']) {
            await page.goto(`/dashboard?month=${month}`)
            await sleep(1_500)
            observed[month] = await page.evaluate(`({ notice: __qa.byRole('status').map(__qa.text).filter((t) => /mes/i.test(t)), title: document.title, createFor: __qa.byText('${month.slice(0, 4)}').length })`)
        }

        await page.goto('/dashboard?month=2000-01')
        await sleep(1_500)
        observed.previousFrom2000 = await page.evaluate(`!!document.querySelector('a[aria-label^="Mes anterior"]')`)

        const ok = ['1999-12', '2100-01', '0000-01'].every((month) => observed[month].notice.length > 0) && !observed.previousFrom2000

        return result('F-DATA-09', ok, observed, 'aviso de mes inválido con fallback y sin enlace anterior a 2000-01')
    },

    async 'F-DATA-10'({ page }) {
        const user = await seededUser('data10')

        await login(page, user)
        await page.intercept({ handle: network.fulfill(503, { message: 'Servicio no disponible', success: false }), match: (request) => request.method === 'PATCH', times: 50, urlPattern: '*api/finance/sheets/2026-10' })
        await page.fill(q.label('Salario'), '1234')
        await page.press('Tab')
        await page.waitFor(`!!${q.button('Reintentar')}`, { label: 'error de guardado' })
        await logout(page)
        await sleep(2_500)

        const observed = await page.evaluate(`({ path: location.pathname, dialog: __qa.byRole('dialog').map(__qa.text).join(' | ') })`)
        const ok = observed.path.startsWith('/dashboard') && /sin guardar/i.test(observed.dialog)

        return result('F-DATA-10', ok, observed, { dialog: 'ofrece reintentar o salir sin guardar', path: '/dashboard (sin salir)' })
    },

    async 'F-DATA-11'({ page }) {
        const user = await seededUser('data11', { entries: false })
        const fill = []

        for (let index = 0; index < 300; index += 1) {
            fill.push({ body: { amount: 1_000, category: 'OTHER', concept: `Fila ${index}` }, method: 'POST', path: '/sheets/2026-10/entries' })
        }

        await qa.finance(user, fill)
        await login(page, user)
        await page.clickAt(q.button('Nuevo gasto'))
        await page.waitFor(`!!${q.label('Concepto')}`, { label: 'drawer de gasto' })
        await page.fill(q.label('Concepto'), 'Sobre la cuota')
        await page.fill(`document.querySelector('[role="dialog"] input[id$="-amount"]')`, '5000')
        await page.clickAt(q.button('Agregar gasto'))
        await sleep(3_000)

        const observed = await page.evaluate(`({ row: __qa.byText('Sobre la cuota').length, message: [...__qa.byRole('alert'), ...__qa.byRole('status')].map(__qa.text).filter((t) => /300/.test(t)) })`)
        const server = (await qa.workbook(user)).sheets[0].entries.length

        return result('F-DATA-11', observed.row === 0 && observed.message.length > 0 && server === 300, { ...observed, server }, { message: 'motivo de cuota visible', row: 0, server: 300 })
    },

    async 'F-DATA-12'({ page }) {
        const user = await seededUser('data12')

        await login(page, user, null)
        await page.goto('/dashboard/debts?month=2026-10')
        await page.clickAt(q.button('Agregar deuda'))
        await page.waitFor(`!!${q.label('Nombre')}`)
        await page.fill(q.label('Nombre'), 'Compartida')
        await page.fill(q.label('Saldo total'), '100')
        await page.fill(q.label('Valor de la otra persona'), '200')
        await sleep(300)

        const observed = await page.evaluate(`({ error: document.getElementById('debt-shared-error')?.textContent ?? '', canSave: !${q.button('Guardar deuda')}.disabled })`)

        return result('F-DATA-12', /no puede superar/.test(observed.error) && !observed.canSave, observed, { canSave: false, error: 'no puede superar el saldo total' })
    },

    // ——— UX y accesibilidad ————————————————————————————————————————————————

    async 'F-UI-01'({ page }) {
        const user = await seededUser('ui01')

        await page.viewport(375, 812, true)
        await login(page, user)
        await page.intercept({ handle: network.fulfill(503, { message: 'Servicio no disponible', success: false }), match: (request) => request.method === 'PATCH', urlPattern: '*api/finance/sheets/2026-10' })
        await page.fill(q.label('Salario'), '1000')
        await page.press('Tab')
        await sleep(2_000)

        const observed = await page.evaluate(`(() => { const retry = __qa.byRole('button', 'Reintentar')[0]; if (!retry) return { retryVisible: false }; const r = retry.getBoundingClientRect(); return { retryVisible: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth, height: Math.round(r.height), live: !!retry.closest('[aria-live], [role="status"], [role="alert"]') } })()`)

        await page.screenshot(pathJoin(OUT, 'F-UI-01-375.png'))

        return result('F-UI-01', observed.retryVisible && observed.height >= 44 && observed.live, observed, { height: '≥44', live: true, retryVisible: true })
    },

    async 'F-UI-02'({ page }) {
        const user = await seededUser('ui02')

        await login(page, user)

        const checks = {}

        for (const [name, close] of [
            ['escape', async () => page.press('Escape')],
            ['cerrar', async () => page.clickAt(`document.querySelector('[role="dialog"] button[aria-label^="Cerrar"]')`)],
            ['cancelar', async () => page.clickAt(`__qa.byRole('button', 'Cancelar').find((b) => b.closest('[role="dialog"]'))`)],
        ]) {
            await page.clickAt(q.button('Nuevo gasto'))
            await page.waitFor(`!!document.querySelector('[role="dialog"]')`)
            await sleep(300)
            await close()
            await page.waitFor(`!document.querySelector('[role="dialog"]')`)
            await sleep(300)
            checks[name] = await page.evaluate(`__qa.accessibleName(document.activeElement)`)
        }

        // Disparador eliminado: se borra la fila desde su propio drawer.
        await page.clickAt(`__qa.byRole('button', 'Arriendo')[0]`)
        await page.waitFor(`!!document.querySelector('[role="dialog"]')`)
        await page.clickAt(`__qa.byRole('button', 'Eliminar').find((b) => b.closest('[role="dialog"]'))`)
        await page.waitFor(`!!__qa.byRole('dialog').find((d) => /Eliminar/.test(__qa.text(d)))`)
        await page.clickAt(`__qa.byRole('button', 'Eliminar').filter((b) => b.closest('[role="alertdialog"], [role="dialog"]')).at(-1)`)
        await page.waitFor(`!document.querySelector('[role="dialog"], [role="alertdialog"]')`)
        await sleep(300)
        checks.disparadorEliminado = await page.evaluate(`document.activeElement === document.body ? 'BODY' : __qa.accessibleName(document.activeElement) || document.activeElement.tagName`)

        const ok = ['escape', 'cerrar', 'cancelar'].every((name) => /Nuevo gasto/.test(checks[name])) && checks.disparadorEliminado !== 'BODY'

        return result('F-UI-02', ok, checks, { cancelar: 'Nuevo gasto', cerrar: 'Nuevo gasto', disparadorEliminado: 'destino deliberado (no BODY)', escape: 'Nuevo gasto' })
    },

    async 'F-UI-03'({ page }) {
        const user = await seededUser('ui03')
        const workbook = await qa.workbook(user)

        for (const category of ['SUBSCRIPTION', 'FIXED', 'SAVINGS', 'DEBT', 'OTHER']) {
            await qa.finance(user, [{ body: { amount: 10_000, category, concept: `Pagado ${category}`, dueDay: 12, isPaid: true }, method: 'POST', path: '/sheets/2026-10/entries' }])
        }

        void workbook
        await login(page, user, null)
        await page.goto('/dashboard/calendar?month=2026-10')
        await sleep(2_000)

        const chips = await page.evaluate(`(() => {
            const parse = (value) => { const m = value.match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] ?? 1] }
            const blend = (top, bottom) => [0, 1, 2].map((i) => top[i] * top[3] + bottom[i] * (1 - top[3]))
            const channel = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
            const lum = (c) => 0.2126 * channel(c[0]) + 0.7152 * channel(c[1]) + 0.0722 * channel(c[2])
            const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05) }
            return [...document.querySelectorAll('*')].filter((el) => /^Pagado /.test(el.textContent?.trim() || '') && el.children.length === 0).map((el) => {
                let opacity = 1; let node = el; let bg = null
                while (node && node !== document.body) { const s = getComputedStyle(node); opacity *= Number(s.opacity); if (!bg) { const c = parse(s.backgroundColor); if (c && c[3] > 0) bg = c } node = node.parentElement }
                const ink = parse(getComputedStyle(el).color)
                const base = blend([...(bg ?? [255, 255, 255, 1]).slice(0, 3), (bg ?? [0, 0, 0, 1])[3] * opacity], [255, 255, 255])
                const text = blend([...ink.slice(0, 3), ink[3] * opacity], base)
                const container = el.closest('[class*="line-through"], [aria-label]')
                return { label: el.textContent.trim(), ratio: Math.round(ratio(text, base) * 100) / 100, fontSize: getComputedStyle(el).fontSize, paidCue: /pagad/i.test((el.closest('[aria-label]')?.getAttribute('aria-label') || '') + ' ' + (el.parentElement?.textContent || '')) || getComputedStyle(el).textDecorationLine.includes('line-through') }
            })
        })()`)

        await page.screenshot(pathJoin(OUT, 'F-UI-03-calendar.png'))

        const ok = chips.length >= 5 && chips.every((chip) => chip.ratio >= 4.5 && chip.paidCue)

        return result('F-UI-03', ok, chips, 'cada chip pagado ≥ 4.5:1 y con señal no cromática')
    },

    async 'F-UI-04'({ page }) {
        const user = await seededUser('ui04')
        const offenders = {}

        await login(page, user, null)

        for (const width of [375, 768]) {
            await page.viewport(width, 900, width < 768)

            for (const route of ['/dashboard?month=2026-10', '/dashboard/settings', '/dashboard/debts?month=2026-10', '/dashboard/calendar?month=2026-10', '/dashboard/summary?month=2026-10']) {
                await page.goto(route)
                await sleep(1_200)
                offenders[`${width} ${route}`] = await page.evaluate(`[...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [role="switch"], [role="tab"]')].filter((el) => __qa.visible(el) && !el.closest('p, li > p') && !el.closest('.sr-only')).map((el) => {
                    // Área táctil real: la caja del campo cuando enfoca su único input, o el ::after
                    // posicionado que amplía una insignia.
                    const box = el.tagName === 'INPUT' && el.parentElement && el.parentElement.querySelectorAll('input').length === 1 && getComputedStyle(el.parentElement).display.includes('flex') ? el.parentElement : el
                    const r = box.getBoundingClientRect()
                    const after = getComputedStyle(el, '::after')
                    const grow = after.position === 'absolute' ? Math.max(0, -parseFloat(after.top) || 0) * 2 : 0
                    return { name: (__qa.accessibleName(el) || el.tagName).slice(0, 40), h: Math.round(r.height + grow), w: Math.round(r.width + grow) }
                }).filter((item) => item.h < 44 || item.w < 44).slice(0, 25)`)
            }
        }

        const total = Object.values(offenders).reduce((sum, list) => sum + list.length, 0)

        return result('F-UI-04', total === 0, offenders, 'ningún control táctil por debajo de 44×44 px en 375/768')
    },

    async 'F-UI-05'({ page }) {
        const user = await seededUser('ui05')

        await login(page, user, null)
        await page.goto('/dashboard/settings')
        const id = await page.waitFor(`__qa.byLabel('Nombre de la cuenta').find((input) => input.value === 'Cuenta principal')?.id`, { label: 'campo de cuenta' })
        const field = `document.getElementById(${JSON.stringify(id)})`

        await page.fill(field, '')
        await page.press('Tab')
        await sleep(500)

        const observed = await page.evaluate(`(() => { const input = ${field}; const ids = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean); const described = ids.map((id) => document.getElementById(id)).filter(Boolean); return { invalid: input.getAttribute('aria-invalid'), describedText: described.map((el) => el.textContent.trim()), announced: described.some((el) => el.getAttribute('role') === 'alert' || el.closest('[aria-live]')) } })()`)

        return result('F-UI-05', observed.invalid === 'true' && observed.describedText.length > 0 && observed.announced, observed, { announced: true, describedText: 'mensaje del error', invalid: 'true' })
    },

    async 'F-UI-06'({ page }) {
        const user = await seededUser('ui06')

        await login(page, user, null)
        await page.goto('/dashboard/calendar?month=2026-10')
        await sleep(1_500)

        const tabStops = await page.evaluate(`(() => { const grid = [...document.querySelectorAll('[role="grid"]')].find((el) => __qa.visible(el)); if (!grid) return { grid: false }; const cells = [...grid.querySelectorAll('[tabindex], button, a[href]')].filter((el) => el.tabIndex >= 0); return { grid: true, tabStops: cells.length } })()`)
        let movement = null

        if (tabStops.grid) {
            await page.focus(`[...document.querySelectorAll('[role="grid"] [role="gridcell"], [role="grid"] [tabindex]')].find((el) => el.tabIndex >= 0 && !el.disabled && __qa.visible(el))`)

            const before = await page.evaluate(`document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim().slice(0, 30)`)

            await page.press('ArrowRight')

            const afterRight = await page.evaluate(`document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim().slice(0, 30)`)

            await page.press('ArrowDown')

            const afterDown = await page.evaluate(`document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim().slice(0, 30)`)

            movement = { afterDown, afterRight, before }
        }

        const ok = !tabStops.grid || (tabStops.tabStops === 1 && movement.before !== movement.afterRight && movement.afterRight !== movement.afterDown)

        return result('F-UI-06', ok, { ...tabStops, movement }, 'grid con una sola parada Tab y flechas que mueven el foco (o semántica sin grid)')
    },

    async 'F-UI-07'({ page }) {
        const observed = {}
        const expected = {
            '/login': 'Accede a tu espacio financiero',
            '/register': 'Crea tu acceso',
            '/forgot-password': 'Recupera tu contraseña',
        }

        for (const route of Object.keys(expected)) {
            await page.goto(route)
            await page.waitFor(`!!document.querySelector('h1')`, { label: `encabezado de ${route}` })
            observed[route] = await page.evaluate(`({ headings: [...document.querySelectorAll('h1')].map((h) => h.textContent.trim()), form: !!document.querySelector('form input'), path: location.pathname })`)
        }

        const ok = Object.entries(observed).every(([route, item]) => item.headings.length === 1 && item.headings[0] === expected[route] && item.form && item.path === route)

        return result('F-UI-07', ok, observed, { headings: expected, form: true, path: 'ruta de autenticación solicitada' })
    },

    async 'F-UI-08'({ page }) {
        const user = await seededUser('ui08')

        await login(page, user)
        await page.goto('/dashboard?month=2026-10')
        await page.waitFor(`!!${q.label('Salario')}`)
        await page.evaluate(`document.activeElement?.blur(); window.scrollTo(0, 0)`)
        await page.press('Tab')

        const first = await page.evaluate(`(() => { const el = document.activeElement; const r = el.getBoundingClientRect(); return { name: __qa.accessibleName(el), visible: r.width > 1 && r.height > 1 && r.top >= 0 } })()`)

        await page.press('Enter')
        await sleep(300)

        const target = await page.evaluate(`(() => { const el = document.activeElement; return { inMain: !!el.closest('main') || el.tagName === 'MAIN', tag: el.tagName } })()`)

        return result('F-UI-08', /saltar/i.test(first.name) && first.visible && target.inMain, { first, target }, { first: 'Saltar al contenido visible', target: 'foco dentro de main' })
    },

    async 'F-UI-13'({ page }) {
        const user = await seededUser('ui13', { salary: 999_999_999_999 })
        const observed = {}

        await page.viewport(375, 812, true)
        await login(page, user)
        await sleep(800)

        const measure = `[...document.querySelectorAll('dd')].filter((dd) => /\\$/.test(dd.textContent)).map((dd) => ({ text: dd.textContent.trim(), clipped: dd.scrollWidth > dd.clientWidth + 1 || [...dd.querySelectorAll('*')].some((c) => c.scrollWidth > c.clientWidth + 1) })).slice(0, 8)`

        observed.normal = await page.evaluate(measure)
        await page.screenshot(pathJoin(OUT, 'F-UI-13-375.png'))
        await page.evaluate(`document.documentElement.style.fontSize = '200%'`)
        await sleep(500)
        observed.texto200 = await page.evaluate(measure)
        await page.screenshot(pathJoin(OUT, 'F-UI-13-375-texto200.png'))
        await page.evaluate(`document.documentElement.style.fontSize = ''`)

        const ok = [...observed.normal, ...observed.texto200].every((item) => !item.clipped) && observed.normal.length > 0

        return result('F-UI-13', ok, observed, 'montos íntegros sin recorte a 375 px y con texto al 200 %')
    },

    async 'F-UI-14'({ page }) {
        const observed = {}

        for (const width of [375, 768, 1440]) {
            await page.viewport(width, 900, width < 768)
            await page.goto('/')
            await sleep(1_200)
            // Con viewport móvil, un desbordamiento amplía el layout viewport: se compara con el ancho pedido.
            observed[width] = await page.evaluate(`(() => { const header = document.querySelector('header'); const ctas = [...header.querySelectorAll('button, a')].map((el) => { const r = el.getBoundingClientRect(); return { name: __qa.accessibleName(el), inside: r.left >= 0 && r.right <= ${width} + 0.5, h: Math.round(r.height) } }); return { scrollWidth: document.documentElement.scrollWidth, innerWidth, scale: visualViewport.scale, ctas } })()`)
            await page.screenshot(pathJoin(OUT, `F-UI-14-${width}.png`))
        }

        const ok = Object.entries(observed).every(([width, item]) => item.scrollWidth <= Number(width) && item.ctas.every((cta) => cta.inside))

        return result('F-UI-14', ok, observed, 'sin scroll horizontal y CTA completos en 375/768/1440')
    },

    async 'F-UI-15'({ page }) {
        const user = await seededUser('ui15')

        await page.viewport(375, 812, true)
        await login(page, user)
        await sleep(800)

        const observed = await page.evaluate(`(() => { const name = [...document.querySelectorAll('*')].find((el) => el.children.length === 0 && el.textContent.trim() === 'Mercado' && el.closest('section, article, [aria-labelledby]')?.textContent.includes('Bolsillos')); if (!name) return { found: false }; const r = name.getBoundingClientRect(); return { found: true, clipped: name.scrollWidth > name.clientWidth + 1, width: Math.round(r.width) } })()`)

        await page.screenshot(pathJoin(OUT, 'F-UI-15-375.png'))

        return result('F-UI-15', observed.found && !observed.clipped, observed, { clipped: false, found: true })
    },

    async 'F-UI-16'({ page }) {
        const observed = {}

        await page.viewport(1440, 900, false)
        await page.goto('/login')
        await page.waitFor(`!!${q.button('Acceder a FinTrack OS')}`)

        const button = q.button('Acceder a FinTrack OS')

        for (const state of ['normal', 'hover', 'active']) {
            if (state === 'hover') {
                await page.hover(button)
            }

            const box = await page.evaluate(`(() => { const el = ${button}; el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const range = document.createRange(); const label = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim()); range.selectNodeContents(label); const t = range.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, textLeft: t.left, textRight: t.right, textTop: t.top, textBottom: t.bottom, color: getComputedStyle(el).color } })()`)

            if (state === 'active') {
                await page.send('Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mousePressed', x: box.x + box.w / 2, y: box.y + box.h / 2 })
                await sleep(150)
            }

            const { data } = await page.send('Page.captureScreenshot', { format: 'png' })
            const png = decodePng(Buffer.from(data, 'base64'))
            const ink = box.color.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number)
            const samples = []

            for (let y = Math.ceil(box.textTop) + 1; y < box.textBottom - 1; y += 2) {
                for (const x of [box.textLeft - 6, box.textLeft - 3, box.textRight + 3, box.textRight + 6, box.x + 8, box.x + box.w - 8]) {
                    samples.push(contrastRatio(ink, png.pixel(x, y)))
                }
            }

            observed[state] = { min: Math.round(Math.min(...samples) * 1000) / 1000, samples: samples.length }

            if (state === 'active') {
                await page.send('Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mouseMoved', x: 5, y: 5 })
                await page.send('Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mouseReleased', x: 5, y: 5 })
            }

            await writeFile(pathJoin(OUT, `F-UI-16-${state}.png`), Buffer.from(data, 'base64'))
        }

        const ok = Object.values(observed).every((item) => item.min >= 4.5)

        return result('F-UI-16', ok, observed, 'contraste mínimo ≥ 4.5:1 en normal, hover y activo, medido sobre píxeles del gradiente junto al texto')
    },

    // Cabeceras del HTML y de la API a través del proxy (sin datos privados en caché).
    async 'CABECERAS'() {
        const observed = {}

        for (const path of ['/', '/login', '/dashboard', '/auth/oauth/callback']) {
            const response = await fetch(`${BASE}${path}`)
            const headers = Object.fromEntries([...response.headers].filter(([name]) => /cache-control|x-frame|content-security|x-content-type|referrer-policy|permissions-policy|x-powered-by/.test(name)))

            observed[path] = headers
        }

        const api = await fetch(`${BASE}/api/auth/refresh`, { body: '{}', headers: { 'Content-Type': 'application/json', Origin: BASE }, method: 'POST' })

        observed['/api/auth/refresh'] = { 'cache-control': api.headers.get('cache-control'), 'x-frame-options': api.headers.get('x-frame-options') }

        const html = Object.entries(observed).filter(([path]) => !path.startsWith('/api'))
        const ok =
            html.every(([, headers]) => headers['x-content-type-options'] === 'nosniff' && /frame-ancestors 'none'/.test(headers['content-security-policy'] ?? '') && !headers['x-powered-by']) &&
            observed['/api/auth/refresh']['cache-control'] === 'no-store' &&
            observed['/api/auth/refresh']['x-frame-options'] === 'SAMEORIGIN'

        return result('CABECERAS', ok, observed, 'HTML con nosniff, frame-ancestors none y sin X-Powered-By; API conserva no-store y sus cabeceras')
    },

    // Muestra local declarada: Chrome headless 1440×900, caché deshabilitada, servidor caliente,
    // sin throttling. No es un aval de rendimiento de producción ni mide INP.
    async 'RENDIMIENTO'({ page }) {
        const observed = {}

        await page.send('Network.setCacheDisabled', { cacheDisabled: true })

        for (const path of ['/', '/login']) {
            await page.goto(path)
            await sleep(1_500)
            observed[path] = await page.evaluate(`new Promise((resolve) => {
                let lcp = 0
                let cls = 0
                new PerformanceObserver((list) => { for (const entry of list.getEntries()) lcp = entry.startTime }).observe({ buffered: true, type: 'largest-contentful-paint' })
                new PerformanceObserver((list) => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) cls += entry.value }).observe({ buffered: true, type: 'layout-shift' })
                const nav = performance.getEntriesByType('navigation')[0]
                setTimeout(() => resolve({ cls: Math.round(cls * 10000) / 10000, domContentLoaded: Math.round(nav.domContentLoadedEventEnd), lcp: Math.round(lcp), transferBytes: performance.getEntriesByType('resource').reduce((sum, r) => sum + (r.transferSize || 0), nav.transferSize || 0) }), 300)
            })`)
        }

        return { expected: 'medición informativa (sin umbral de aceptación)', id: 'RENDIMIENTO', observed, status: 'aprobado' }
    },

    // Barrido responsive de rutas, consola limpia y reduced motion.
    async 'BARRIDO'({ page }) {
        const user = await seededUser('sweep')
        const anonymous = ['/', '/login', '/register', '/forgot-password']
        const authenticated = ['/dashboard?month=2026-10', '/dashboard/calendar?month=2026-10', '/dashboard/debts?month=2026-10', '/dashboard/summary?month=2026-10', '/dashboard/settings']
        const observed = []

        for (const phase of ['anonymous', 'authenticated']) {
            if (phase === 'authenticated') {
                await page.viewport(1440, 900, false)
                await login(page, user, null)
            }

            for (const width of [375, 768, 1440]) {
            await page.viewport(width, 900, width < 768)

            for (const route of phase === 'anonymous' ? anonymous : authenticated) {
                page.consoleErrors.length = 0
                page.exceptions.length = 0
                await page.goto(route)
                await sleep(1_200)

                const metrics = await page.evaluate(`({ overflow: document.documentElement.scrollWidth - ${width}, h1: document.querySelectorAll('h1').length, path: location.pathname })`)

                observed.push({ route, width, ...metrics, consoleErrors: page.consoleErrors.slice(0, 3), exceptions: page.exceptions.slice(0, 3) })
                await page.screenshot(pathJoin(OUT, `sweep-${width}-${route.replace(/[/?=]/g, '_') || 'home'}.png`))
            }
            }
        }

        await page.emulateMedia([{ name: 'prefers-reduced-motion', value: 'reduce' }])
        await page.goto('/dashboard?month=2026-10')
        await sleep(800)

        const reducedMotion = await page.evaluate(`[...document.querySelectorAll('*')].filter((el) => { const s = getComputedStyle(el); return parseFloat(s.animationDuration) > 0.05 && s.animationName !== 'none' && s.animationIterationCount === 'infinite' }).length`)
        const ok = observed.every((item) => item.overflow <= 0 && item.consoleErrors.length === 0 && item.exceptions.length === 0)

        return result('BARRIDO', ok, { reducedMotionInfiniteAnimations: reducedMotion, routes: observed }, 'sin scroll horizontal, errores de consola ni excepciones')
    },

    // Recorrido normal: gasto → pagado → bolsillo → resumen → logout → ruta protegida.
    async 'RECORRIDO'({ page }) {
        const user = await seededUser('flow')
        const steps = {}

        await login(page, user)
        await page.clickAt(q.button('Nuevo gasto'))
        await page.waitFor(`!!${q.label('Concepto')}`)
        await page.fill(q.label('Concepto'), 'Internet')
        await page.fill(`document.querySelector('[role="dialog"] input[id$="-amount"]')`, '90000')
        await page.clickAt(q.button('Agregar gasto'))
        await sleep(2_000)
        steps.gastoPersistido = (await qa.workbook(user)).sheets[0].entries.some((entry) => entry.concept === 'Internet' && entry.amount === 90000)
        await page.goto('/dashboard/summary?month=2026-10')
        await sleep(1_200)
        steps.resumen = await page.evaluate(`__qa.byRole('heading').map(__qa.text).join(' | ')`)
        await logout(page)
        await page.waitFor(`location.pathname === '/'`, { label: 'logout vuelve al inicio' })
        await page.goto('/dashboard')
        await sleep(2_000)
        steps.protegida = await page.evaluate('location.pathname')

        return result('RECORRIDO', steps.gastoPersistido && steps.protegida === '/', steps, { gastoPersistido: true, protegida: '/' })
    },
}

// ——— Ejecución ———————————————————————————————————————————————————————————————

Object.assign(scenarios, createRemediationScenarios({ qa, seededUser, login, q, result, OUT }))

const selected = Object.entries(scenarios).filter(([id]) => !only || only.includes(id))
const unknown = only?.filter((id) => !Object.hasOwn(scenarios, id)) ?? []

if (unknown.length || !selected.length) {
    throw new Error(`Selección inválida: escenarios desconocidos o vacíos (${unknown.join(', ')}).`)
}

await ensureDir(OUT)

let browser
const results = []

try {
    browser = await launchChrome({ port: CDP_PORT, profileDir: process.env.QA_CHROME_PROFILE_DIR ?? pathJoin(OUT, `chrome-profile-${process.pid}`) })

    for (const [id, run] of selected) {
        let context
        let page
        let running = false
        const started = Date.now()

        try {
            await qa.resetLimits()
            context = await newContext(browser)
            page = await openPage(browser, { baseUrl: BASE, contextId: context.id })
            running = true
            const outcome = await run({ browser: { ...browser }, context, page })

            if (outcome?.id !== id || !['aprobado', 'fallido', 'bloqueado'].includes(outcome.status)) {
                throw new Error(`Resultado inválido para ${id}.`)
            }

            results.push({ ...outcome, ms: Date.now() - started })
        } catch (error) {
            await page?.screenshot(pathJoin(OUT, `${id}-error.png`)).catch(() => undefined)
            results.push({ error: error.message, id, ms: Date.now() - started, observed: null, status: running ? 'fallido' : 'bloqueado' })
        } finally {
            await page?.close()
            await context?.dispose()
        }

        const last = results.at(-1)

        console.log(`${last.status.padEnd(9)} ${id}${last.error ? ` — ${last.error}` : ''}`)
    }
} catch (error) {
    for (const [id] of selected.filter(([id]) => !results.some((item) => item.id === id))) {
        results.push({ error: error.message, id, observed: null, status: 'bloqueado' })
    }
} finally {
    await browser?.close()
}

await writeFile(pathJoin(OUT, 'results.json'), JSON.stringify(Object.fromEntries(results.map((item) => [item.id, item])), null, 2))
console.log(`Resultados: ${pathJoin(OUT, 'results.json')} · ${browser ? `Chrome PID ${browser.pid} cerrado` : 'Chrome no disponible'}`)
process.exitCode = results.length && results.every((item) => item.status === 'aprobado') ? 0 : 1

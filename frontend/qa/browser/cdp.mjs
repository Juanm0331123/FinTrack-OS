// Arnés de navegador del QA frontend: Chrome instalado + Chrome DevTools Protocol mediante el
// WebSocket nativo de Node 24. No usa Playwright ni dependencias: es automatización propia, y así
// se declara en docs/qa-frontend-remediacion.md.
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const CHROME_PATH = process.env.QA_CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'

export async function launchChrome({ port, profileDir }) {
    profileDir = resolve(profileDir)
    await mkdir(profileDir, { recursive: true })

    const child = spawn(
        CHROME_PATH,
        [
            '--headless=new',
            `--remote-debugging-port=${port}`,
            `--user-data-dir=${profileDir}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-extensions',
            '--disable-background-networking',
            '--lang=es-CO',
            'about:blank',
        ],
        { stdio: 'ignore' },
    )
    let launchError

    child.on('error', (error) => { launchError = error })

    async function close() {
        if (child.exitCode !== null || child.signalCode !== null) {
            return
        }

        await new Promise((resolve) => {
            const timer = setTimeout(() => {
                child.kill('SIGKILL')
                resolve()
            }, 3_000)

            child.once('exit', () => {
                clearTimeout(timer)
                resolve()
            })
            child.kill()
        })
    }

    for (let attempt = 0; attempt < 100; attempt += 1) {
        if (launchError) {
            throw new Error(`Chrome no pudo iniciar: ${launchError.message}`)
        }

        try {
            const meta = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()

            return { browserWs: meta.webSocketDebuggerUrl, pid: child.pid, port, close }
        } catch {
            await sleep(100)
        }
    }

    await close()
    throw new Error('Chrome no abrió el puerto de depuración.')
}

function connect(url) {
    const socket = new WebSocket(url)
    let id = 0
    const pending = new Map()
    const listeners = new Set()

    socket.addEventListener('message', ({ data }) => {
        const message = JSON.parse(data)

        if (message.id && pending.has(message.id)) {
            const call = pending.get(message.id)

            pending.delete(message.id)

            if (message.error) {
                call.reject(new Error(`${call.method}: ${JSON.stringify(message.error)}`))
            } else {
                call.resolve(message.result)
            }
        } else if (message.method) {
            for (const listener of listeners) {
                listener(message)
            }
        }
    })

    const opened = new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true })
        socket.addEventListener('error', reject, { once: true })
    })

    return {
        close: () => socket.close(),
        on: (listener) => listeners.add(listener),
        opened,
        send(method, params = {}, sessionId) {
            const request = ++id

            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pending.delete(request)
                    reject(new Error(`CDP timeout: ${method}`))
                }, 15_000)

                pending.set(request, {
                    method,
                    reject: (error) => {
                        clearTimeout(timer)
                        reject(error)
                    },
                    resolve: (value) => {
                        clearTimeout(timer)
                        resolve(value)
                    },
                })
                socket.send(JSON.stringify({ id: request, method, params, ...(sessionId ? { sessionId } : {}) }))
            })
        },
    }
}

// Utilidades inyectadas en cada documento: locators por rol/nombre accesible y por label.
const PAGE_HELPERS = `
window.__qa = (() => {
    const text = (el) => (el.textContent || '').replace(/\\s+/g, ' ').trim()
    function accessibleName(el) {
        const labelledby = el.getAttribute('aria-labelledby')
        if (labelledby) return labelledby.split(/\\s+/).map((id) => document.getElementById(id)).filter(Boolean).map(text).join(' ')
        if (el.getAttribute('aria-label')) return el.getAttribute('aria-label').trim()
        if (el.id) { const label = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (label) return text(label) }
        const wrapping = el.closest('label'); if (wrapping) return text(wrapping)
        return text(el)
    }
    const ROLE_SELECTORS = {
        button: 'button, [role="button"], input[type="submit"], input[type="button"]',
        link: 'a[href], [role="link"]',
        textbox: 'input:not([type]), input[type="text"], input[type="email"], input[type="password"], input[type="search"], textarea, [role="textbox"]',
        heading: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
        dialog: '[role="dialog"], [role="alertdialog"], dialog',
        switch: '[role="switch"]',
        combobox: 'select, [role="combobox"]',
        status: '[role="status"], [aria-live]',
        alert: '[role="alert"]',
        gridcell: '[role="gridcell"]',
    }
    function visible(el) {
        const rect = el.getBoundingClientRect(); const style = getComputedStyle(el)
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none'
    }
    function byRole(role, name, { exact = false, includeHidden = false } = {}) {
        const candidates = [...document.querySelectorAll(ROLE_SELECTORS[role] || '[role="' + role + '"]')]
        return candidates.filter((el) => (includeHidden || visible(el)) && (name === undefined || (exact ? accessibleName(el) === name : accessibleName(el).toLowerCase().includes(String(name).toLowerCase()))))
    }
    function byLabel(label) {
        const fields = [...document.querySelectorAll('input, textarea, select')]
        return fields.filter((el) => visible(el) && accessibleName(el).toLowerCase().includes(label.toLowerCase()))
    }
    function byText(value) {
        const all = [...document.querySelectorAll('body *')].filter((el) => visible(el) && text(el).includes(value))
        return all.filter((el) => ![...el.children].some((child) => text(child).includes(value)))
    }
    function center(el) { el.scrollIntoView({ block: 'center', inline: 'center' }); const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }
    return { accessibleName, byLabel, byRole, byText, center, text, visible }
})()
`

export async function openPage(browser, { baseUrl, height = 900, mobile = false, width = 1440, contextId } = {}) {
    const root = connect(browser.browserWs)

    await root.opened

    const { targetId } = await root.send('Target.createTarget', { url: 'about:blank', ...(contextId ? { browserContextId: contextId } : {}) })
    const { sessionId } = await root.send('Target.attachToTarget', { flatten: true, targetId })
    const send = (method, params) => root.send(method, params, sessionId)
    const consoleErrors = []
    const exceptions = []
    const requests = []
    const interceptors = []
    let mainFrameId
    let navigationRevision = 0
    let navigationError = null
    const documentRequests = new Set()

    root.on(async (message) => {
        if (message.sessionId !== sessionId) {
            return
        }

        if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
            consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description ?? '').join(' '))
        }

        if (message.method === 'Runtime.exceptionThrown') {
            exceptions.push(message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text)
        }

        if (message.method === 'Network.requestWillBeSent') {
            const { request, requestId, type, frameId } = message.params

            if (type === 'Document' && frameId === mainFrameId) {
                documentRequests.add(requestId)
            }

            requests.push({ authorization: request.headers.Authorization ?? request.headers.authorization ?? null, body: request.postData ?? null, method: request.method, url: request.url })
        }

        if (message.method === 'Network.loadingFailed' && documentRequests.has(message.params.requestId)) {
            navigationError = message.params.errorText
            documentRequests.delete(message.params.requestId)
        }

        if (message.method === 'Network.loadingFinished') {
            documentRequests.delete(message.params.requestId)
        }

        if (message.method === 'Page.frameNavigated' && !message.params.frame.parentId) {
            mainFrameId = message.params.frame.id
            navigationRevision += 1

            if (message.params.frame.unreachableUrl) {
                navigationError = `documento inaccesible: ${message.params.frame.unreachableUrl}`
            }
        }

        if (message.method === 'Fetch.requestPaused') {
            const paused = message.params
            const stage = paused.responseStatusCode === undefined && paused.responseErrorReason === undefined ? 'request' : 'response'
            const rule = interceptors.find((item) => !item.done && item.stage === stage && item.match(paused.request))

            if (!rule) {
                await send('Fetch.continueRequest', { requestId: paused.requestId }).catch(() => undefined)
                return
            }

            rule.hits += 1

            if (rule.times !== undefined && rule.hits >= rule.times) {
                rule.done = true
            }

            await rule.handle(paused, send)
        }
    })

    await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable')])
    mainFrameId = (await send('Page.getFrameTree')).frameTree.frame.id
    await send('Page.addScriptToEvaluateOnNewDocument', { source: PAGE_HELPERS })
    await send('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 1, height, mobile, width })

    async function evaluate(expression) {
        const result = await send('Runtime.evaluate', { awaitPromise: true, expression, returnByValue: true })

        if (result.exceptionDetails) {
            throw new Error(`${result.exceptionDetails.text}: ${result.result?.description ?? ''}`)
        }

        return result.result?.value
    }

    async function waitFor(expression, { timeout = 12_000, label } = {}) {
        const started = Date.now()
        let lastError

        while (Date.now() - started < timeout) {
            try {
                const value = await evaluate(expression)

                if (value) {
                    return value
                }
            } catch (error) {
                lastError = error
            }

            await sleep(100)
        }

        throw new Error(`Condición observable no cumplida (${label ?? expression})${lastError ? `: ${lastError.message}` : ''}`)
    }

    async function syncFetchPatterns() {
        const patterns = []

        for (const item of interceptors.filter((rule) => !rule.done)) {
            patterns.push({ requestStage: item.stage === 'request' ? 'Request' : 'Response', urlPattern: item.urlPattern })
        }

        if (patterns.length) {
            await send('Fetch.enable', { patterns })
        } else {
            await send('Fetch.disable').catch(() => undefined)
        }
    }

    async function finishNavigation(expectedOrigin, previousRevision, waitUntil, label, sameDocument = false) {
        await waitFor(`document.readyState === ${JSON.stringify(waitUntil)}`, { label })

        if (!sameDocument) {
            const started = Date.now()

            while (!navigationError && navigationRevision === previousRevision && Date.now() - started < 12_000) {
                await sleep(50)
            }

            if (navigationRevision === previousRevision && !navigationError) {
                throw new Error(`Navegación sin documento nuevo (${label}).`)
            }
        }

        if (navigationError) {
            throw new Error(`Falló la navegación (${label}): ${navigationError}`)
        }

        await waitFor(`document.readyState === ${JSON.stringify(waitUntil)}`, { label })
        const actualOrigin = await evaluate('location.origin')

        // Los redirects de autenticación dentro de la app son válidos; Chrome error:// y
        // redirects a un origen distinto nunca cuentan como una página de la app cargada.
        if (actualOrigin !== expectedOrigin) {
            throw new Error(`Origen inesperado tras navegación (${label}): ${actualOrigin}`)
        }
    }

    const page = {
        consoleErrors,
        exceptions,
        requests,
        send,
        evaluate,
        waitFor,
        async goto(path, { waitUntil = 'complete' } = {}) {
            const target = new URL(path, baseUrl)
            const previousRevision = navigationRevision

            navigationError = null
            documentRequests.clear()
            const outcome = await send('Page.navigate', { url: target.href })

            if (outcome.errorText) {
                throw new Error(`Falló la navegación a ${target.href}: ${outcome.errorText}`)
            }

            await finishNavigation(target.origin, previousRevision, waitUntil, `carga de ${path}`, !outcome.loaderId)
        },
        async reload() {
            const expectedOrigin = await evaluate('location.origin')
            const previousRevision = navigationRevision

            navigationError = null
            documentRequests.clear()
            await send('Page.reload', { ignoreCache: false })
            await finishNavigation(expectedOrigin, previousRevision, 'complete', 'recarga')
        },
        async viewport(width, viewportHeight = 900, isMobile = width < 768) {
            await send('Emulation.setDeviceMetricsOverride', { deviceScaleFactor: 1, height: viewportHeight, mobile: isMobile, width })
        },
        async emulateMedia(features) {
            await send('Emulation.setEmulatedMedia', { features })
        },
        // Selector JS que devuelve un elemento (p. ej. "__qa.byRole('button','Guardar')[0]").
        async clickAt(locator, label = locator) {
            const point = await waitFor(`(() => { const el = ${locator}; return el ? __qa.center(el) : null })()`, { label })

            await send('Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mouseMoved', ...point })
            await send('Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mousePressed', ...point })
            await send('Input.dispatchMouseEvent', { button: 'left', clickCount: 1, type: 'mouseReleased', ...point })
        },
        async hover(locator) {
            const point = await waitFor(`(() => { const el = ${locator}; return el ? __qa.center(el) : null })()`)

            await send('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point })
        },
        async focus(locator) {
            await waitFor(`(() => { const el = ${locator}; if (!el) return false; el.focus(); return document.activeElement === el })()`)
        },
        async typeText(text) {
            await send('Input.insertText', { text })
        },
        async press(key, { modifiers = 0, code, keyCode, text } = {}) {
            const KEYS = {
                ArrowDown: [40, 'ArrowDown'],
                ArrowLeft: [37, 'ArrowLeft'],
                ArrowRight: [39, 'ArrowRight'],
                ArrowUp: [38, 'ArrowUp'],
                Backspace: [8, 'Backspace'],
                Delete: [46, 'Delete'],
                End: [35, 'End'],
                Enter: [13, 'Enter'],
                Escape: [27, 'Escape'],
                Home: [36, 'Home'],
                Tab: [9, 'Tab'],
                ' ': [32, 'Space'],
            }
            const [vk, physical] = KEYS[key] ?? [keyCode ?? key.toUpperCase().charCodeAt(0), code ?? `Key${key.toUpperCase()}`]
            const base = { code: physical, key, modifiers, windowsVirtualKeyCode: vk }

            await send('Input.dispatchKeyEvent', { ...base, type: text || key.length === 1 ? 'keyDown' : 'rawKeyDown', ...(text || key === ' ' ? { text: text ?? ' ' } : {}) })
            await send('Input.dispatchKeyEvent', { ...base, type: 'keyUp' })
        },
        // Como un usuario: selecciona todo y escribe encima (el texto nuevo reemplaza la selección).
        async fill(locator, value) {
            await page.clickAt(locator)
            await page.press('a', { modifiers: 2 })

            if (value) {
                await page.typeText(value)
            } else {
                await page.press('Backspace')
            }
        },
        async screenshot(file) {
            const { data } = await send('Page.captureScreenshot', { captureBeyondViewport: false, format: 'png' })

            await writeFile(file, Buffer.from(data, 'base64'))
        },
        // Regla de intercepción: stage 'request' (antes de llegar al servidor) o 'response' (el
        // servidor ya respondió). handle decide: continuar, fallar, responder o retener.
        async intercept({ handle, match, stage = 'request', times = 1, urlPattern }) {
            const rule = { done: false, handle, hits: 0, match, stage, times, urlPattern }

            interceptors.push(rule)
            await syncFetchPatterns()

            return rule
        },
        async clearIntercepts() {
            interceptors.length = 0
            await syncFetchPatterns()
        },
        async close() {
            await root.send('Target.closeTarget', { targetId }).catch(() => undefined)
            root.close()
        },
        targetId,
    }

    return page
}

export async function newContext(browser) {
    const root = connect(browser.browserWs)

    await root.opened

    const { browserContextId } = await root.send('Target.createBrowserContext', { disposeOnDetach: false })

    return {
        id: browserContextId,
        async dispose() {
            await root.send('Target.disposeBrowserContext', { browserContextId }).catch(() => undefined)
            root.close()
        },
    }
}

// Acciones de red reutilizables para las reglas de intercepción.
export const network = {
    continue: (paused, send) => send('Fetch.continueRequest', { requestId: paused.requestId }),
    fail: (reason = 'ConnectionFailed') => (paused, send) => send('Fetch.failRequest', { errorReason: reason, requestId: paused.requestId }),
    fulfill: (status, body) => (paused, send) =>
        send('Fetch.fulfillRequest', {
            body: Buffer.from(JSON.stringify(body)).toString('base64'),
            requestId: paused.requestId,
            responseCode: status,
            responseHeaders: [{ name: 'Content-Type', value: 'application/json' }],
        }),
    // Retiene la petición hasta llamar a release(); release puede continuar o fallar.
    hold(store) {
        return (paused, send) => {
            store.push({
                body: paused.request.postData ?? null,
                fail: (reason = 'ConnectionFailed') => send('Fetch.failRequest', { errorReason: reason, requestId: paused.requestId }),
                release: () => send('Fetch.continueRequest', { requestId: paused.requestId }),
                url: paused.request.url,
            })
        }
    },
}

export function decodeJwtSubject(authorization) {
    const token = authorization?.replace(/^Bearer\s+/i, '')
    const payload = token?.split('.')[1]

    return payload ? JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).sub : null
}

export async function ensureDir(dir) {
    await mkdir(dir, { recursive: true })

    return dir
}

export const pathJoin = join
export { sleep }

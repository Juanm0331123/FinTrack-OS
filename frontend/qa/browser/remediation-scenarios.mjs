// Regresiones de la revisión independiente: UI real y persistencia por la API pública.
import { network, pathJoin, sleep } from './cdp.mjs'

export function createRemediationScenarios({ qa, seededUser, login, q, result, OUT }) {
    async function bookUntil(user, predicate) {
        for (let attempt = 0; attempt < 50; attempt += 1) {
            const book = await qa.workbook(user)

            if (predicate(book)) return book
            await sleep(100)
        }

        throw new Error('La API pública no alcanzó el estado esperado.')
    }

    async function closeDrawer(page) {
        await page.press('Escape')
        await page.waitFor('!document.querySelector(\'[role="dialog"]\')')
        // Espera el fin de la salida del overlay antes de volver a hacer clic en el contenido.
        await sleep(500)
    }

    async function invalidSubmission(page, input, button, requestPath) {
        const submit = `__qa.byRole('button', ${JSON.stringify(button)}, { exact: true })[0]`
        await page.fill(input, '100')
        await page.fill(input, '1.234,56')
        const start = page.requests.length

        await page.clickAt(submit)
        const afterClick = await page.evaluate(`({
            error: ${input}.validity.customError,
            focused: document.activeElement === ${input},
            invalid: ${input}.getAttribute('aria-invalid'),
            value: ${input}.value,
        })`)
        await page.press('Enter')
        await page.evaluate(`${input}.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))`)
        await sleep(300)
        const stillOpen = await page.evaluate(`!!${input} && ${input}.validity.customError`)
        const sent = page.requests.slice(start).filter((request) => request.method === 'POST' && request.url.endsWith(requestPath)).length

        if (!afterClick.error || !afterClick.focused || afterClick.invalid !== 'true' || !stillOpen || sent !== 0) {
            throw new Error(`Se permitió un envío inválido: ${JSON.stringify({ afterClick, sent, stillOpen })}`)
        }

        await page.fill(input, '200')
        const corrected = await page.evaluate(`!${input}.validity.customError && ${input}.getAttribute('aria-invalid') !== 'true'`)

        if (!corrected) throw new Error('Corregir el monto no limpió su error de validación.')
        await page.clickAt(submit)

        return { ...afterClick, corrected, sent }
    }

    return {
        async 'FR-01-spend-retry'({ page }) {
            const user = await seededUser('fr01')
            const entry = (await qa.workbook(user)).sheets[0].entries.find((item) => item.category === 'POCKET')
            const [created] = await qa.finance(user, [{ method: 'POST', path: `/entries/${entry.id}/spends`, body: { amount: 50, note: 'Reintento auditado', spentOn: '2026-10-10' } }])

            if (created.status !== 201) throw new Error('No se pudo preparar el gasto de bolsillo.')
            const spendId = created.body.data.id
            const spendOf = (book) => book.sheets[0].entries.find((item) => item.id === entry.id).spends.find((item) => item.id === spendId)

            await login(page, user)
            await page.clickAt(q.button('Mercado'))
            await page.waitFor(`!!${q.button('Editar gasto')}`)
            await page.intercept({ urlPattern: `*api/finance/spends/${spendId}`, match: (request) => request.method === 'PATCH', handle: network.fulfill(503, { success: false, message: 'Fallo controlado de QA' }), times: 1 })
            const amount = `document.getElementById('spend-${spendId}-amount')`
            async function edit(value) {
                await page.clickAt(q.button('Editar gasto'))
                await page.fill(amount, value)
                await page.clickAt(q.button('Guardar'))
            }

            await edit('100')
            await page.waitFor(`!!${q.button('Reintentar')}`)
            await edit('200')
            const before = spendOf(await bookUntil(user, (book) => spendOf(book)?.amount === 200)).amount

            await closeDrawer(page)
            await page.clickAt(q.button('Reintentar'))
            await page.waitFor(`!${q.button('Reintentar')}`)
            const server = spendOf(await qa.workbook(user)).amount

            await page.clickAt(q.button('Mercado'))
            const ui = await page.evaluate(`${q.button('Editar gasto de')}.getAttribute('aria-label')`)
            await page.screenshot(pathJoin(OUT, 'FR-01-spend-retry.png'))
            await closeDrawer(page)
            await page.reload()
            await page.waitFor(`!!${q.button('Mercado')}`)
            await page.clickAt(q.button('Mercado'))
            const afterReload = await page.evaluate(`${q.button('Editar gasto de')}.getAttribute('aria-label')`)

            return result('FR-01-spend-retry', before === 200 && server === 200 && ui.includes('200') && afterReload.includes('200'), { before, server, ui, afterReload }, 'API, UI y recarga conservan 200 tras reintentar el fallo de 100')
        },

        async 'FR-02-entry-form'({ page }) {
            const user = await seededUser('fr02-entry')

            await login(page, user)
            await page.clickAt(q.button('Nuevo gasto'))
            await page.waitFor(`!!${q.label('Concepto')}`)
            await page.fill(q.label('Concepto'), 'Monto validado de fila')
            const input = `document.querySelector('[role="dialog"] input[id$="-amount"]')`
            const invalid = await invalidSubmission(page, input, 'Agregar gasto', '/api/finance/sheets/2026-10/entries')
            await page.waitFor('!document.querySelector(\'[role="dialog"]\')')
            const find = (book) => book.sheets[0].entries.filter((entry) => entry.concept === 'Monto validado de fila')
            const entries = find(await bookUntil(user, (book) => find(book).length === 1))

            return result('FR-02-entry-form', entries.length === 1 && entries[0].amount === 200, { invalid, amounts: entries.map((entry) => entry.amount) }, 'ningún envío inválido; una sola fila por 200 al corregir')
        },

        async 'FR-02-debt-form'({ page }) {
            const user = await seededUser('fr02-debt')

            await login(page, user, null)
            await page.goto('/dashboard/debts?month=2026-10')
            await page.clickAt(q.button('Agregar deuda'))
            await page.waitFor(`!!${q.label('Nombre')}`)
            await page.fill(q.label('Nombre'), 'Monto validado de deuda')
            const invalid = await invalidSubmission(page, q.label('Saldo total'), 'Guardar deuda', '/api/finance/debts')
            await page.waitFor('!document.querySelector(\'[role="dialog"]\')')
            const find = (book) => book.debts.filter((debt) => debt.name === 'Monto validado de deuda')
            const debts = find(await bookUntil(user, (book) => find(book).length === 1))

            return result('FR-02-debt-form', debts.length === 1 && debts[0].totalBalance === 200, { invalid, amounts: debts.map((debt) => debt.totalBalance) }, 'ningún envío inválido; una sola deuda por 200 al corregir')
        },

        async 'FR-02-spend-form'({ page }) {
            const user = await seededUser('fr02-spend')
            const entry = (await qa.workbook(user)).sheets[0].entries.find((item) => item.category === 'POCKET')

            await login(page, user)
            await page.clickAt(q.button('Mercado'))
            const input = `document.getElementById('spend-new-${entry.id}-amount')`
            await page.waitFor(`!!${input}`)
            const invalid = await invalidSubmission(page, input, 'Registrar', `/api/finance/entries/${entry.id}/spends`)
            const spendsOf = (book) => book.sheets[0].entries.find((item) => item.id === entry.id).spends
            const spends = spendsOf(await bookUntil(user, (book) => spendsOf(book).length === 1))

            return result('FR-02-spend-form', spends.length === 1 && spends[0].amount === 200, { invalid, amounts: spends.map((spend) => spend.amount) }, 'ningún envío inválido; un solo gasto por 200 al corregir')
        },

        async 'FR-03-category-targets'({ page }) {
            const user = await seededUser('fr03')
            const observed = {}

            await login(page, user)
            for (const width of [375, 768]) {
                await page.viewport(width, 844, true)
                await page.clickAt(q.button('Agregar fila'))
                await page.waitFor(`!!${q.label('Concepto')}`)
                observed[width] = await page.evaluate(`[...document.querySelectorAll('[role="dialog"] label:has(input[type="radio"])')].map((label) => ({ name: label.innerText, width: label.getBoundingClientRect().width, height: label.getBoundingClientRect().height }))`)
                await page.screenshot(pathJoin(OUT, `FR-03-categories-${width}.png`))
                await closeDrawer(page)
            }
            const ok = Object.values(observed).every((controls) => controls.length === 6 && controls.every((control) => control.width >= 44 && control.height >= 44))

            return result('FR-03-category-targets', ok, observed, 'seis controles por viewport con caja clicable ≥44×44 px')
        },
    }
}

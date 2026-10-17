// Regresiones de presentación: ordenar/filtrar nunca recalcula ni modifica el plan financiero.
import { pathJoin, sleep } from './cdp.mjs'

const ROWS = `[...document.querySelectorAll('main table tbody tr')].map((row) => ({
    name: row.querySelector('button').textContent.trim(),
    priority: row.cells[0].querySelector('p').textContent.trim(),
    amounts: [...row.cells].slice(1).map((cell) => cell.textContent.trim()),
}))`
const TOTALS = `document.querySelector('dl[aria-label="Totales del plan completo"]').textContent.replace(/\\s+/g, ' ').trim()`
const CONTROLS = `document.querySelector('section[aria-label="Buscar y ordenar deudas"]')`

export function createDebtListScenarios({ qa, seededUser, login, q, result, OUT }) {
    async function prepare(page, label) {
        const user = await seededUser(label, { entries: false })
        const drafts = [
            { name: 'Cuota 100', lender: 'Banco Norte', totalBalance: 2, monthlyRate: 0.03 },
            { name: 'Árbol 2', lender: 'Crédito Bogotá', totalBalance: 100, monthlyRate: 0.01 },
            { name: 'Cuota 10', lender: 'Banco Sur', totalBalance: 10, monthlyRate: 0.02 },
        ]
        const created = await qa.finance(user, drafts.map((draft) => ({
            body: { ...draft, minimumPayment: 1 }, method: 'POST', path: '/debts',
        })))

        if (created.length !== drafts.length || created.some((response) => response.status !== 201 || !response.body.data?.id)) {
            throw new Error('No se pudieron preparar las tres deudas con la API pública aislada.')
        }

        const ids = Object.fromEntries(created.map((response) => [response.body.data.name, response.body.data.id]))

        await page.viewport(1440, 900, false)
        await login(page, user, null)
        await page.goto('/dashboard/debts?month=2026-10')
        await page.waitFor(`!!${q.label('Buscar deudas activas')} && document.querySelectorAll('main table tbody tr').length === 3`, { label: 'tres deudas activas cargadas' })

        return { ids, user, baseline: await page.evaluate(ROWS), totals: await page.evaluate(TOTALS) }
    }

    function unchangedRows(before, after) {
        const keyed = (rows) => rows.toSorted((a, b) => a.name.localeCompare(b.name))
        return JSON.stringify(keyed(before)) === JSON.stringify(keyed(after))
    }

    async function expectNames(page, names) {
        return page.waitFor(`(() => { const rows = ${ROWS}; return JSON.stringify(rows.map((row) => row.name)) === ${JSON.stringify(JSON.stringify(names))} ? rows : false })()`, { label: `orden visible: ${names.join(', ')}` })
    }

    async function selectSort(page, value) {
        await page.evaluate(`(() => { const select = ${q.label('Ordenar deudas por')}; select.value = ${JSON.stringify(value)}; select.dispatchEvent(new Event('change', { bubbles: true })) })()`)
    }

    async function clearQuery(page) {
        await page.clickAt(`Array.from(${CONTROLS}.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Limpiar búsqueda')`)
        await page.waitFor(`${q.label('Buscar deudas activas')}.value === '' && document.querySelectorAll('main table tbody tr').length === 3`)
    }

    return {
        async 'F-DEBT-VIEW-sort'({ page }) {
            const { baseline, totals } = await prepare(page, 'debt-view-sort')
            const observed = {}

            await page.clickAt(q.button('Ordenar por saldo total ascendente'))
            observed.numericAscending = await expectNames(page, ['Cuota 100', 'Cuota 10', 'Árbol 2'])
            observed.ariaAscending = await page.evaluate(`__qa.byRole('button', 'Ordenar por saldo total descendente')[0].closest('th').getAttribute('aria-sort')`)
            await page.clickAt(q.button('Ordenar por saldo total descendente'))
            observed.numericDescending = await expectNames(page, ['Árbol 2', 'Cuota 10', 'Cuota 100'])
            observed.ariaDescending = await page.evaluate(`__qa.byRole('button', 'Ordenar por saldo total ascendente')[0].closest('th').getAttribute('aria-sort')`)
            await page.clickAt(q.button('Ordenar por nombre ascendente'))
            observed.nameAscending = await expectNames(page, ['Árbol 2', 'Cuota 10', 'Cuota 100'])
            await page.clickAt(q.button('Ordenar por nombre descendente'))
            observed.nameDescending = await expectNames(page, ['Cuota 100', 'Cuota 10', 'Árbol 2'])
            await page.clickAt(q.button('Orden de la estrategia'))
            observed.restored = await expectNames(page, baseline.map((row) => row.name))
            observed.totals = await page.evaluate(TOTALS)
            observed.selectedHeaders = await page.evaluate(`document.querySelectorAll('main th[aria-sort="ascending"], main th[aria-sort="descending"]').length`)
            await page.screenshot(pathJoin(OUT, 'F-DEBT-VIEW-sort.png'))

            const preserved = [observed.numericAscending, observed.numericDescending, observed.nameAscending, observed.nameDescending, observed.restored].every((rows) => unchangedRows(baseline, rows))
            return result('F-DEBT-VIEW-sort', preserved && observed.ariaAscending === 'ascending' && observed.ariaDescending === 'descending' && observed.selectedHeaders === 0 && observed.totals === totals, observed, 'saldos 2/10/100 en orden numérico reversible, nombres con orden natural, aria-sort correcto y retorno a la estrategia sin cambiar prioridades, recomendaciones ni totales')
        },

        async 'F-DEBT-VIEW-filter'({ page }) {
            const { baseline, totals, user } = await prepare(page, 'debt-view-filter')
            const before = (await qa.workbook(user)).debts
            const observed = { queries: [] }
            const start = page.requests.length

            for (const query of ['ARBOL', 'credito BOGOTA', 'arbol bogota']) {
                await page.fill(q.label('Buscar deudas activas'), query)
                const rows = await expectNames(page, ['Árbol 2'])
                observed.queries.push({ query, rows, totals: await page.evaluate(TOTALS) })
            }

            await page.fill(q.label('Buscar deudas activas'), 'ninguna-coincidencia-qa')
            await page.waitFor(`!!${q.text('No encontramos deudas con esa búsqueda')}`)
            observed.empty = await page.evaluate(`({ tables: document.querySelectorAll('main table tbody tr').length, status: document.getElementById('debt-list-result').textContent.trim(), totals: ${TOTALS} })`)
            await clearQuery(page)
            observed.restored = await expectNames(page, baseline.map((row) => row.name))
            observed.focusRestored = await page.evaluate(`document.activeElement === ${q.label('Buscar deudas activas')}`)
            observed.mutations = page.requests.slice(start).filter((request) => /\/api\/finance\//.test(request.url) && ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method)).map((request) => request.method)
            observed.serverUnchanged = JSON.stringify(before) === JSON.stringify((await qa.workbook(user)).debts)

            const matching = baseline.find((row) => row.name === 'Árbol 2')
            const preserved = observed.queries.every((entry) => entry.totals === totals && JSON.stringify(entry.rows[0]) === JSON.stringify(matching))
            return result('F-DEBT-VIEW-filter', preserved && observed.empty.tables === 0 && /Mostrando 0 de 3/.test(observed.empty.status) && observed.empty.totals === totals && unchangedRows(baseline, observed.restored) && observed.focusRestored && observed.mutations.length === 0 && observed.serverUnchanged, observed, 'búsqueda por nombre/entidad sin distinguir tildes o mayúsculas; estado vacío y limpiar accesibles; la API, cuotas y totales del plan permanecen intactos')
        },

        async 'F-DEBT-VIEW-edit-identity'({ page }) {
            const { ids, user, baseline, totals } = await prepare(page, 'debt-view-edit')
            await page.clickAt(q.button('Ordenar por saldo total ascendente'))
            await expectNames(page, ['Cuota 100', 'Cuota 10', 'Árbol 2'])
            await page.clickAt(`__qa.byRole('button', 'Cuota 100', { exact: true })[0]`)
            await page.waitFor(`!!${q.label('Entidad')} && ${q.label('Nombre')}.value === 'Cuota 100'`)
            const before = (await qa.workbook(user)).debts

            await page.fill(q.label('Entidad'), 'Entidad QA corregida')
            let after

            for (let attempt = 0; attempt < 60; attempt += 1) {
                after = (await qa.workbook(user)).debts
                if (after.find((debt) => debt.id === ids['Cuota 100'])?.lender === 'Entidad QA corregida') break
                await sleep(100)
            }

            await page.clickAt(q.button('Listo'))
            await page.waitFor('!document.querySelector(\'[role="dialog"]\')')
            const restored = await page.evaluate(ROWS)
            const afterById = new Map(after.map((debt) => [debt.id, debt]))
            const expected = before.map((debt) => debt.id === ids['Cuota 100'] ? { ...debt, lender: 'Entidad QA corregida' } : debt)
            const correctIdentity = expected.every((debt) => JSON.stringify(afterById.get(debt.id)) === JSON.stringify(debt))
            const observed = { ids, correctIdentity, restored, totals: await page.evaluate(TOTALS) }

            return result('F-DEBT-VIEW-edit-identity', correctIdentity && unchangedRows(baseline, restored) && observed.totals === totals, observed, 'editar después de ordenar actualiza únicamente el id elegido; conserva importes, prioridades y recomendaciones de todas las deudas')
        },

        async 'F-DEBT-VIEW-mobile'({ page }) {
            const { baseline, totals } = await prepare(page, 'debt-view-mobile')
            await page.viewport(375, 844, true)
            await page.waitFor(`${CONTROLS}.getBoundingClientRect().width > 0`)
            await selectSort(page, 'totalBalance')
            const cards = `[...document.querySelectorAll('main article')].filter((card) => card.getBoundingClientRect().width > 0).map((card) => card.querySelector('h3 button').textContent.trim())`
            await page.waitFor(`JSON.stringify(${cards}) === ${JSON.stringify(JSON.stringify(['Cuota 100', 'Cuota 10', 'Árbol 2']))}`)
            const ascending = await page.evaluate(cards)
            await page.clickAt(q.button('Orden ascendente. Cambiar a descendente'))
            await page.waitFor(`JSON.stringify(${cards}) === ${JSON.stringify(JSON.stringify(['Árbol 2', 'Cuota 10', 'Cuota 100']))}`)
            const descending = await page.evaluate(cards)
            await page.fill(q.label('Buscar deudas activas'), 'CREDITO BOGOTA')
            await page.waitFor(`(${cards}).length === 1 && (${cards})[0] === 'Árbol 2'`)
            const layout = await page.evaluate(`(() => {
                const section = ${CONTROLS}, viewport = document.documentElement.clientWidth
                return { viewport, documentWidth: document.documentElement.scrollWidth, controls: [...section.querySelectorAll('input, select, button')].map((el) => { const r = el.getBoundingClientRect(); return { name: el.getAttribute('aria-label') || el.id || el.textContent.trim(), left: r.left, right: r.right, width: r.width, height: r.height } }), totals: ${TOTALS} }
            })()`)
            await page.screenshot(pathJoin(OUT, 'F-DEBT-VIEW-mobile-375.png'))
            await page.clickAt(`Array.from(${CONTROLS}.querySelectorAll('button')).find((button) => button.getAttribute('aria-label') === 'Limpiar búsqueda')`)
            await page.clickAt(q.button('Orden de la estrategia'))
            await page.waitFor(`JSON.stringify(${cards}) === ${JSON.stringify(JSON.stringify(baseline.map((row) => row.name)))}`)
            const observed = { ascending, descending, layout, restored: await page.evaluate(cards) }
            const usable = layout.documentWidth <= layout.viewport + 1 && layout.controls.every((control) => control.left >= -1 && control.right <= layout.viewport + 1 && control.width >= 44 && control.height >= 44)

            return result('F-DEBT-VIEW-mobile', usable && layout.totals === totals, observed, 'a 375 px, búsqueda y orden numérico en tarjetas funcionan, sin recorte ni scroll horizontal y con controles ≥44×44 px; volver a estrategia conserva el plan')
        },
    }
}

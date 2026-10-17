import type { DebtPlanRow } from '../domain/debt-plan'

export type DebtSortKey = 'strategy' | 'name' | 'totalBalance' | 'myBalance' | 'myMinimum' | 'currentPayment' | 'recommended' | 'monthlyCost' | 'effectiveAnnualRate'
export type DebtViewSort = { key: DebtSortKey; direction: 'asc' | 'desc' }

export const DEBT_SORT_OPTIONS: ReadonlyArray<{ value: DebtSortKey; label: string }> = [
    { value: 'strategy', label: 'Orden de la estrategia' },
    { value: 'name', label: 'Nombre' },
    { value: 'totalBalance', label: 'Saldo total' },
    { value: 'myBalance', label: 'Mi saldo' },
    { value: 'monthlyCost', label: 'Costo mensual' },
    { value: 'effectiveAnnualRate', label: 'Tasa E.A.' },
    { value: 'myMinimum', label: 'Mi cuota mínima' },
    { value: 'currentPayment', label: 'Pago actual' },
    { value: 'recommended', label: 'Pago recomendado' },
]

const names = new Intl.Collator('es-CO', { numeric: true, sensitivity: 'base' })

function normalizeSearch(value: string) {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').trim()
}

/** Changes the presentation of an already calculated plan, never its priority or payment allocation. */
export function getVisibleDebtRows(rows: readonly DebtPlanRow[], { query = '', sort }: { query?: string; sort?: DebtViewSort } = {}): DebtPlanRow[] {
    const terms = normalizeSearch(query).split(/\s+/).filter(Boolean)

    const visible = rows.filter((row) => {
        const searchable = normalizeSearch(`${row.debt.name} ${row.debt.lender ?? ''}`)
        return terms.every((term) => searchable.includes(term))
    })

    if (!sort || sort.key === 'strategy') {
        return visible
    }

    const key = sort.key

    return visible.sort((left, right) => {
        const difference = key === 'name'
            ? names.compare(left.debt.name, right.debt.name)
            : key === 'totalBalance'
                ? left.debt.totalBalance - right.debt.totalBalance
                : left[key] - right[key]
        return (sort.direction === 'desc' ? -difference : difference) || left.priority - right.priority || left.debt.id.localeCompare(right.debt.id)
    })
}

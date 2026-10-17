import type { DebtAction, DebtPlanRow } from '../domain/debt-plan'

export const ACTION_LABELS: Record<DebtAction, string> = {
    AT_CAP: 'Al tope acordado',
    BASE_ONLY: 'Solo pago base',
    EXTRA: 'Abonar extra',
    KILL_FIRST: 'Matar primero',
}

export const ACTION_STYLES: Record<DebtAction, string> = {
    AT_CAP: 'bg-ft-primary-soft text-ft-primary',
    BASE_ONLY: 'bg-ft-muted text-ft-ink-2',
    EXTRA: 'bg-ft-warn-soft text-ft-warn',
    KILL_FIRST: 'bg-ft-neg-soft text-ft-neg',
}

export function monthsText(row: DebtPlanRow) {
    if (row.monthsRemaining === null) {
        return 'Pago insuficiente: no cubre los intereses'
    }

    if (row.monthsRemaining === 0) {
        return 'Saldo en cero'
    }

    return `Terminas en ${row.monthsRemaining} ${row.monthsRemaining === 1 ? 'mes' : 'meses'}`
}

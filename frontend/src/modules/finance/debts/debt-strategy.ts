import type { DebtPlan, DebtPlanRow } from '../domain/debt-plan'
import type { DebtStrategy } from '../domain/types'
import { formatMoney, formatPercent } from '../lib/format'

export const STRATEGY_OPTIONS: ReadonlyArray<{ label: string; value: DebtStrategy }> = [
    { label: 'Mayor interés', value: 'AVALANCHE' },
    { label: 'Mayor cuota', value: 'HIGHEST_PAYMENT' },
    { label: 'Menor cuota', value: 'LOWEST_PAYMENT' },
    { label: 'Recomendada', value: 'RECOMMENDED' },
]

export const STRATEGY_NAMES: Record<DebtStrategy, string> = {
    AVALANCHE: 'mayor interés (avalancha)',
    HIGHEST_PAYMENT: 'mayor cuota',
    LOWEST_PAYMENT: 'menor cuota',
    RECOMMENDED: 'recomendada',
}

export const STRATEGY_HINTS: Record<DebtStrategy, string> = {
    AVALANCHE: 'Primero la deuda más cara: pagas menos intereses en total.',
    HIGHEST_PAYMENT: 'Primero la de cuota más alta: al cerrarla liberas más dinero cada mes.',
    LOWEST_PAYMENT: 'Primero la de cuota más baja: cierras deudas antes y simplificas tus pagos.',
    RECOMMENDED: 'La app decide con tu mes: libera flujo si quedas bajo el colchón y ahorra intereses si estás por encima.',
}

export function strategyReason(plan: DebtPlan, first: DebtPlanRow) {
    const rate = formatPercent(first.effectiveAnnualRate, 1)
    const payment = formatMoney(first.myMinimum)

    switch (plan.strategy) {
        case 'AVALANCHE':
            return plan.requestedStrategy === 'RECOMMENDED'
                ? `Recomendada: este mes estás por encima del colchón, así que priorizamos ahorrar intereses. ${first.debt.name} es la más cara (${rate} E.A.).`
                : `Es tu deuda más cara (${rate} E.A.).`
        case 'CASH_FLOW':
            return `Recomendada: este mes quedas por debajo del colchón, así que priorizamos liberar flujo. ${first.debt.name} es la que más cuota te quita por cada peso que debes (${payment} al mes).`
        case 'HIGHEST_PAYMENT':
            return `Es la de mayor cuota (${payment} al mes): cuando la termines, liberas ese dinero cada mes.`
        case 'LOWEST_PAYMENT':
            return `Es la de menor cuota (${payment} al mes): la cierras antes y simplificas tus pagos.`
    }
}

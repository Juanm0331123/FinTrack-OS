import { ENTRY_CATEGORIES, type EntryCategory } from './types'

export const CATEGORY_LABELS: Record<EntryCategory, string> = {
    DEBT: 'Deuda',
    FIXED: 'Fijo',
    OTHER: 'Otro',
    POCKET: 'Bolsillo',
    SAVINGS: 'Ahorro',
    SUBSCRIPTION: 'Suscripción',
}

export const CATEGORY_DESCRIPTIONS: Record<EntryCategory, string> = {
    DEBT: 'Cuotas de créditos y tarjetas. Vincúlalas a una deuda para que el plan de deudas lea tu pago.',
    FIXED: 'Gastos que se repiten con un valor estable: celular, servicios, cuidado personal.',
    OTHER: 'Lo que no encaja en las demás categorías.',
    POCKET: 'Presupuesto que gastas poco a poco: mercado, gasolina, salidas. Registra cada gasto y mira cuánto te queda.',
    SAVINGS: 'Lo que apartas para ahorrar este mes. Suma al ahorro del mes.',
    SUBSCRIPTION: 'Servicios que se cobran solos cada mes: streaming, música, apps.',
}

export const CATEGORY_ORDER: readonly EntryCategory[] = ENTRY_CATEGORIES

export function categoryLabel(category: EntryCategory) {
    return CATEGORY_LABELS[category]
}

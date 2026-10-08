import type { Metadata } from 'next'

import { SummaryPage } from '@/modules/finance/summary/summary-page'

export const metadata: Metadata = {
    title: 'Resumen | FinTrack OS',
    description: 'Ingreso neto, gastos, pagos a deudas, suscripciones y ahorro acumulado mes a mes.',
}

export default function SummaryRoute() {
    return <SummaryPage />
}

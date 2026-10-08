import type { Metadata } from 'next'

import { MonthSheetPage } from '@/modules/finance/month/month-sheet-page'

export const metadata: Metadata = {
    title: 'Hoja del mes | FinTrack OS',
    description: 'Ingresos, gastos por cuenta y categoría, colchón y estado del mes.',
}

export default function DashboardRoute() {
    return <MonthSheetPage />
}

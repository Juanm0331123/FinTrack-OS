import type { Metadata } from 'next'

import { DashboardPage } from '@/modules/dashboard'

export const metadata: Metadata = {
    title: 'Dashboard | FinTrack OS',
    description: 'Vista general mensual de ingresos, gastos, deudas y ahorro.',
}

export default function DashboardRoute() {
    return <DashboardPage />
}

import type { Metadata } from 'next'

import { DebtsPage } from '@/modules/finance/debts/debts-page'

export const metadata: Metadata = {
    title: 'Deudas | FinTrack OS',
    description: 'Plan de pagos por método avalancha con el excedente sobre tu colchón.',
}

export default function DebtsRoute() {
    return <DebtsPage />
}

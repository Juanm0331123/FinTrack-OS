import type { Metadata } from 'next'

import { SettingsPage } from '@/modules/finance/settings/settings-page'

export const metadata: Metadata = {
    title: 'Configuración | FinTrack OS',
    description: 'Colchón mínimo, prestaciones, plan de deudas y cuentas.',
}

export default function SettingsRoute() {
    return <SettingsPage />
}

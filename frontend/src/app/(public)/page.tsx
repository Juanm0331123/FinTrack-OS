import type { Metadata } from 'next'

import { HomePage } from '@/modules/home'
import { SITE_URL } from '@/shared/config/site'

export const metadata: Metadata = {
    title: 'FinTrack OS · Finanzas personales, mes a mes',
    // El canonical exige el dominio final: sin NEXT_PUBLIC_SITE_URL no se declara.
    ...(SITE_URL ? { alternates: { canonical: '/' } } : {}),
}

export default function Page() {
    return <HomePage />
}

import type { Metadata } from 'next'

import { LoginPage } from '@/modules/auth/login'

export const metadata: Metadata = {
    title: 'Login | FinTrack OS',
    description: 'Accede con correo, Google o GitHub a tu espacio financiero.',
}

export default function Page() {
    return <LoginPage />
}

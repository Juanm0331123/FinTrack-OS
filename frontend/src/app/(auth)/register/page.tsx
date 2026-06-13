import type { Metadata } from 'next'

import { RegisterPage } from '@/modules/auth/register'

export const metadata: Metadata = {
    title: 'Crear cuenta | FinTrack OS',
    description: 'Crea tu cuenta y activa tu acceso a FinTrack OS.',
}

export default function Page() {
    return <RegisterPage />
}

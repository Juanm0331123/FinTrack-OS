import type { Metadata } from 'next'

import { LoginPage } from '@/modules/auth/login'

export const metadata: Metadata = {
    title: 'Login | FinTrack OS',
    description: 'Accede a tu espacio financiero en FinTrack OS.',
}

export default function Page() {
    return <LoginPage />
}

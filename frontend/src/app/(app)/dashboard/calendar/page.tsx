import type { Metadata } from 'next'

import { CalendarPage } from '@/modules/finance/calendar/calendar-page'

export const metadata: Metadata = {
    title: 'Calendario | FinTrack OS',
    description: 'Pagos del mes por día, quincenas y próximos vencimientos.',
}

export default function CalendarRoute() {
    return <CalendarPage />
}

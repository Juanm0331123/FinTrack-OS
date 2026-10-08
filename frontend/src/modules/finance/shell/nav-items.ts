import { CalendarDays, ChartColumn, CreditCard, Sheet, SlidersHorizontal, type LucideIcon } from 'lucide-react'

import { APP_ROUTES } from '@/shared/config/routes'

export type NavItem = {
    href: string
    icon: LucideIcon
    label: string
    monthScoped: boolean
    shortLabel: string
}

export const NAV_ITEMS: NavItem[] = [
    { href: APP_ROUTES.dashboard, icon: Sheet, label: 'Hoja del mes', monthScoped: true, shortLabel: 'Mes' },
    { href: APP_ROUTES.dashboardSummary, icon: ChartColumn, label: 'Resumen', monthScoped: false, shortLabel: 'Resumen' },
    { href: APP_ROUTES.dashboardDebts, icon: CreditCard, label: 'Deudas', monthScoped: true, shortLabel: 'Deudas' },
    { href: APP_ROUTES.dashboardCalendar, icon: CalendarDays, label: 'Calendario', monthScoped: true, shortLabel: 'Calendario' },
    { href: APP_ROUTES.dashboardSettings, icon: SlidersHorizontal, label: 'Configuración', monthScoped: false, shortLabel: 'Ajustes' },
]

export function navHref(item: NavItem, yearMonth: string) {
    if (item.monthScoped && yearMonth) {
        return `${item.href}?month=${yearMonth}`
    }

    if (item.href === APP_ROUTES.dashboardSummary && yearMonth) {
        return `${item.href}?year=${yearMonth.slice(0, 4)}`
    }

    return item.href
}

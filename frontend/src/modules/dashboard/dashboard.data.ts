import {
    CalendarDays,
    CreditCard,
    LayoutDashboard,
    ReceiptText,
    Tags,
    WalletCards,
} from 'lucide-react'

import { APP_ROUTES } from '@/shared/config/routes'

export type DashboardView = 'current-month' | 'overview'

export type DashboardNavigationItem = {
    available: boolean
    badgeLabel?: string
    current: boolean
    href?: string
    icon: typeof LayoutDashboard
    label: string
}

export function resolveDashboardView(value: string | null | undefined): DashboardView {
    return value === 'current-month' ? 'current-month' : 'overview'
}

export function getDashboardNavigation(
    activeView: DashboardView,
): DashboardNavigationItem[] {
    return [
        {
            available: true,
            current: activeView === 'overview',
            href: APP_ROUTES.dashboard,
            icon: LayoutDashboard,
            label: 'Dashboard',
        },
        {
            available: true,
            current: activeView === 'current-month',
            href: `${APP_ROUTES.dashboard}?view=current-month`,
            icon: WalletCards,
            label: 'Mes actual',
        },
        {
            available: false,
            badgeLabel: 'Luego',
            current: false,
            icon: CalendarDays,
            label: 'Historial',
        },
        {
            available: false,
            badgeLabel: 'Luego',
            current: false,
            icon: Tags,
            label: 'Categorias',
        },
        {
            available: false,
            badgeLabel: 'Luego',
            current: false,
            icon: ReceiptText,
            label: 'Reportes',
        },
        {
            available: false,
            badgeLabel: 'Luego',
            current: false,
            icon: CreditCard,
            label: 'Escenarios',
        },
    ]
}

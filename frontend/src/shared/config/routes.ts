export const APP_ROUTES = {
    authOAuthCallback: '/auth/oauth/callback',
    forgotPassword: '/forgot-password',
    home: '/',
    dashboard: '/dashboard',
    dashboardCalendar: '/dashboard/calendar',
    dashboardDebts: '/dashboard/debts',
    dashboardSettings: '/dashboard/settings',
    dashboardSummary: '/dashboard/summary',
    login: '/login',
    register: '/register',
} as const

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES]

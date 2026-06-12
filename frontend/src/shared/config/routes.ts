export const APP_ROUTES = {
    home: '/',
    login: '/login',
} as const

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES]

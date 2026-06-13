export const APP_ROUTES = {
    home: '/',
    login: '/login',
    register: '/register',
} as const

export type AppRoute = (typeof APP_ROUTES)[keyof typeof APP_ROUTES]

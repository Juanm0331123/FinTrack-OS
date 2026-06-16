import { publicEnv } from '@/shared/config/env'

export type OAuthProvider = 'google' | 'github'
export type OAuthIntent = 'login' | 'register'

export function getOAuthStartUrl(provider: OAuthProvider, intent: OAuthIntent) {
    return `${publicEnv.backendUrl}/api/auth/oauth/${provider}/start?intent=${intent}`
}

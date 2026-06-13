import { publicEnv } from '@/shared/config/env'

export type OAuthProvider = 'google' | 'github'

export function getOAuthStartUrl(provider: OAuthProvider) {
    return `${publicEnv.backendUrl}/api/auth/oauth/${provider}/start`
}

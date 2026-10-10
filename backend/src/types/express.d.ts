import type { PublicUser } from '../modules/users/users.types.ts'

declare global {
    namespace Express {
        interface Request {
            auth?: {
                sessionId: string
                user: PublicUser
            }
            clientIp?: string
            edgeVerified?: boolean
        }
    }
}

export {}

import type { PublicUser } from '../modules/users/users.types.ts'

declare module 'express-serve-static-core' {
    interface Request {
        auth?: {
            sessionId?: string
            user: PublicUser
        }
    }
}

export {}

import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.ts'
import { authRateLimiter } from '../../middlewares/rate-limit.middleware.ts'
import { validate } from '../../middlewares/validate.middleware.ts'
import {
    loginSchema,
    logoutSchema,
    oauthCallbackSchema,
    requestPasswordResetSchema,
    resetPasswordSchema,
    resendEmailCodeSchema,
    refreshSessionSchema,
    registerSchema,
    verifyEmailSchema,
    verifyPasswordResetCodeSchema,
} from './auth.schemas.ts'
import { AuthController } from './auth.controller.ts'
import { AuthRepository } from './auth.repository.ts'
import { AuthService } from './auth.service.ts'

const router = Router()
const authRepository = new AuthRepository()
const authService = new AuthService(authRepository)
const authController = new AuthController(authService)

router.post('/register', authRateLimiter, validate(registerSchema), authController.register)
router.post(
    '/verify-email-code',
    authRateLimiter,
    validate(verifyEmailSchema),
    authController.verifyEmail,
)
router.post(
    '/resend-email-code',
    authRateLimiter,
    validate(resendEmailCodeSchema),
    authController.resendEmailCode,
)
router.post(
    '/forgot-password/request',
    authRateLimiter,
    validate(requestPasswordResetSchema),
    authController.requestPasswordReset,
)
router.post(
    '/forgot-password/verify-code',
    authRateLimiter,
    validate(verifyPasswordResetCodeSchema),
    authController.verifyPasswordResetCode,
)
router.post(
    '/forgot-password/reset',
    authRateLimiter,
    validate(resetPasswordSchema),
    authController.resetPassword,
)
router.post('/login', authRateLimiter, validate(loginSchema), authController.login)
router.post(
    '/refresh',
    authRateLimiter,
    validate(refreshSessionSchema),
    authController.refresh,
)
router.post('/logout', requireAuth, validate(logoutSchema), authController.logout)
router.post('/logout-all', requireAuth, authController.logoutAll)
router.get('/me', requireAuth, authController.me)
router.get('/oauth/google/start', authRateLimiter, authController.startGoogleOAuth)
router.get(
    '/oauth/google/callback',
    authRateLimiter,
    validate(oauthCallbackSchema),
    authController.handleGoogleOAuthCallback,
)
router.get('/oauth/github/start', authRateLimiter, authController.startGitHubOAuth)
router.get(
    '/oauth/github/callback',
    authRateLimiter,
    validate(oauthCallbackSchema),
    authController.handleGitHubOAuthCallback,
)

export { router as authRoutes }

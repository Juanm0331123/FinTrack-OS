import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.ts'
import {
    codeVerificationRateLimiter,
    credentialChangeRateLimiter,
    emailCooldownRateLimiter,
    emailHourlyRateLimiter,
    emailSenderIpRateLimiter,
    loginAccountRateLimiter,
    loginIpRateLimiter,
    oauthRateLimiter,
    refreshRateLimiter,
    registerRateLimiter,
} from '../../middlewares/rate-limit.middleware.ts'
import { requireTrustedOrigin } from '../../middlewares/trusted-origin.middleware.ts'
import { validate } from '../../middlewares/validate.middleware.ts'
import { AuthController } from './auth.controller.ts'
import {
    changePasswordSchema,
    confirmEmailChangeSchema,
    loginSchema,
    logoutSchema,
    oauthCallbackSchema,
    oauthStartSchema,
    refreshSessionSchema,
    registerSchema,
    requestEmailChangeSchema,
    requestPasswordResetSchema,
    resendEmailCodeSchema,
    resetPasswordSchema,
    verifyEmailSchema,
    verifyPasswordResetCodeSchema,
} from './auth.schemas.ts'
import { AuthService } from './auth.service.ts'

const router = Router()
const authController = new AuthController(new AuthService())

// Cada operación tiene su propio presupuesto: los fallos de login no bloquean el refresh ni la
// recuperación de otros usuarios detrás de la misma IP.
const emailSendingLimits = [emailSenderIpRateLimiter, emailCooldownRateLimiter, emailHourlyRateLimiter]

router.post('/register', registerRateLimiter, ...emailSendingLimits, validate(registerSchema), authController.register)
router.post('/verify-email-code', codeVerificationRateLimiter, validate(verifyEmailSchema), authController.verifyEmail)
router.post('/resend-email-code', ...emailSendingLimits, validate(resendEmailCodeSchema), authController.resendEmailCode)
router.post(
    '/forgot-password/request',
    ...emailSendingLimits,
    validate(requestPasswordResetSchema),
    authController.requestPasswordReset,
)
router.post(
    '/forgot-password/verify-code',
    codeVerificationRateLimiter,
    validate(verifyPasswordResetCodeSchema),
    authController.verifyPasswordResetCode,
)
router.post('/forgot-password/reset', codeVerificationRateLimiter, validate(resetPasswordSchema), authController.resetPassword)
router.post('/login', loginIpRateLimiter, loginAccountRateLimiter, validate(loginSchema), authController.login)
router.post('/refresh', requireTrustedOrigin, refreshRateLimiter, validate(refreshSessionSchema), authController.refresh)
router.post('/logout', requireTrustedOrigin, requireAuth, validate(logoutSchema), authController.logout)
router.post('/logout-all', requireTrustedOrigin, requireAuth, validate(logoutSchema), authController.logoutAll)
router.get('/me', requireAuth, authController.me)
router.post(
    '/password',
    requireAuth,
    credentialChangeRateLimiter,
    validate(changePasswordSchema),
    authController.changePassword,
)
router.post(
    '/email-change',
    requireAuth,
    credentialChangeRateLimiter,
    validate(requestEmailChangeSchema),
    authController.requestEmailChange,
)
router.post(
    '/email-change/confirm',
    requireAuth,
    credentialChangeRateLimiter,
    validate(confirmEmailChangeSchema),
    authController.confirmEmailChange,
)
router.get('/oauth/google/start', oauthRateLimiter, validate(oauthStartSchema), authController.startGoogleOAuth)
router.get('/oauth/google/callback', oauthRateLimiter, validate(oauthCallbackSchema), authController.handleGoogleOAuthCallback)
router.get('/oauth/github/start', oauthRateLimiter, validate(oauthStartSchema), authController.startGitHubOAuth)
router.get('/oauth/github/callback', oauthRateLimiter, validate(oauthCallbackSchema), authController.handleGitHubOAuthCallback)

export { router as authRoutes }

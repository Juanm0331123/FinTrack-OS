import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.ts'
import { financeReadRateLimiter, financeWriteRateLimiter } from '../../middlewares/rate-limit.middleware.ts'
import { validate } from '../../middlewares/validate.middleware.ts'
import { FinanceController } from './finance.controller.ts'
import { FinanceRepository } from './finance.repository.ts'
import {
    copyPreviousSheetSchema,
    createAccountSchema,
    createDebtSchema,
    createEntrySchema,
    createSheetSchema,
    createSpendSchema,
    idParamsSchema,
    updateAccountSchema,
    updateDebtSchema,
    updateEntrySchema,
    updateSettingsSchema,
    updateSheetSchema,
    updateSpendSchema,
    workbookQuerySchema,
    yearMonthParamsSchema,
} from './finance.schemas.ts'
import { FinanceService } from './finance.service.ts'

const router = Router()
const financeController = new FinanceController(new FinanceService(new FinanceRepository()))

// La autenticación y las cuotas por usuario corren después del límite perimetral (app.ts).
router.use(requireAuth, financeReadRateLimiter, financeWriteRateLimiter)

router.get('/workbook', validate(workbookQuerySchema), financeController.getWorkbook)

router.patch('/settings', validate(updateSettingsSchema), financeController.updateSettings)

router.post('/accounts', validate(createAccountSchema), financeController.createAccount)
router.patch('/accounts/:id', validate(updateAccountSchema), financeController.updateAccount)
router.delete('/accounts/:id', validate(idParamsSchema), financeController.deleteAccount)

router.post('/sheets', validate(createSheetSchema), financeController.createSheet)
router.patch('/sheets/:yearMonth', validate(updateSheetSchema), financeController.updateSheet)
router.delete('/sheets/:yearMonth', validate(yearMonthParamsSchema), financeController.deleteSheet)
router.post(
    '/sheets/:yearMonth/copy-previous',
    validate(copyPreviousSheetSchema),
    financeController.copyPreviousSheet,
)
router.post(
    '/sheets/:yearMonth/entries',
    validate(createEntrySchema),
    financeController.createEntry,
)

router.patch('/entries/:id', validate(updateEntrySchema), financeController.updateEntry)
router.delete('/entries/:id', validate(idParamsSchema), financeController.deleteEntry)
router.post('/entries/:id/spends', validate(createSpendSchema), financeController.createSpend)

router.patch('/spends/:id', validate(updateSpendSchema), financeController.updateSpend)
router.delete('/spends/:id', validate(idParamsSchema), financeController.deleteSpend)

router.post('/debts', validate(createDebtSchema), financeController.createDebt)
router.patch('/debts/:id', validate(updateDebtSchema), financeController.updateDebt)
router.delete('/debts/:id', validate(idParamsSchema), financeController.deleteDebt)

export { router as financeRoutes }

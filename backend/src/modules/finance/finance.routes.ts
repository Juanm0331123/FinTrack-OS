import { Router } from 'express'
import { requireAuth } from '../../middlewares/auth.middleware.ts'
import { validate } from '../../middlewares/validate.middleware.ts'
import { FinanceController } from './finance.controller.ts'
import { FinanceRepository } from './finance.repository.ts'
import {
    copyPreviousMonthObligationsSchema,
    createCategorySchema,
    createDebtPaymentSchema,
    createDebtSchema,
    createExpenseSchema,
    createIncomeSchema,
    createMonthlyObligationSchema,
    createObligationTemplateSchema,
    createPaycheckSchema,
    createSavingContributionSchema,
    createSavingGoalSchema,
    initializeMonthSchema,
    listCategoriesQuerySchema,
    monthWorkspaceParamsSchema,
    updateMonthlyObligationSchema,
} from './finance.schemas.ts'
import { FinanceService } from './finance.service.ts'

const router = Router()
const financeRepository = new FinanceRepository()
const financeService = new FinanceService(financeRepository)
const financeController = new FinanceController(financeService)

router.use(requireAuth)

router.get(
    '/months/:yearMonth/workspace',
    validate(monthWorkspaceParamsSchema),
    financeController.getMonthWorkspace,
)

router.post(
    '/months/:yearMonth/initialize',
    validate(initializeMonthSchema),
    financeController.initializeMonth,
)

router.post(
    '/months/:yearMonth/obligations',
    validate(createMonthlyObligationSchema),
    financeController.createMonthlyObligation,
)

router.post(
    '/months/:yearMonth/obligations/copy-previous',
    validate(copyPreviousMonthObligationsSchema),
    financeController.copyPreviousMonthObligations,
)

router.patch(
    '/months/:yearMonth/obligations/:id',
    validate(updateMonthlyObligationSchema),
    financeController.updateMonthlyObligation,
)

router.get(
    '/categories',
    validate(listCategoriesQuerySchema),
    financeController.listCategories,
)

router.post(
    '/categories',
    validate(createCategorySchema),
    financeController.createCategory,
)

router.post(
    '/expenses',
    validate(createExpenseSchema),
    financeController.createExpense,
)

router.post(
    '/incomes',
    validate(createIncomeSchema),
    financeController.createIncome,
)

router.get('/obligations/templates', financeController.listObligationTemplates)

router.post(
    '/obligations/templates',
    validate(createObligationTemplateSchema),
    financeController.createObligationTemplate,
)

router.get('/debts', financeController.listDebts)

router.post('/debts', validate(createDebtSchema), financeController.createDebt)

router.post(
    '/debts/:id/payments',
    validate(createDebtPaymentSchema),
    financeController.createDebtPayment,
)

router.post(
    '/paychecks',
    validate(createPaycheckSchema),
    financeController.createPaycheck,
)

router.post(
    '/saving-goals',
    validate(createSavingGoalSchema),
    financeController.createSavingGoal,
)

router.post(
    '/saving-contributions',
    validate(createSavingContributionSchema),
    financeController.createSavingContribution,
)

export { router as financeRoutes }

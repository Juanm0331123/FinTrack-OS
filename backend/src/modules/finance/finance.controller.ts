import type { Request, Response } from 'express'
import { toAuthenticatedRequest } from '../../middlewares/auth.middleware.ts'
import { ApiResponse } from '../../utils/api-response.ts'
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

export class FinanceController {
    private readonly financeService: FinanceService

    constructor(financeService = new FinanceService()) {
        this.financeService = financeService
    }

    getMonthWorkspace = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const { yearMonth } = monthWorkspaceParamsSchema.shape.params.parse(req.params)
        const workspace = await this.financeService.getMonthWorkspace(
            authenticatedRequest.auth.user,
            yearMonth,
        )

        return res.status(200).json(ApiResponse.success(workspace))
    }

    initializeMonth = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const { yearMonth } = initializeMonthSchema.shape.params.parse(req.params)
        const body = initializeMonthSchema.shape.body.parse(req.body)
        const workspace = await this.financeService.initializeMonth(
            authenticatedRequest.auth.user,
            yearMonth,
            body,
        )

        return res.status(200).json(ApiResponse.success(workspace))
    }

    listCategories = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const query = listCategoriesQuerySchema.shape.query.parse(req.query)
        const categories = await this.financeService.listCategories(
            authenticatedRequest.auth.user,
            query,
        )

        return res.status(200).json(ApiResponse.success(categories))
    }

    createCategory = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createCategorySchema.shape.body.parse(req.body)
        const category = await this.financeService.createCategory(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(category))
    }

    createExpense = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createExpenseSchema.shape.body.parse(req.body)
        const expense = await this.financeService.createExpense(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(expense))
    }

    createIncome = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createIncomeSchema.shape.body.parse(req.body)
        const income = await this.financeService.createIncome(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(income))
    }

    listObligationTemplates = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const templates = await this.financeService.listObligationTemplates(
            authenticatedRequest.auth.user,
        )

        return res.status(200).json(ApiResponse.success(templates))
    }

    createObligationTemplate = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createObligationTemplateSchema.shape.body.parse(req.body)
        const template = await this.financeService.createObligationTemplate(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(template))
    }

    createMonthlyObligation = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const { yearMonth } = createMonthlyObligationSchema.shape.params.parse(
            req.params,
        )
        const body = createMonthlyObligationSchema.shape.body.parse(req.body)
        const obligation = await this.financeService.createMonthlyObligation(
            authenticatedRequest.auth.user,
            yearMonth,
            body,
        )

        return res.status(201).json(ApiResponse.success(obligation))
    }

    copyPreviousMonthObligations = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const { yearMonth } = copyPreviousMonthObligationsSchema.shape.params.parse(
            req.params,
        )
        const workspace = await this.financeService.copyPreviousMonthObligations(
            authenticatedRequest.auth.user,
            yearMonth,
        )

        return res.status(200).json(ApiResponse.success(workspace))
    }

    updateMonthlyObligation = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const { id, yearMonth } = updateMonthlyObligationSchema.shape.params.parse(
            req.params,
        )
        const body = updateMonthlyObligationSchema.shape.body.parse(req.body)
        const obligation = await this.financeService.updateMonthlyObligation(
            authenticatedRequest.auth.user,
            yearMonth,
            id,
            body,
        )

        return res.status(200).json(ApiResponse.success(obligation))
    }

    listDebts = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const debts = await this.financeService.listDebts(
            authenticatedRequest.auth.user,
        )

        return res.status(200).json(ApiResponse.success(debts))
    }

    createDebt = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createDebtSchema.shape.body.parse(req.body)
        const debt = await this.financeService.createDebt(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(debt))
    }

    createDebtPayment = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const { id } = createDebtPaymentSchema.shape.params.parse(req.params)
        const body = createDebtPaymentSchema.shape.body.parse(req.body)
        const payment = await this.financeService.createDebtPayment(
            authenticatedRequest.auth.user,
            id,
            body,
        )

        return res.status(201).json(ApiResponse.success(payment))
    }

    createPaycheck = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createPaycheckSchema.shape.body.parse(req.body)
        const paycheck = await this.financeService.createPaycheck(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(paycheck))
    }

    createSavingGoal = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createSavingGoalSchema.shape.body.parse(req.body)
        const savingGoal = await this.financeService.createSavingGoal(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(savingGoal))
    }

    createSavingContribution = async (req: Request, res: Response) => {
        const authenticatedRequest = toAuthenticatedRequest(req)
        const body = createSavingContributionSchema.shape.body.parse(req.body)
        const savingContribution = await this.financeService.createSavingContribution(
            authenticatedRequest.auth.user,
            body,
        )

        return res.status(201).json(ApiResponse.success(savingContribution))
    }
}

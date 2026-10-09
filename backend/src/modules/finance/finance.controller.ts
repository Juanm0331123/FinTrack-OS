import type { Request, Response } from 'express'
import { toAuthenticatedRequest } from '../../middlewares/auth.middleware.ts'
import { ApiResponse } from '../../utils/api-response.ts'
import type {
    CopyPreviousSheetInput,
    CreateAccountInput,
    CreateDebtInput,
    CreateEntryInput,
    CreateSheetInput,
    CreateSpendInput,
    UpdateAccountInput,
    UpdateDebtInput,
    UpdateEntryInput,
    UpdateSettingsInput,
    UpdateSheetInput,
    UpdateSpendInput,
    WorkbookQuery,
} from './finance.schemas.ts'
import { FinanceService, type Created } from './finance.service.ts'

function getUserId(req: Request) {
    return toAuthenticatedRequest(req).auth.user.id
}

function getParam(req: Request, name: 'id' | 'yearMonth') {
    return String((req.params as Record<string, string>)[name])
}

// Una creación repetida con el mismo identificador responde 200 con el registro existente.
function sendCreated<T>(res: Response, created: Created<T>) {
    if (created.replayed) {
        res.setHeader('Idempotent-Replayed', 'true')
    }

    return res.status(created.replayed ? 200 : 201).json(ApiResponse.success(created.value))
}

export class FinanceController {
    private readonly financeService: FinanceService

    constructor(financeService = new FinanceService()) {
        this.financeService = financeService
    }

    getWorkbook = async (req: Request, res: Response) => {
        const workbook = await this.financeService.getWorkbook(getUserId(req), req.query as WorkbookQuery)

        return res.status(200).json(ApiResponse.success(workbook))
    }

    updateSettings = async (req: Request, res: Response) => {
        const settings = await this.financeService.updateSettings(
            getUserId(req),
            req.body as UpdateSettingsInput,
        )

        return res.status(200).json(ApiResponse.success(settings))
    }

    createAccount = async (req: Request, res: Response) => {
        return sendCreated(res, await this.financeService.createAccount(getUserId(req), req.body as CreateAccountInput))
    }

    updateAccount = async (req: Request, res: Response) => {
        const account = await this.financeService.updateAccount(
            getUserId(req),
            getParam(req, 'id'),
            req.body as UpdateAccountInput,
        )

        return res.status(200).json(ApiResponse.success(account))
    }

    deleteAccount = async (req: Request, res: Response) => {
        const result = await this.financeService.deleteAccount(
            getUserId(req),
            getParam(req, 'id'),
        )

        return res.status(200).json(ApiResponse.success(result))
    }

    createSheet = async (req: Request, res: Response) => {
        return sendCreated(res, await this.financeService.createSheet(getUserId(req), req.body as CreateSheetInput))
    }

    updateSheet = async (req: Request, res: Response) => {
        const sheet = await this.financeService.updateSheet(
            getUserId(req),
            getParam(req, 'yearMonth'),
            req.body as UpdateSheetInput,
        )

        return res.status(200).json(ApiResponse.success(sheet))
    }

    deleteSheet = async (req: Request, res: Response) => {
        const result = await this.financeService.deleteSheet(
            getUserId(req),
            getParam(req, 'yearMonth'),
        )

        return res.status(200).json(ApiResponse.success(result))
    }

    copyPreviousSheet = async (req: Request, res: Response) => {
        const sheet = await this.financeService.copyPreviousSheet(
            getUserId(req),
            getParam(req, 'yearMonth'),
            (req.body ?? {}) as CopyPreviousSheetInput,
        )

        return res.status(200).json(ApiResponse.success(sheet))
    }

    createEntry = async (req: Request, res: Response) => {
        return sendCreated(
            res,
            await this.financeService.createEntry(getUserId(req), getParam(req, 'yearMonth'), req.body as CreateEntryInput),
        )
    }

    updateEntry = async (req: Request, res: Response) => {
        const entry = await this.financeService.updateEntry(
            getUserId(req),
            getParam(req, 'id'),
            req.body as UpdateEntryInput,
        )

        return res.status(200).json(ApiResponse.success(entry))
    }

    deleteEntry = async (req: Request, res: Response) => {
        const result = await this.financeService.deleteEntry(
            getUserId(req),
            getParam(req, 'id'),
        )

        return res.status(200).json(ApiResponse.success(result))
    }

    createSpend = async (req: Request, res: Response) => {
        return sendCreated(
            res,
            await this.financeService.createSpend(getUserId(req), getParam(req, 'id'), req.body as CreateSpendInput),
        )
    }

    updateSpend = async (req: Request, res: Response) => {
        const spend = await this.financeService.updateSpend(
            getUserId(req),
            getParam(req, 'id'),
            req.body as UpdateSpendInput,
        )

        return res.status(200).json(ApiResponse.success(spend))
    }

    deleteSpend = async (req: Request, res: Response) => {
        const result = await this.financeService.deleteSpend(
            getUserId(req),
            getParam(req, 'id'),
        )

        return res.status(200).json(ApiResponse.success(result))
    }

    createDebt = async (req: Request, res: Response) => {
        return sendCreated(res, await this.financeService.createDebt(getUserId(req), req.body as CreateDebtInput))
    }

    updateDebt = async (req: Request, res: Response) => {
        const debt = await this.financeService.updateDebt(
            getUserId(req),
            getParam(req, 'id'),
            req.body as UpdateDebtInput,
        )

        return res.status(200).json(ApiResponse.success(debt))
    }

    deleteDebt = async (req: Request, res: Response) => {
        const result = await this.financeService.deleteDebt(
            getUserId(req),
            getParam(req, 'id'),
        )

        return res.status(200).json(ApiResponse.success(result))
    }
}

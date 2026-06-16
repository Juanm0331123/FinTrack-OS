type PaginationMeta = {
    page: number
    pageSize: number
    totalItems: number
    totalPages: number
}

export const ApiResponse = {
    error(
        message: string,
        errors?: Array<{ field: string; message: string }>,
        code?: string,
        details?: Record<string, unknown>,
    ) {
        return {
            success: false,
            ...(code ? { code } : {}),
            ...(details ? { details } : {}),
            ...(errors?.length ? { errors } : {}),
            message,
        }
    },

    paginated<T>(data: T, meta: PaginationMeta) {
        return {
            success: true,
            data,
            meta,
        }
    },

    success<T>(data: T) {
        return {
            success: true,
            data,
        }
    },
}

function trimTrailingSlash(value: string) {
    return value.replace(/\/+$/, '')
}

export const publicEnv = {
    backendUrl: trimTrailingSlash(
        process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:4000',
    ),
} as const

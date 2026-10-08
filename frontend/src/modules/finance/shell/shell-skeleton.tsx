function Block({ className }: { className: string }) {
    return <div className={`animate-pulse rounded-lg bg-ft-muted ${className}`} />
}

export function ContentSkeleton() {
    return (
        <div aria-busy="true" aria-label="Cargando tu información" className="flex flex-col gap-[18px]">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Block className="h-8 w-56" />
                <Block className="h-10 w-72" />
            </div>
            <Block className="h-[104px] w-full rounded-xl" />
            <div className="flex flex-wrap gap-[18px]">
                <Block className="h-[520px] min-w-0 flex-[999_1_560px] rounded-xl" />
                <div className="flex flex-[1_1_320px] flex-col gap-[18px] lg:max-w-[372px]">
                    <Block className="h-72 rounded-xl" />
                    <Block className="h-56 rounded-xl" />
                </div>
            </div>
        </div>
    )
}

export function ShellSkeleton() {
    return (
        <div className="finance-theme min-h-dvh lg:flex">
            <div className="hidden h-dvh w-[252px] flex-none flex-col gap-6 border-r border-ft-line bg-ft-card px-3.5 py-5 lg:flex">
                <Block className="h-8 w-36" />
                <div className="flex flex-col gap-2">
                    {Array.from({ length: 5 }, (_, index) => (
                        <Block key={index} className="h-9 w-full" />
                    ))}
                </div>
            </div>
            <div className="min-w-0 flex-1 px-4 pt-4 sm:px-6 lg:px-8 lg:pt-6">
                <ContentSkeleton />
            </div>
        </div>
    )
}

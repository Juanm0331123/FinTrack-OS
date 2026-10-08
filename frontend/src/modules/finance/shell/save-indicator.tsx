'use client'

import { CircleAlert, CloudCheck, LoaderCircle } from 'lucide-react'

import { cn } from '@/shared/lib/utils'
import { useWorkbookActions, useWorkbookState } from '../store/workbook-context'

export function SaveIndicator({ className }: { className?: string }) {
    const pending = useWorkbookState((state) => state.save.pending)
    const error = useWorkbookState((state) => state.save.error)
    const status = useWorkbookState((state) => state.status)
    const actions = useWorkbookActions()

    if (status !== 'ready') {
        return null
    }

    return (
        <div aria-live="polite" className={cn('min-h-8 text-[12.5px]', className)}>
            {error ? (
                <button
                    type="button"
                    title={error}
                    onClick={() => actions.retrySaves()}
                    className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-1 font-medium text-ft-neg outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ft-focus"
                >
                    <CircleAlert className="size-4" aria-hidden="true" />
                    Error al guardar · Reintentar
                </button>
            ) : pending > 0 ? (
                <span className="inline-flex min-h-8 items-center gap-1.5 px-1 text-ft-ink-3">
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                    Guardando…
                </span>
            ) : (
                <span className="inline-flex min-h-8 items-center gap-1.5 px-1 text-ft-ink-3">
                    <CloudCheck className="size-4" aria-hidden="true" />
                    Cambios guardados
                </span>
            )}
        </div>
    )
}

'use client'

import { CircleAlert, CloudCheck, LoaderCircle, RotateCw } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/shared/lib/utils'
import { useWorkbookActions, useWorkbookState } from '../store/workbook-context'
import { FtButton } from '../ui/button'

// Estado compacto (sidebar y barra superior). No es región viva: el aviso de error se anuncia una
// sola vez desde SaveErrorNotice y «Guardando…» no se anuncia en cada tecla.
export function SaveIndicator({ className, compact = false }: { className?: string; compact?: boolean }) {
    const pending = useWorkbookState((state) => state.save.pending)
    const error = useWorkbookState((state) => state.save.error)
    const status = useWorkbookState((state) => state.status)

    if (status !== 'ready') {
        return null
    }

    const [Icon, label, tone] = error
        ? [CircleAlert, 'Cambios sin guardar', 'text-ft-neg']
        : pending > 0
          ? [LoaderCircle, 'Guardando…', 'text-ft-ink-3']
          : [CloudCheck, 'Cambios guardados', 'text-ft-ink-3']

    return (
        <span className={cn('inline-flex min-h-8 items-center gap-1.5 px-1 text-[12.5px] font-medium', tone, className)}>
            <Icon className={cn('size-4 flex-none', pending > 0 && !error && 'animate-spin motion-reduce:animate-none')} aria-hidden="true" />
            <span className={compact ? 'sr-only' : undefined}>{label}</span>
        </span>
    )
}

// Aviso persistente en todos los anchos (también bajo 640 px, donde no hay sidebar): muestra el
// motivo real del fallo y las salidas posibles. Un rechazo ya revertido (p. ej. cuota) solo se
// informa; un fallo pendiente ofrece reintentar o descartar.
export function SaveErrorNotice() {
    const error = useWorkbookState((state) => state.save.error)
    const failed = useWorkbookState((state) => state.save.failed)
    const status = useWorkbookState((state) => state.status)
    const actions = useWorkbookActions()
    const [discarding, setDiscarding] = useState(false)
    const visible = status === 'ready' && error !== null

    return (
        <div
            role="status"
            aria-live="polite"
            className={cn(
                'fixed inset-x-3 bottom-[calc(max(env(safe-area-inset-bottom),12px)+72px)] z-40 lg:inset-x-auto lg:right-6 lg:bottom-6 lg:w-[420px]',
                !visible && 'pointer-events-none',
            )}
        >
            {visible ? (
                <div className="flex flex-col gap-3 rounded-xl border border-ft-neg-border bg-ft-card p-4 shadow-[0_12px_32px_-12px_rgba(16,24,40,0.28)]">
                    <p className="flex items-start gap-2 text-sm font-medium text-ft-ink">
                        <CircleAlert className="mt-0.5 size-4 flex-none text-ft-neg" aria-hidden="true" />
                        <span>
                            {failed > 0 ? 'No se guardó tu último cambio. ' : 'No pudimos guardar ese registro. '}
                            <span className="text-ft-ink-2">{error}</span>
                        </span>
                    </p>
                    <div className="flex flex-wrap justify-end gap-2">
                        {failed > 0 ? (
                            <>
                                <FtButton
                                    variant="secondary"
                                    disabled={discarding}
                                    onClick={() => {
                                        setDiscarding(true)
                                        void actions.discardFailedSaves().finally(() => setDiscarding(false))
                                    }}
                                >
                                    Descartar cambios
                                </FtButton>
                                <FtButton variant="primary" onClick={() => actions.retrySaves()}>
                                    <RotateCw aria-hidden="true" />
                                    Reintentar
                                </FtButton>
                            </>
                        ) : (
                            <FtButton variant="secondary" onClick={() => actions.dismissSaveError()}>
                                Entendido
                            </FtButton>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    )
}

'use client'

import { X } from 'lucide-react'
import { AlertDialog, Dialog } from 'radix-ui'
import { useRef, type ReactNode } from 'react'

import { FtButton } from './button'

// Destino deliberado cuando quien abrió el panel ya no existe (p. ej. la fila se eliminó).
export const MAIN_CONTENT_ID = 'main-content'

// Sin Dialog.Trigger, Radix no sabe a quién devolver el foco y lo deja en <body>. Se recuerda el
// elemento enfocado al abrir y se le devuelve al cerrar (Escape, Cerrar o Cancelar); si se
// desmontó, el foco va al contenido principal.
function useReturnFocus(onOpenAutoFocus?: (event: Event) => void) {
    const invoker = useRef<HTMLElement | null>(null)

    return {
        onCloseAutoFocus(event: Event) {
            event.preventDefault()

            const target = invoker.current?.isConnected ? invoker.current : document.getElementById(MAIN_CONTENT_ID)

            invoker.current = null
            target?.focus()
        },
        onOpenAutoFocus(event: Event) {
            const active = document.activeElement

            invoker.current = active instanceof HTMLElement && active !== document.body ? active : null
            onOpenAutoFocus?.(event)
        },
    }
}

export function Drawer({
    children,
    description,
    footer,
    onOpenAutoFocus,
    onOpenChange,
    open,
    title,
}: {
    children: ReactNode
    description?: string
    footer?: ReactNode
    onOpenAutoFocus?: (event: Event) => void
    onOpenChange: (open: boolean) => void
    open: boolean
    title: string
}) {
    const focus = useReturnFocus(onOpenAutoFocus)

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="ft-overlay finance-theme fixed inset-0 z-50 bg-[rgba(15,23,42,0.32)]" />
                <Dialog.Content
                    onOpenAutoFocus={focus.onOpenAutoFocus}
                    onCloseAutoFocus={focus.onCloseAutoFocus}
                    className="ft-drawer finance-theme fixed inset-y-0 right-0 z-50 flex w-full max-w-[460px] flex-col border-l border-ft-line bg-ft-card shadow-[0_20px_48px_-16px_rgba(16,24,40,0.28)] outline-none"
                >
                    <header className="flex items-start justify-between gap-4 border-b border-ft-line px-5 py-4">
                        <div className="min-w-0">
                            <Dialog.Title className="text-lg font-semibold text-ft-ink">{title}</Dialog.Title>
                            {description ? (
                                <Dialog.Description className="mt-0.5 text-[13px] leading-5 text-ft-ink-3">
                                    {description}
                                </Dialog.Description>
                            ) : (
                                <Dialog.Description className="sr-only">{title}</Dialog.Description>
                            )}
                        </div>
                        <Dialog.Close asChild>
                            <FtButton variant="ghost" size="icon" aria-label="Cerrar panel">
                                <X />
                            </FtButton>
                        </Dialog.Close>
                    </header>
                    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
                    {footer ? (
                        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ft-line px-5 py-4">
                            {footer}
                        </footer>
                    ) : null}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}

export function ConfirmDialog({
    confirmLabel,
    description,
    onConfirm,
    onOpenChange,
    open,
    title,
    tone = 'primary',
}: {
    confirmLabel: string
    description: string
    onConfirm: () => void
    onOpenChange: (open: boolean) => void
    open: boolean
    title: string
    tone?: 'danger' | 'primary'
}) {
    const focus = useReturnFocus()

    return (
        <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
            <AlertDialog.Portal>
                <AlertDialog.Overlay className="ft-overlay finance-theme fixed inset-0 z-50 bg-[rgba(15,23,42,0.32)]" />
                <AlertDialog.Content
                    onOpenAutoFocus={focus.onOpenAutoFocus}
                    onCloseAutoFocus={focus.onCloseAutoFocus}
                    className="finance-theme fixed top-1/2 left-1/2 z-50 w-[calc(100vw-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-ft-line bg-ft-card p-5 shadow-[0_20px_48px_-16px_rgba(16,24,40,0.28)] outline-none">
                    <AlertDialog.Title className="text-lg font-semibold text-ft-ink">{title}</AlertDialog.Title>
                    <AlertDialog.Description className="mt-1.5 text-sm leading-6 text-ft-ink-2">
                        {description}
                    </AlertDialog.Description>
                    <div className="mt-5 flex flex-wrap justify-end gap-2">
                        <AlertDialog.Cancel asChild>
                            <FtButton variant="secondary">Cancelar</FtButton>
                        </AlertDialog.Cancel>
                        <AlertDialog.Action asChild>
                            <FtButton variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm}>
                                {confirmLabel}
                            </FtButton>
                        </AlertDialog.Action>
                    </div>
                </AlertDialog.Content>
            </AlertDialog.Portal>
        </AlertDialog.Root>
    )
}

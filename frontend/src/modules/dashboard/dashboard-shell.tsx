'use client'

import { LogOut, Menu, X } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { useEffect, useEffectEvent, useState } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { DashboardNavigationItem } from './dashboard.data'

export type DashboardShellUser = {
    displayName: string
    email: string
    firstName: string
    initials: string
}

type DashboardShellProps = {
    children: ReactNode
    navigation: DashboardNavigationItem[]
    onLogout?: () => void
    pageLabel?: string
    pageTitle?: string
    user: DashboardShellUser
}

export function DashboardShell({
    children,
    navigation,
    onLogout,
    pageLabel = 'Dashboard',
    pageTitle = 'Workspace mensual',
    user,
}: DashboardShellProps) {
    const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(false)
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

    const handleEscape = useEffectEvent((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            setIsMobileSidebarOpen(false)
        }
    })

    useEffect(() => {
        if (!isMobileSidebarOpen) {
            return
        }

        const previousOverflow = document.body.style.overflow
        const onKeyDown = (event: KeyboardEvent) => handleEscape(event)

        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', onKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', onKeyDown)
        }
    }, [isMobileSidebarOpen])

    const mobileMotionDuration = isMobileSidebarOpen
        ? 'var(--motion-shell-enter)'
        : 'var(--motion-shell-exit)'

    return (
        <main className="bg-app-gradient min-h-dvh text-foreground">
            <div className="flex min-h-dvh">
                <div
                    className="hidden md:block"
                    onBlur={(event) => {
                        if (
                            !event.currentTarget.contains(
                                event.relatedTarget as Node | null,
                            )
                        ) {
                            setIsDesktopSidebarOpen(false)
                        }
                    }}
                    onFocusCapture={() => setIsDesktopSidebarOpen(true)}
                    onMouseEnter={() => setIsDesktopSidebarOpen(true)}
                    onMouseLeave={() => setIsDesktopSidebarOpen(false)}
                >
                    <DashboardSidebar
                        collapsed={!isDesktopSidebarOpen}
                        navigation={navigation}
                        onLogout={onLogout}
                        user={user}
                    />
                </div>

                <div
                    className={cn(
                        'fixed inset-0 z-40 bg-foreground/18 transition-[opacity,backdrop-filter] shell-transition-fast md:hidden',
                        isMobileSidebarOpen
                            ? 'pointer-events-auto opacity-100 backdrop-blur-[4px]'
                            : 'pointer-events-none opacity-0 backdrop-blur-[0px]',
                    )}
                    aria-hidden={!isMobileSidebarOpen}
                    style={{ transitionDuration: mobileMotionDuration }}
                    onClick={() => setIsMobileSidebarOpen(false)}
                />

                <div
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 w-[19rem] max-w-[calc(100vw-1rem)] pr-2 transition-[transform,opacity] shell-transition md:hidden',
                        isMobileSidebarOpen
                            ? 'pointer-events-auto translate-x-0 opacity-100'
                            : 'pointer-events-none -translate-x-[calc(100%+1rem)] opacity-0',
                    )}
                    aria-hidden={!isMobileSidebarOpen}
                    style={{ transitionDuration: mobileMotionDuration }}
                >
                    <DashboardSidebar
                        mobile
                        navigation={navigation}
                        onCloseMobile={() => setIsMobileSidebarOpen(false)}
                        onLogout={onLogout}
                        user={user}
                    />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                    <DashboardNavbar
                        pageLabel={pageLabel}
                        pageTitle={pageTitle}
                        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                    />

                    <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
                        <div className="mx-auto w-full max-w-7xl">{children}</div>
                    </div>
                </div>
            </div>
        </main>
    )
}

type DashboardSidebarProps = {
    collapsed?: boolean
    mobile?: boolean
    navigation: DashboardNavigationItem[]
    onCloseMobile?: () => void
    onLogout?: () => void
    user: DashboardShellUser
}

function DashboardSidebar({
    collapsed = false,
    mobile = false,
    navigation,
    onCloseMobile,
    onLogout,
    user,
}: DashboardSidebarProps) {
    const expanded = mobile || !collapsed

    return (
        <aside
            className={cn(
                'flex h-dvh flex-col border-r border-sidebar-border bg-sidebar/96 backdrop-blur-xl',
                mobile
                    ? 'w-full rounded-r-[1.5rem] px-4 py-4 shadow-[0_24px_48px_-28px_oklch(0.19_0.025_255/0.35)]'
                    : 'sticky top-0 transition-[width] shell-transition',
                mobile ? '' : expanded ? 'w-[16.75rem] px-4 py-5' : 'w-[6.75rem] px-3 py-5',
            )}
        >
            <div
                className={cn(
                    'flex items-center gap-3',
                    mobile || expanded ? 'justify-between' : 'justify-center',
                )}
            >
                <Link
                    href={APP_ROUTES.dashboard}
                    className={cn(
                        'flex min-w-0 items-center rounded-[1.1rem] outline-none transition-[background-color,box-shadow,transform] duration-150 ease-[var(--ease-shell)] focus-visible:ring-2 focus-visible:ring-ring/50',
                        expanded
                            ? 'gap-3 px-2 py-2 hover:bg-white/55'
                            : 'justify-center px-1.5 py-1.5 hover:bg-white/45',
                    )}
                    onClick={() => onCloseMobile?.()}
                >
                    <div
                        className={cn(
                            'flex items-center justify-center rounded-[1rem] bg-white/78 ring-1 ring-white/70 shadow-[0_16px_30px_-24px_oklch(0.58_0.19_252/0.45)] shell-fade-transition',
                            expanded ? 'h-12 w-12 px-2' : 'h-11 w-[4.85rem] px-3',
                        )}
                    >
                        <BrandLogo
                            width={expanded ? 132 : 94}
                            height={expanded ? 32 : 24}
                            priority
                            className="h-auto w-full object-contain"
                        />
                    </div>
                    {expanded ? (
                        <div className="min-w-0 shell-fade-transition">
                            <p className="truncate text-sm font-semibold">FinTrack OS</p>
                            <p className="truncate text-xs text-muted-foreground">
                                Workspace mensual
                            </p>
                        </div>
                    ) : null}
                </Link>

                {mobile ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Cerrar menu"
                        className="shell-press-transition"
                        onClick={onCloseMobile}
                    >
                        <X className="size-4" aria-hidden="true" />
                    </Button>
                ) : null}
            </div>

            <nav className="mt-6 flex-1" aria-label="Navegacion principal">
                <div className="space-y-1.5">
                    {navigation.map((item) => {
                        const content = (
                            <>
                                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                                {expanded ? (
                                    <>
                                        <span className="min-w-0 flex-1 truncate text-left shell-fade-transition">
                                            {item.label}
                                        </span>
                                        {!item.available ? (
                                            <BadgeMuted>{item.badgeLabel ?? 'Pronto'}</BadgeMuted>
                                        ) : null}
                                    </>
                                ) : null}
                            </>
                        )

                        const classes = cn(
                            'flex w-full items-center gap-3 rounded-xl text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50 transition-[background-color,color,transform,box-shadow] duration-150 ease-[var(--ease-shell)] active:translate-y-px',
                            expanded
                                ? 'justify-start px-3 py-3'
                                : 'justify-center px-0 py-3',
                            item.current
                                ? 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_oklch(0.58_0.19_252/0.08)]'
                                : 'text-sidebar-foreground/78 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            !item.available &&
                                !item.current &&
                                'cursor-not-allowed opacity-75 hover:bg-transparent hover:text-sidebar-foreground/78',
                        )

                        if (item.available && item.href) {
                            const linkElement = (
                                <Link
                                    href={item.href}
                                    className={classes}
                                    onClick={() => onCloseMobile?.()}
                                >
                                    {content}
                                </Link>
                            )

                            if (!expanded && !mobile) {
                                return (
                                    <Tooltip key={item.label}>
                                        <TooltipTrigger asChild>
                                            {linkElement}
                                        </TooltipTrigger>
                                        <TooltipContent side="right" sideOffset={12}>
                                            {item.label}
                                        </TooltipContent>
                                    </Tooltip>
                                )
                            }

                            return <div key={item.label}>{linkElement}</div>
                        }

                        const buttonElement = (
                            <button
                                key={item.label}
                                type="button"
                                className={classes}
                                aria-disabled="true"
                                disabled
                            >
                                {content}
                            </button>
                        )

                        if (!expanded && !mobile) {
                            return (
                                <Tooltip key={item.label}>
                                    <TooltipTrigger asChild>
                                        {buttonElement}
                                    </TooltipTrigger>
                                    <TooltipContent side="right" sideOffset={12}>
                                        {item.label}
                                    </TooltipContent>
                                </Tooltip>
                            )
                        }

                        return buttonElement
                    })}
                </div>
            </nav>

            <SidebarAccountPanel
                compact={!expanded}
                email={user.email}
                initials={user.initials}
                mobile={mobile}
                name={user.displayName}
                onLogout={onLogout}
            />
        </aside>
    )
}

function SidebarAccountPanel({
    compact,
    email,
    initials,
    mobile,
    name,
    onLogout,
}: {
    compact: boolean
    email: string
    initials: string
    mobile: boolean
    name: string
    onLogout?: () => void
}) {
    if (compact) {
        return (
            <div className="rounded-[1.25rem] border border-sidebar-border/90 bg-background/80 px-2.5 py-3 shadow-[0_16px_34px_-30px_oklch(0.19_0.025_255/0.45)]">
                <div className="flex flex-col items-center gap-2">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="grid size-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_14px_24px_-20px_oklch(0.58_0.19_252/0.55)]">
                                {initials}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12}>
                            <p className="font-medium">{name}</p>
                            <p className="text-xs text-muted-foreground">{email}</p>
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Cerrar sesion"
                                className="size-10 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive shell-press-transition"
                                disabled={!onLogout}
                                onClick={onLogout}
                            >
                                <LogOut className="size-4" aria-hidden="true" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={12}>
                            Cerrar sesion
                        </TooltipContent>
                    </Tooltip>
                </div>
            </div>
        )
    }

    return (
        <div className="rounded-[1.25rem] border border-sidebar-border/90 bg-background/80 p-3 shadow-[0_18px_38px_-32px_oklch(0.19_0.025_255/0.45)]">
            <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-[0_16px_28px_-22px_oklch(0.58_0.19_252/0.55)]">
                    {initials}
                </div>
                <div className="min-w-0 flex-1 shell-fade-transition">
                    <p className="truncate text-sm font-semibold">{name}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                        {email}
                    </p>
                </div>
            </div>
            <Button
                type="button"
                variant="outline"
                className={cn(
                    'mt-3 h-10 w-full justify-start border-destructive/20 bg-background/85 text-destructive hover:bg-destructive/10 hover:text-destructive shell-press-transition',
                    mobile && 'h-11',
                )}
                disabled={!onLogout}
                onClick={onLogout}
            >
                <LogOut className="size-4" aria-hidden="true" />
                Cerrar sesion
            </Button>
        </div>
    )
}

type DashboardNavbarProps = {
    onOpenMobileSidebar: () => void
    pageLabel: string
    pageTitle: string
}

function DashboardNavbar({
    onOpenMobileSidebar,
    pageLabel,
    pageTitle,
}: DashboardNavbarProps) {
    return (
        <header className="sticky top-0 z-30 border-b border-border/75 bg-background/86 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
                <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    className="md:hidden shell-press-transition"
                    aria-label="Abrir menu"
                    onClick={onOpenMobileSidebar}
                >
                    <Menu className="size-4" aria-hidden="true" />
                </Button>
                <div className="min-w-0">
                    <p className="text-sm font-medium text-muted-foreground">
                        {pageLabel}
                    </p>
                    <h1 className="truncate text-base font-semibold tracking-[-0.01em] sm:text-lg">
                        {pageTitle}
                    </h1>
                </div>
            </div>
        </header>
    )
}

function BadgeMuted({ children }: { children: ReactNode }) {
    return (
        <span className="rounded-full border border-border/80 bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">
            {children}
        </span>
    )
}

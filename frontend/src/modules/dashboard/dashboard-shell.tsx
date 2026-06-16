'use client'

import {
    ArrowUpRight,
    BellDot,
    ChevronLeft,
    ChevronRight,
    LogOut,
    Menu,
    MoveRight,
    Sparkles,
    WalletCards,
    X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useEffectEvent, useState } from 'react'

import { APP_ROUTES } from '@/shared/config/routes'
import { cn } from '@/shared/lib/utils'
import { Badge } from '@/shared/ui/badge'
import { BrandLogo } from '@/shared/ui/brand-logo'
import { Button } from '@/shared/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import {
    dashboardMetrics,
    dashboardNavigation,
    dashboardUser,
    monthlyAllocation,
    nextActions,
    recentActivity,
} from './dashboard.data'

type DashboardShellProps = {
    onLogout?: () => void
}

export function DashboardShell({ onLogout }: DashboardShellProps) {
    const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false)
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

    const userInitial = dashboardUser.name.charAt(0).toUpperCase()

    return (
        <main className="bg-app-gradient min-h-dvh text-foreground">
            <div className="flex min-h-dvh">
                <div className="hidden md:block">
                    <DashboardSidebar
                        collapsed={isDesktopCollapsed}
                        onToggleCollapse={() =>
                            setIsDesktopCollapsed((currentState) => !currentState)
                        }
                    />
                </div>

                <div
                    className={cn(
                        'fixed inset-0 z-40 bg-foreground/22 backdrop-blur-[2px] transition-opacity duration-200 md:hidden',
                        isMobileSidebarOpen
                            ? 'pointer-events-auto opacity-100'
                            : 'pointer-events-none opacity-0',
                    )}
                    aria-hidden={!isMobileSidebarOpen}
                    onClick={() => setIsMobileSidebarOpen(false)}
                />

                <div
                    className={cn(
                        'fixed inset-y-0 left-0 z-50 w-[18rem] transition-transform duration-200 ease-out md:hidden',
                        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full',
                    )}
                    aria-hidden={!isMobileSidebarOpen}
                >
                    <DashboardSidebar
                        mobile
                        onCloseMobile={() => setIsMobileSidebarOpen(false)}
                    />
                </div>

                <div className="flex min-w-0 flex-1 flex-col">
                    <DashboardNavbar
                        userInitial={userInitial}
                        userName={dashboardUser.name}
                        onLogout={onLogout}
                        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
                    />

                    <div className="flex-1 px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
                        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:gap-5">
                            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.8fr)]">
                                <Card className="border border-white/70 bg-card/92 shadow-[0_20px_50px_-32px_oklch(0.58_0.19_252/0.22)]">
                                    <CardHeader className="gap-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                                                Junio 2026
                                            </Badge>
                                            <Badge
                                                variant="outline"
                                                className="border-border/80 bg-background/80 text-muted-foreground"
                                            >
                                                Resumen mensual
                                            </Badge>
                                        </div>
                                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                                            <div className="max-w-2xl">
                                                <CardTitle className="text-2xl font-semibold tracking-[-0.02em] sm:text-[2rem]">
                                                    Hola, {dashboardUser.name.split(' ')[0]}.
                                                    Tu mes va con una lectura clara.
                                                </CardTitle>
                                                <CardDescription className="mt-2 max-w-xl text-[0.95rem] leading-6">
                                                    Ya tienes suficientes datos para ver
                                                    cuanto entra, cuanto sale y donde
                                                    conviene actuar primero antes del cierre.
                                                </CardDescription>
                                            </div>
                                            <Button
                                                variant="outline"
                                                className="h-10 justify-self-start bg-background/80 lg:justify-self-end"
                                            >
                                                Registrar movimiento
                                                <MoveRight
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.82fr)]">
                                        <div className="rounded-xl bg-[linear-gradient(135deg,oklch(0.98_0.01_255),oklch(0.95_0.015_252))] p-4 ring-1 ring-border/70">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Disponible estimado hoy
                                            </p>
                                            <p className="finance-number mt-2 text-3xl font-semibold tracking-[-0.03em] text-foreground sm:text-[2.2rem]">
                                                $1.270.000
                                            </p>
                                            <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                <StatPill
                                                    label="Ingreso"
                                                    value="$4.85M"
                                                    toneClass="text-[color:var(--chart-1)]"
                                                />
                                                <StatPill
                                                    label="Salida"
                                                    value="$3.58M"
                                                    toneClass="text-[color:var(--chart-2)]"
                                                />
                                                <StatPill
                                                    label="Meta"
                                                    value="$820K"
                                                    toneClass="text-[color:var(--accent)]"
                                                />
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-border/75 bg-background/80 p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        Ritmo mensual
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        Referencia 50/30/20
                                                    </p>
                                                </div>
                                                <Badge className="bg-accent text-accent-foreground hover:bg-accent">
                                                    68% alineado
                                                </Badge>
                                            </div>
                                            <Progress
                                                value={68}
                                                className="mt-4 h-2.5 bg-muted/80"
                                                aria-label="Progreso de distribucion financiera"
                                            />
                                            <div className="mt-4 space-y-3">
                                                {monthlyAllocation.map((item) => (
                                                    <div key={item.label} className="space-y-1.5">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="text-sm font-medium">
                                                                {item.label}
                                                            </p>
                                                            <p className="finance-number text-sm text-muted-foreground">
                                                                {item.current} · {item.goal}
                                                            </p>
                                                        </div>
                                                        <div className="h-2 overflow-hidden rounded-full bg-muted/80">
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${item.progress}%`,
                                                                    backgroundColor: item.tone,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border border-white/70 bg-card/90">
                                    <CardHeader>
                                        <div className="flex items-center gap-2">
                                            <div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
                                                <Sparkles
                                                    className="size-4"
                                                    aria-hidden="true"
                                                />
                                            </div>
                                            <div>
                                                <CardTitle>Siguiente accion</CardTitle>
                                                <CardDescription className="mt-1">
                                                    Lo mas util para mejorar tus siguientes
                                                    reportes.
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {nextActions.map((item) => (
                                            <div
                                                key={item.title}
                                                className="rounded-xl border border-border/75 bg-background/80 p-4"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p className="font-medium">{item.title}</p>
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-background text-muted-foreground"
                                                    >
                                                        {item.emphasis}
                                                    </Badge>
                                                </div>
                                                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                                    {item.detail}
                                                </p>
                                            </div>
                                        ))}
                                        <Button
                                            variant="brand"
                                            className="mt-1 h-11 w-full justify-center"
                                        >
                                            Completar perfil del mes
                                            <ArrowUpRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </section>

                            <section
                                aria-label="Indicadores principales"
                                className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4"
                            >
                                {dashboardMetrics.map((metric) => (
                                    <DashboardMetricCard key={metric.label} {...metric} />
                                ))}
                            </section>

                            <section className="grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                                <Card className="border border-white/70 bg-card/90">
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <CardTitle>Actividad reciente</CardTitle>
                                                <CardDescription className="mt-1">
                                                    Ultimos movimientos relevantes del mes.
                                                </CardDescription>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className="bg-background text-muted-foreground"
                                            >
                                                4 items
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {recentActivity.map((item) => (
                                            <div
                                                key={`${item.title}-${item.detail}`}
                                                className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/80 p-4"
                                            >
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium">
                                                        {item.title}
                                                    </p>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {item.detail}
                                                    </p>
                                                </div>
                                                <p
                                                    className="finance-number shrink-0 text-sm font-semibold"
                                                    style={{ color: item.tone }}
                                                >
                                                    {item.amount}
                                                </p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card className="border border-white/70 bg-card/90">
                                    <CardHeader>
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <CardTitle>Enfoque de esta semana</CardTitle>
                                                <CardDescription className="mt-1">
                                                    Prioridades para que el cierre sea mas limpio.
                                                </CardDescription>
                                            </div>
                                            <div className="grid size-9 place-items-center rounded-lg bg-[color-mix(in_oklch,var(--chart-2)_12%,transparent)] text-[color:var(--chart-2)]">
                                                <BellDot className="size-4" aria-hidden="true" />
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="rounded-xl border border-border/75 bg-background/80 p-4">
                                            <p className="text-sm font-medium text-muted-foreground">
                                                Gasto variable bajo control
                                            </p>
                                            <p className="mt-2 text-sm leading-6">
                                                Tus compras flexibles van por debajo del limite
                                                planeado. Si mantienes el ritmo, llegas al cierre
                                                con mejor margen.
                                            </p>
                                        </div>
                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                                            <FocusCard
                                                label="Deuda prioritaria"
                                                value="Tarjeta principal"
                                                detail="Proximo pago sugerido: 18 de junio"
                                            />
                                            <FocusCard
                                                label="Ahorro posible"
                                                value="$180.000 extra"
                                                detail="Disponible si mantienes gastos variables estables"
                                            />
                                        </div>
                                        <Button variant="outline" className="h-11 w-full">
                                            Ver detalle mensual
                                            <MoveRight
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </Button>
                                    </CardContent>
                                </Card>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}

type DashboardSidebarProps = {
    collapsed?: boolean
    mobile?: boolean
    onCloseMobile?: () => void
    onToggleCollapse?: () => void
}

function DashboardSidebar({
    collapsed = false,
    mobile = false,
    onCloseMobile,
    onToggleCollapse,
}: DashboardSidebarProps) {
    const expanded = mobile || !collapsed

    return (
        <aside
            className={cn(
                'flex h-dvh flex-col border-r border-sidebar-border bg-sidebar/96 backdrop-blur-md',
                mobile
                    ? 'w-full rounded-r-[1.4rem] shadow-[0_24px_48px_-28px_oklch(0.19_0.025_255/0.4)]'
                    : 'sticky top-0 transition-[width] duration-200 ease-out',
                mobile ? 'px-4 py-4' : expanded ? 'w-[16.5rem] px-4 py-5' : 'w-[5.5rem] px-3 py-5',
            )}
        >
            <div className="flex items-center justify-between gap-3">
                <Link
                    href={APP_ROUTES.dashboard}
                    className={cn(
                        'flex min-w-0 items-center gap-3 rounded-xl px-2 py-1.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50',
                        expanded ? 'justify-start' : 'justify-center',
                    )}
                    onClick={() => onCloseMobile?.()}
                >
                    {expanded ? (
                        <>
                            <BrandLogo
                                width={146}
                                height={36}
                                className="h-9 w-auto object-contain"
                            />
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">FinTrack OS</p>
                                <p className="truncate text-xs text-muted-foreground">
                                    Workspace mensual
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_12px_24px_-18px_oklch(0.58_0.19_252/0.5)]">
                            <WalletCards className="size-5" aria-hidden="true" />
                        </div>
                    )}
                </Link>

                {mobile ? (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Cerrar menu"
                        onClick={onCloseMobile}
                    >
                        <X className="size-4" aria-hidden="true" />
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
                        onClick={onToggleCollapse}
                    >
                        {collapsed ? (
                            <ChevronRight className="size-4" aria-hidden="true" />
                        ) : (
                            <ChevronLeft className="size-4" aria-hidden="true" />
                        )}
                    </Button>
                )}
            </div>

            <nav className="mt-6 flex-1" aria-label="Navegacion principal">
                <div className="space-y-1.5">
                    {dashboardNavigation.map((item) => {
                        const content = (
                            <>
                                <item.icon className="size-4 shrink-0" aria-hidden="true" />
                                {expanded ? (
                                    <>
                                        <span className="min-w-0 flex-1 truncate text-left">
                                            {item.label}
                                        </span>
                                        {!item.available ? (
                                            <Badge
                                                variant="outline"
                                                className="bg-background/80 text-[11px] text-muted-foreground"
                                            >
                                                Pronto
                                            </Badge>
                                        ) : null}
                                    </>
                                ) : null}
                            </>
                        )

                        const classes = cn(
                            'flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                            expanded ? 'justify-start' : 'justify-center px-0',
                            item.current
                                ? 'bg-primary/10 text-primary'
                                : 'text-sidebar-foreground/78 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                            !item.available &&
                                !item.current &&
                                'cursor-not-allowed opacity-75 hover:bg-transparent hover:text-sidebar-foreground/78',
                        )

                        if (item.available) {
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

            <div
                className={cn(
                    'rounded-xl border border-sidebar-border bg-background/78 p-3',
                    !expanded && 'px-2',
                )}
            >
                {expanded ? (
                    <>
                        <p className="text-sm font-medium">Base visual lista</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            Este shell ya esta preparado para conectar rutas y datos reales.
                        </p>
                    </>
                ) : (
                    <div className="flex justify-center">
                        <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            V1
                        </Badge>
                    </div>
                )}
            </div>
        </aside>
    )
}

type DashboardNavbarProps = {
    onLogout?: () => void
    onOpenMobileSidebar: () => void
    userInitial: string
    userName: string
}

function DashboardNavbar({
    onLogout,
    onOpenMobileSidebar,
    userInitial,
    userName,
}: DashboardNavbarProps) {
    return (
        <header className="sticky top-0 z-30 border-b border-border/75 bg-background/88 backdrop-blur-xl">
            <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="md:hidden"
                        aria-label="Abrir menu"
                        onClick={onOpenMobileSidebar}
                    >
                        <Menu className="size-4" aria-hidden="true" />
                    </Button>
                    <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground">
                            Dashboard
                        </p>
                        <h1 className="truncate text-base font-semibold tracking-[-0.01em] sm:text-lg">
                            Vista general del mes
                        </h1>
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    <div className="hidden items-center gap-3 rounded-full border border-border/80 bg-card/80 px-2.5 py-2 sm:flex">
                        <div className="grid size-9 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                            {userInitial}
                        </div>
                        <div className="pr-1">
                            <p className="text-sm font-medium leading-none">{userName}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Perfil personal
                            </p>
                        </div>
                    </div>
                    <div className="grid size-10 place-items-center rounded-full border border-border/80 bg-card/80 text-sm font-semibold sm:hidden">
                        {userInitial}
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-10 bg-card/80"
                        onClick={onLogout}
                    >
                        <LogOut className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Logout</span>
                    </Button>
                </div>
            </div>
        </header>
    )
}

type DashboardMetricCardProps = (typeof dashboardMetrics)[number]

function DashboardMetricCard({
    detail,
    icon: Icon,
    label,
    tone,
    value,
}: DashboardMetricCardProps) {
    return (
        <Card className="border border-white/70 bg-card/90">
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <CardTitle className="text-sm text-muted-foreground">
                            {label}
                        </CardTitle>
                    </div>
                    <div
                        className="grid size-10 place-items-center rounded-lg"
                        style={{
                            backgroundColor: `color-mix(in oklch, ${tone} 14%, transparent)`,
                            color: tone,
                        }}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <p className="finance-number text-2xl font-semibold tracking-[-0.02em]">
                    {value}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    )
}

function FocusCard({
    detail,
    label,
    value,
}: {
    detail: string
    label: string
    value: string
}) {
    return (
        <div className="rounded-xl border border-border/75 bg-background/80 p-4">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-medium">{value}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
        </div>
    )
}

function StatPill({
    label,
    toneClass,
    value,
}: {
    label: string
    toneClass: string
    value: string
}) {
    return (
        <div className="rounded-lg border border-white/70 bg-white/80 px-3 py-2">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('finance-number mt-1 text-sm font-semibold', toneClass)}>
                {value}
            </p>
        </div>
    )
}

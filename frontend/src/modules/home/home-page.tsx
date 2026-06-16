import {
    BadgeDollarSign,
    CreditCard,
    PiggyBank,
    WalletCards,
} from 'lucide-react'

import { Badge } from '@/shared/ui/badge'
import { BrandLogo } from '@/shared/ui/brand-logo'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'
import { HomeAuthButton } from './home-auth-actions'
import { HomeSummaryCard } from './home-summary-card'

const summaryCards = [
    {
        label: 'Ingresos registrados',
        value: '$4.850.000',
        detail: '+12% frente al mes anterior',
        Icon: WalletCards,
        tone: 'var(--chart-1)',
    },
    {
        label: 'Gastos del mes',
        value: '$2.940.000',
        detail: '61% de tus ingresos',
        Icon: BadgeDollarSign,
        tone: 'var(--chart-2)',
    },
    {
        label: 'Ahorro estimado',
        value: '$820.000',
        detail: '17% del ingreso mensual',
        Icon: PiggyBank,
        tone: 'var(--accent)',
    },
    {
        label: 'Pagos a deuda',
        value: '$640.000',
        detail: 'Tarjetas y compromisos fijos',
        Icon: CreditCard,
        tone: 'var(--chart-3)',
    },
]

export function HomePage() {
    return (
        <main className="bg-app-gradient min-h-dvh text-foreground">
            <div className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col px-5 py-5 sm:px-8 lg:px-10">
                <header className="flex items-center justify-between gap-4 rounded-xl bg-card/80 px-4 py-3 ring-1 ring-border backdrop-blur">
                    <div className="flex items-center gap-3">
                        <BrandLogo
                            width={156}
                            height={39}
                            priority
                            className="h-10 w-auto object-contain"
                        />
                        <div>
                            <p className="text-sm font-semibold leading-none">
                                FinTrack OS
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Control mensual inteligente
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <HomeAuthButton
                            destination="register"
                            variant="ghost"
                            className="h-10 px-3"
                        >
                            Crear cuenta
                        </HomeAuthButton>
                        <HomeAuthButton
                            destination="login"
                            variant="outline"
                            className="h-10"
                            withLoginIcon
                        >
                            Login
                        </HomeAuthButton>
                    </div>
                </header>

                <section className="grid flex-1 items-center gap-8 py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.65fr)] lg:py-14">
                    <div className="max-w-3xl">
                        <Badge className="mb-5 h-8 bg-primary/10 text-primary hover:bg-primary/10">
                            Primera base visual
                        </Badge>
                        <h1 className="text-balance text-4xl font-semibold leading-tight tracking-[-0.02em] sm:text-5xl">
                            Bienvenido a la app de{' '}
                            <span className="text-brand-gradient">FinTrack OS</span>
                        </h1>
                        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
                            Registra ingresos, egresos, deudas y metas de ahorro en un
                            solo sistema. La experiencia esta pensada para ver tu mes
                            con claridad y tomar mejores decisiones sin friccion.
                        </p>
                        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                            <HomeAuthButton
                                destination="register"
                                variant="brand"
                                className="h-11 px-5"
                                withArrowIcon
                            >
                                Crear mi cuenta
                            </HomeAuthButton>
                            <HomeAuthButton
                                destination="login"
                                variant="outline"
                                className="h-11 px-5"
                            >
                                Entrar a mi cuenta
                            </HomeAuthButton>
                        </div>
                    </div>

                    <Card className="bg-card/90">
                        <CardHeader>
                            <CardTitle>Progreso recomendado 50/30/20</CardTitle>
                            <CardDescription>
                                Estado de referencia para el mes actual.
                            </CardDescription>
                            <CardAction>
                                <Badge className="bg-accent text-accent-foreground hover:bg-accent">
                                    68%
                                </Badge>
                            </CardAction>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <Progress
                                value={68}
                                aria-label="Progreso financiero del mes"
                            />
                            <div className="grid grid-cols-3 gap-3 text-sm">
                                <div>
                                    <p className="finance-number font-semibold">
                                        $2.4M
                                    </p>
                                    <p className="text-muted-foreground">Necesidades</p>
                                </div>
                                <div>
                                    <p className="finance-number font-semibold">
                                        $1.1M
                                    </p>
                                    <p className="text-muted-foreground">Deseos</p>
                                </div>
                                <div>
                                    <p className="finance-number font-semibold">
                                        $820K
                                    </p>
                                    <p className="text-muted-foreground">Ahorro</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                <section
                    aria-label="Resumen financiero de muestra"
                    className="grid gap-4 pb-8 sm:grid-cols-2 xl:grid-cols-4"
                >
                    {summaryCards.map((card) => (
                        <HomeSummaryCard key={card.label} {...card} />
                    ))}
                </section>
            </div>
        </main>
    )
}

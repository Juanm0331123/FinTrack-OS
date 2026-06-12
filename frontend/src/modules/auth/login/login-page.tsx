import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { APP_ROUTES } from '@/shared/config/routes'
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
import { LoginForm } from './login-form'

const proofPoints = [
    'Tus movimientos quedan organizados por mes.',
    'Las deudas y pagos minimos tendran seguimiento claro.',
    'El ahorro recomendado se comparara contra tu realidad.',
]

export function LoginPage() {
    return (
        <main className="bg-auth-soft relative min-h-dvh overflow-hidden text-foreground">
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute left-[8%] top-[12%] size-52 rounded-full bg-primary/18 blur-3xl" />
                <div className="absolute right-[10%] top-[16%] size-64 rounded-full bg-accent/16 blur-3xl" />
                <div className="absolute bottom-[10%] right-[18%] size-72 rounded-full bg-(--brand-cyan)/14 blur-3xl" />
            </div>

            <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
                <section className="w-full max-w-xl">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <Button asChild variant="ghost" className="h-10 px-2 text-sm">
                            <Link href={APP_ROUTES.home}>
                                <ArrowLeft className="size-4" aria-hidden="true" />
                                Volver al Home
                            </Link>
                        </Button>
                        <Badge className="h-8 bg-primary/10 px-3 text-primary hover:bg-primary/10">
                            Acceso seguro
                        </Badge>
                    </div>

                    <Card className="border border-white/70 bg-card/92 shadow-[0_24px_60px_-28px_oklch(0.58_0.19_252/0.24)] backdrop-blur-sm">
                        <CardHeader className="gap-4 px-6 pt-6 sm:px-8 sm:pt-8">
                            <div className="flex items-center gap-3">
                <BrandLogo
                  width={184}
                  height={46}
                  priority
                  className="h-11 w-auto object-contain"
                />
                                <div>
                                    <p className="text-sm font-semibold leading-none">
                                        FinTrack OS
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Tu acceso mensual a una mejor lectura financiera
                                    </p>
                                </div>
                            </div>

                            <div>
                                <Badge className="mb-4 h-8 bg-primary/10 px-3 text-primary hover:bg-primary/10">
                                    <Sparkles className="size-3.5" aria-hidden="true" />
                                    Login de primera version
                                </Badge>
                                <CardTitle className="text-balance text-3xl font-semibold leading-tight tracking-[-0.02em] sm:text-4xl">
                                    Accede a tu espacio financiero
                                </CardTitle>
                                <CardDescription className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                                    Ingresa con tus datos para validar el flujo visual
                                    de{' '}
                                    <span className="font-medium text-primary">
                                        FinTrack OS
                                    </span>
                                    . La autenticacion real y los tokens se conectaran
                                    despues.
                                </CardDescription>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6 px-6 pb-6 sm:px-8 sm:pb-8">
                            <LoginForm />

                            <div className="rounded-xl bg-muted/72 px-4 py-4 ring-1 ring-border/70">
                                <div className="space-y-3 text-sm text-muted-foreground">
                                    {proofPoints.map((point) => (
                                        <div key={point} className="flex gap-2.5">
                                            <CheckCircle2
                                                className="mt-0.5 size-4 shrink-0 text-[var(--accent)]"
                                                aria-hidden="true"
                                            />
                                            <p>{point}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </div>
        </main>
    )
}

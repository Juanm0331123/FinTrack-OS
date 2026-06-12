import Link from "next/link";
import {
  ArrowLeft,
  ChartNoAxesCombined,
  CheckCircle2,
  CreditCard,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { APP_ROUTES } from "@/shared/config/routes";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Separator } from "@/shared/ui/separator";
import { LoginForm } from "./login-form";

const proofPoints = [
  "Tus movimientos quedan organizados por mes.",
  "Las deudas y pagos minimos tendran seguimiento claro.",
  "El ahorro recomendado se comparara contra tu realidad.",
];

export function LoginPage() {
  return (
    <main className="bg-app-gradient min-h-dvh text-foreground">
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-6 px-5 py-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.7fr)] lg:px-10">
        <section className="hidden min-h-[calc(100dvh-2.5rem)] flex-col justify-between overflow-hidden rounded-2xl bg-foreground p-8 text-background lg:flex">
          <div className="flex items-center justify-between">
            <Link
              href={APP_ROUTES.home}
              className="inline-flex items-center gap-2 text-sm font-medium text-background/80 transition-colors hover:text-background"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Volver al Home
            </Link>
            <Badge className="bg-background/12 text-background hover:bg-background/12">
              Acceso seguro
            </Badge>
          </div>

          <div className="max-w-xl">
            <div className="mb-6 grid size-12 place-items-center rounded-xl bg-background text-foreground">
              <ChartNoAxesCombined className="size-6" aria-hidden="true" />
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-tight tracking-[-0.02em]">
              Accede a tu espacio financiero en{" "}
              <span className="text-brand-gradient">FinTrack OS</span>
            </h1>
            <p className="mt-5 text-pretty text-base leading-7 text-background/72">
              Una entrada limpia para revisar tu mes, controlar tus deudas y
              entender cuanto dinero queda realmente disponible.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-background/10 p-4">
                <TrendingUp className="mb-3 size-5 text-[var(--accent)]" />
                <p className="finance-number text-2xl font-semibold">68%</p>
                <p className="text-sm text-background/64">progreso mensual</p>
              </div>
              <div className="rounded-xl bg-background/10 p-4">
                <CreditCard className="mb-3 size-5 text-[var(--brand-rose)]" />
                <p className="finance-number text-2xl font-semibold">$640K</p>
                <p className="text-sm text-background/64">deuda planeada</p>
              </div>
              <div className="rounded-xl bg-background/10 p-4">
                <ShieldCheck className="mb-3 size-5 text-[var(--brand-cyan)]" />
                <p className="finance-number text-2xl font-semibold">AA</p>
                <p className="text-sm text-background/64">base accesible</p>
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[calc(100dvh-2.5rem)] items-center justify-center">
          <div className="w-full max-w-md rounded-2xl bg-card p-6 ring-1 ring-border sm:p-8">
            <Button asChild variant="ghost" className="mb-8 px-0 lg:hidden">
              <Link href={APP_ROUTES.home}>
                <ArrowLeft className="size-4" aria-hidden="true" />
                Volver al Home
              </Link>
            </Button>

            <div className="mb-7">
              <Badge className="mb-4 h-8 bg-primary/10 text-primary hover:bg-primary/10">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Login de primera version
              </Badge>
              <h2 className="text-3xl font-semibold tracking-[-0.02em]">
                Bienvenido de nuevo
              </h2>
              <p className="mt-3 text-pretty text-sm leading-6 text-muted-foreground">
                Ingresa con tus datos para validar el flujo visual. La conexion
                real con tokens vendra despues.
              </p>
            </div>

            <LoginForm />

            <Separator className="my-6" />

            <div className="space-y-3 text-sm text-muted-foreground">
              {proofPoints.map((point) => (
                <div key={point} className="flex gap-2">
                  <CheckCircle2
                    className="mt-0.5 size-4 shrink-0 text-[var(--accent)]"
                    aria-hidden="true"
                  />
                  <p>{point}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

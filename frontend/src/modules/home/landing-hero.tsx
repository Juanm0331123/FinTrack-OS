import { HeroMotionToggle } from './hero-motion-toggle'
import { HeroScene } from './hero-scene'
import { HomeAuthLink } from './home-auth-actions'
import { LANDING_ANCHORS } from './landing-content'

// Hero con la estructura de la referencia SkyElite (motionsites.ai), adaptado a FinTrack OS: escena a
// pantalla completa, rótulo en mayúsculas, titular de dos líneas superpuestas y dos accesos en
// píldora. En lugar del video del avión, una escena propia en SVG/CSS (hero-scene.tsx). Conserva el
// texto «Bienvenido a la app de FinTrack OS» y el degradado de marca en «FinTrack OS». La barra de
// navegación se superpone desde HomePage (fuera de <main>).
export function LandingHero() {
    return (
        <section
            id={LANDING_ANCHORS.hero}
            aria-labelledby="hero-title"
            data-cinema-hero
            className="relative h-svh min-h-[600px] overflow-hidden bg-[#e7e9ee]"
        >
            <HeroScene />
            {/* Funde el borde inferior con el fondo de la página: sin corte entre el hero y lo que sigue. */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-linear-to-b from-transparent to-background" />

            <div className="relative z-10 flex h-full flex-col items-center px-6 pt-[clamp(96px,16svh,160px)] text-center">
                <p className="mb-4 text-sm font-semibold tracking-wider text-ink-secondary uppercase">
                    Finanzas personales, mes a mes
                </p>
                <h1 id="hero-title" className="max-w-5xl text-5xl leading-[1.05] font-normal tracking-tighter text-balance sm:text-6xl sm:leading-none md:text-7xl xl:text-8xl">
                    <span className="block text-foreground">Bienvenido a la app de </span>
                    <span className="block sm:-mt-3">
                        <span className="text-brand-gradient pb-[0.08em]">FinTrack OS</span>
                    </span>
                </h1>
                <p className="mt-5 mb-6 max-w-2xl text-lg text-ink-secondary md:text-xl">
                    Registra tus ingresos y gastos, organiza tu mes y revisa tus deudas.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                    <a
                        href={`#${LANDING_ANCHORS.howItWorks}`}
                        className="inline-flex min-h-11 items-center rounded-full bg-edge px-4 font-medium text-foreground sm:px-5 transition-colors focus-ring hover:bg-access-edge"
                    >
                        Ver cómo funciona
                    </a>
                    <HomeAuthLink
                        destination="register"
                        className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 font-medium text-primary-foreground sm:px-5 transition-colors focus-ring hover:bg-blue-hover"
                    >
                        Crear mi cuenta
                    </HomeAuthLink>
                </div>
            </div>

            <HeroMotionToggle />
        </section>
    )
}

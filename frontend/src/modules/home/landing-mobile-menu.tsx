'use client'

import { LogIn, Menu, UserPlus, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { HomeAuthLink } from './home-auth-actions'
import { NAV_LINKS } from './landing-content'

const rowClassName =
    'flex min-h-12 items-center rounded-xl px-3 text-base font-medium text-foreground focus-ring-inset hover:bg-panel'

// Menú móvil de la referencia SkyElite (hamburguesa ↔ X, desplegable blanco translúcido) sobre
// <details> nativo: abre y cierra sin JavaScript. El cliente solo lo cierra al elegir un destino,
// con Escape (devolviendo el foco) o al tocar fuera.
export function LandingMobileMenu() {
    const detailsRef = useRef<HTMLDetailsElement>(null)

    useEffect(() => {
        const details = detailsRef.current

        if (!details) {
            return
        }

        function close(returnFocus: boolean) {
            if (!details?.open) {
                return
            }

            details.open = false

            if (returnFocus) {
                details.querySelector('summary')?.focus()
            }
        }

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                close(true)
            }
        }

        function onPointerDown(event: PointerEvent) {
            if (event.target instanceof Node && !details?.contains(event.target)) {
                close(false)
            }
        }

        document.addEventListener('keydown', onKeyDown)
        document.addEventListener('pointerdown', onPointerDown)

        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.removeEventListener('pointerdown', onPointerDown)
        }
    }, [])

    function closeAfterChoice() {
        if (detailsRef.current) {
            detailsRef.current.open = false
        }
    }

    return (
        <details ref={detailsRef} className="group md:hidden">
            <summary
                aria-label="Menú"
                className="grid size-11 cursor-pointer list-none place-items-center rounded-full text-foreground transition-colors focus-ring hover:text-ink-secondary [&::-webkit-details-marker]:hidden"
            >
                <Menu className="size-6 group-open:hidden" aria-hidden="true" />
                <X className="hidden size-6 group-open:block" aria-hidden="true" />
            </summary>
            <nav
                aria-label="Principal"
                className="absolute inset-x-4 top-full z-30 flex flex-col gap-0.5 rounded-2xl bg-white/95 p-2 shadow-lg backdrop-blur"
            >
                {NAV_LINKS.map((link) => (
                    <a key={link.href} href={link.href} className={rowClassName} onClick={closeAfterChoice}>
                        {link.label}
                    </a>
                ))}
                <span aria-hidden="true" className="mx-1 my-1.5 h-px bg-border" />
                <HomeAuthLink
                    destination="register"
                    className="flex min-h-12 items-center justify-center gap-2.5 rounded-lg border border-access-edge bg-card text-base font-medium text-foreground focus-ring hover:border-access-edge-hover hover:bg-access-hover"
                >
                    <UserPlus className="size-[18px] stroke-[1.7]" aria-hidden="true" />
                    Crear cuenta
                </HomeAuthLink>
                <HomeAuthLink
                    destination="login"
                    className="flex min-h-12 items-center justify-center gap-2.5 rounded-lg text-base font-medium text-foreground focus-ring hover:bg-panel"
                >
                    <LogIn className="size-[18px] stroke-[1.7]" aria-hidden="true" />
                    Iniciar sesión
                </HomeAuthLink>
            </nav>
        </details>
    )
}

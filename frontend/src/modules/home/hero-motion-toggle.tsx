'use client'

import { Pause, Play } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

const subscribeToHydration = () => () => undefined
const clientReady = () => true
const serverReady = () => false

/**
 * Pausa y reanuda la escena del hero. Su movimiento se repite más de cinco segundos junto al texto,
 * así que necesita este control (WCAG 2.2.2). Con movimiento reducido la escena ya está quieta y el
 * botón no se muestra.
 */
export function HeroMotionToggle() {
    const ready = useSyncExternalStore(subscribeToHydration, clientReady, serverReady)
    const [paused, setPaused] = useState(false)
    const buttonRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        const hero = buttonRef.current?.closest<HTMLElement>('[data-cinema-hero]')
        const scene = hero?.querySelector<HTMLElement>('.ft-hero-scene')

        if (!hero || !scene || typeof IntersectionObserver !== 'function') {
            return
        }

        const reduced = matchMedia('(prefers-reduced-motion: reduce)')
        let visible = false

        function syncMotion() {
            hero!.toggleAttribute('data-hero-motion-active', visible && !document.hidden && !reduced.matches)
        }

        const observer = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting
            syncMotion()
        })

        observer.observe(scene)
        reduced.addEventListener('change', syncMotion)
        document.addEventListener('visibilitychange', syncMotion)
        hero.setAttribute('data-hero-motion-ready', '')

        return () => {
            observer.disconnect()
            reduced.removeEventListener('change', syncMotion)
            document.removeEventListener('visibilitychange', syncMotion)
            hero.removeAttribute('data-hero-motion-ready')
            hero.removeAttribute('data-hero-motion-active')
            hero.removeAttribute('data-hero-paused')
        }
    }, [])

    function toggle(event: MouseEvent<HTMLButtonElement>) {
        const hero = event.currentTarget.closest<HTMLElement>('[data-cinema-hero]')
        const next = !paused

        hero?.toggleAttribute('data-hero-paused', next)
        setPaused(next)
    }

    return (
        <button
            ref={buttonRef}
            hidden={!ready}
            type="button"
            onClick={toggle}
            aria-pressed={paused}
            aria-label="Pausar la animación del fondo"
            className="ft-hero-motion-toggle absolute right-4 bottom-4 z-20 grid size-11 place-items-center rounded-full bg-white/70 text-foreground shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] backdrop-blur transition-colors focus-ring hover:bg-white/90 motion-reduce:hidden sm:right-8 sm:bottom-8"
        >
            {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
        </button>
    )
}

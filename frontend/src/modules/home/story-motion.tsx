'use client'

import { useEffect } from 'react'

import { resolveStoryFrame, resolveStoryProgress } from './story-progress'

const DURATION = 1000
const DESKTOP_QUERY = '(min-width: 1024px) and (min-height: 720px)'

type ItemMotion = { animation: Animation; element: HTMLElement; top: number; offset: number }
type LayerMotion = { animation: Animation; items: Animation[] }
type Mode = 'static' | 'desktop' | 'mobile'

function clamp(value: number) {
    return Math.max(0, Math.min(1, value))
}

function smooth(value: number) {
    const fraction = clamp(value)
    return fraction * fraction * (3 - 2 * fraction)
}

/** Progressive enhancement only. SSR and reduced motion keep all product content in normal flow. */
export function StoryMotion() {
    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.ft-landing')
        const story = root?.querySelector<HTMLElement>('[data-story]')
        const hero = root?.querySelector<HTMLElement>('[data-cinema-hero]')

        if (!root || !story || typeof Element.prototype.animate !== 'function') {
            return
        }

        const chapters = [...story.querySelectorAll<HTMLElement>('[data-story-chapter]')]
        const layers = [...story.querySelectorAll<HTMLElement>('[data-story-layer]')]
        const progressFill = story.querySelector<HTMLElement>('.ft-story-progress-fill')
        const indexLabel = story.querySelector<HTMLElement>('[data-story-index]')
        const pieces = hero ? [...hero.querySelectorAll<HTMLElement>('[data-hero-piece]')] : []

        if (chapters.length !== 4 || layers.length !== 4) {
            return
        }

        const reduced = matchMedia('(prefers-reduced-motion: reduce)')
        const desktop = matchMedia(DESKTOP_QUERY)
        const initialEnhanced = story.getAttribute('data-story-enhanced')
        const initialProgressTransform = progressFill?.style.transform ?? ''
        const initialIndex = indexLabel?.textContent ?? ''
        const initialLayerClips = layers.map((layer) => layer.style.clipPath)
        const animations = new Set<Animation>()
        let mode: Mode = 'static'
        let layerMotions: LayerMotion[] = []
        let heroMotions: Animation[] = []
        let itemMotions: ItemMotion[] = []
        let centers: number[] = []
        let heroTop = 0
        let heroHeight = 1
        let frame = 0
        let needsMeasure = true
        let disposed = false
        let currentIndex = -1

        function restoreMarker() {
            if (initialEnhanced === null) {
                story!.removeAttribute('data-story-enhanced')
            } else {
                story!.setAttribute('data-story-enhanced', initialEnhanced)
            }
        }

        function resetMotion() {
            animations.forEach((animation) => animation.cancel())
            animations.clear()
            layerMotions = []
            heroMotions = []
            itemMotions = []
            currentIndex = -1
            layers.forEach((layer, index) => { layer.style.clipPath = initialLayerClips[index] })
            restoreMarker()

            if (progressFill) {
                progressFill.style.transform = initialProgressTransform
            }

            if (indexLabel) {
                indexLabel.textContent = initialIndex
            }
        }

        function paused(element: HTMLElement, keyframes: Keyframe[]) {
            const animation = element.animate(keyframes, { duration: DURATION, easing: 'linear', fill: 'both' })
            animation.pause()
            animation.currentTime = 0
            animations.add(animation)
            return animation
        }

        function setMode(next: Mode) {
            resetMotion()
            mode = next

            if (next === 'desktop') {
                layerMotions = layers.map((layer, index) => ({
                    animation: paused(layer, [
                        { opacity: 0, transform: `translate3d(${index % 2 === 0 ? 24 : -24}px, 16px, 0) scale(.98)` },
                        { opacity: 1, transform: 'translate3d(0, 0, 0) scale(1)' },
                    ]),
                    items: [...layer.querySelectorAll<HTMLElement>('[data-story-item]')].map((item) => paused(item, [
                        { opacity: 0.6, translate: `${index % 2 === 0 ? 24 : -24}px 12px` },
                        { opacity: 1, translate: '0px 0px' },
                    ])),
                }))
                // Individual translate leaves the CSS-authored rotation of each solid hero object intact.
                heroMotions = pieces.map((piece, index) => paused(piece, [
                    { opacity: 1, translate: '0px 0px' },
                    { opacity: 0.3, translate: `${index % 2 === 0 ? 24 : -24}px ${-24 - index * 5}px` },
                ]))
                story!.setAttribute('data-story-enhanced', 'true')
            } else if (next === 'mobile') {
                itemMotions = [...story!.querySelectorAll<HTMLElement>('[data-story-item]')].map((element) => ({
                    animation: paused(element, [
                        { opacity: 0.8, translate: '0px 12px' },
                        { opacity: 1, translate: '0px 0px' },
                    ]),
                    element,
                    offset: 12,
                    top: 0,
                }))
            }
        }

        function measure() {
            needsMeasure = false
            const next = reduced.matches ? 'static' : desktop.matches ? 'desktop' : 'mobile'

            if (next !== mode) {
                try {
                    setMode(next)
                } catch {
                    // Animation setup is optional; cancel partial enhancement and show the static page.
                    resetMotion()
                    mode = 'static'
                    return
                }
            }

            if (mode === 'desktop') {
                centers = chapters.map((chapter) => {
                    const rect = chapter.getBoundingClientRect()
                    return rect.top + scrollY + rect.height / 2
                })

                if (hero) {
                    const rect = hero.getBoundingClientRect()
                    heroTop = rect.top + scrollY
                    heroHeight = Math.max(1, rect.height)
                }
            } else if (mode === 'mobile') {
                itemMotions.forEach((item) => {
                    // Ignore our own translate when caching document geometry after a resize/font load.
                    item.top = item.element.getBoundingClientRect().top + scrollY - item.offset
                })
            }
        }

        function render() {
            frame = 0

            if (disposed || document.hidden) {
                return
            }

            if (needsMeasure) {
                measure()
            }

            if (mode === 'desktop') {
                const progress = resolveStoryProgress(centers, scrollY + innerHeight / 2)
                const state = resolveStoryFrame(progress)
                const visibleLayers = state.weights.map((weight, index) => weight > 0 ? index : -1).filter((index) => index >= 0)
                const entering = visibleLayers.length === 2 ? visibleLayers[1] : -1
                const reveal = entering >= 0 ? state.weights[entering] : 0

                layerMotions.forEach((layer, index) => {
                    // Opaque complementary clips avoid two sets of text showing through each other.
                    // The incoming sheet replaces the outgoing sheet from left to right, in either scroll direction.
                    layer.animation.currentTime = state.weights[index] > 0 ? DURATION : 0
                    layers[index].style.clipPath = state.weights[index] === 0
                        ? 'inset(0 100% 0 0)'
                        : entering < 0
                            ? 'inset(0)'
                            : index === entering
                                ? `inset(0 ${(1 - reveal) * 100}% 0 0)`
                                : `inset(0 0 0 ${reveal * 100}%)`
                    const entry = index === 0 ? 1 : clamp(0.5 + (progress - (index - 0.5) / 3) / 0.1)

                    layer.items.forEach((animation, itemIndex) => {
                        const delay = layer.items.length < 2 ? 0 : (itemIndex / (layer.items.length - 1)) * 0.45
                        animation.currentTime = smooth((entry - delay) / (1 - delay)) * DURATION
                    })
                })
                const heroExit = smooth((scrollY - heroTop) / (heroHeight * 0.85))
                heroMotions.forEach((animation) => { animation.currentTime = heroExit * DURATION })

                if (progressFill) {
                    progressFill.style.transform = `scaleX(${progress})`
                }

                if (indexLabel && currentIndex !== state.index) {
                    currentIndex = state.index
                    indexLabel.textContent = String(currentIndex + 1).padStart(2, '0')
                }
            } else if (mode === 'mobile') {
                const bottom = scrollY + innerHeight
                itemMotions.forEach((item) => {
                    const progress = smooth((bottom - item.top) / Math.max(1, innerHeight * 0.3))
                    item.offset = 12 * (1 - progress)
                    item.animation.currentTime = progress * DURATION
                })
            }
        }

        function schedule() {
            if (!disposed && !document.hidden && frame === 0) {
                frame = requestAnimationFrame(render)
            }
        }

        function scheduleMeasure() {
            needsMeasure = true
            schedule()
        }

        function onVisibility() {
            if (document.hidden) {
                cancelAnimationFrame(frame)
                frame = 0
            } else {
                scheduleMeasure()
            }
        }

        const resize = new ResizeObserver(scheduleMeasure)
        resize.observe(story)
        chapters.forEach((chapter) => resize.observe(chapter))

        if (hero) {
            resize.observe(hero)
        }

        addEventListener('scroll', schedule, { passive: true })
        addEventListener('resize', scheduleMeasure, { passive: true })
        desktop.addEventListener('change', scheduleMeasure)
        reduced.addEventListener('change', scheduleMeasure)
        document.addEventListener('visibilitychange', onVisibility)
        void document.fonts.ready.then(scheduleMeasure)
        schedule()

        return () => {
            disposed = true
            cancelAnimationFrame(frame)
            resize.disconnect()
            removeEventListener('scroll', schedule)
            removeEventListener('resize', scheduleMeasure)
            desktop.removeEventListener('change', scheduleMeasure)
            reduced.removeEventListener('change', scheduleMeasure)
            document.removeEventListener('visibilitychange', onVisibility)
            resetMotion()
        }
    }, [])

    return null
}

'use client'

import { useEffect } from 'react'

const DURATION = 1000

type SectionMotion = {
    animations: Animation[]
    element: HTMLElement
    height: number
    top: number
}

function pieceFrames(kind: string | null, index: number): Keyframe[] {
    if (kind === 'receipt') {
        const direction = index % 2 === 0 ? -1 : 1

        return [
            { translate: `${direction * 18}px ${16 + (index % 3) * 4}px`, rotate: `${direction * 2}deg` },
            { translate: '0px 0px', rotate: '0deg', offset: 0.6 },
            { translate: '0px 0px', rotate: '0deg' },
        ]
    }

    if (kind === 'reserve') {
        return [
            { translate: `${2 - (index % 3) * 0.3}% 0px` },
            { translate: '0px 0px', offset: 0.65 },
            { translate: '0px 0px' },
        ]
    }

    if (kind === 'chart') {
        return [{ translate: '0px 12px' }, { translate: '0px -12px' }]
    }

    return [
        { translate: '0px 24px' },
        { translate: '0px 0px', offset: 0.6 },
        { translate: '0px -8px' },
    ]
}

// Progressive enhancement of four independent sections in normal document flow. Only product
// pieces move: there is no shared scene, pin, text reveal or change to the figures in the demos.
export function ProductMotion() {
    useEffect(() => {
        const root = document.querySelector<HTMLElement>('.ft-landing')

        if (
            !root ||
            typeof Element.prototype.animate !== 'function' ||
            typeof ResizeObserver !== 'function' ||
            !CSS.supports('translate', '1px 1px') ||
            !CSS.supports('rotate', '1deg')
        ) {
            return
        }

        const sections = [...root.querySelectorAll<HTMLElement>('[data-product-section]')]

        if (sections.length === 0) {
            return
        }

        const reduced = matchMedia('(prefers-reduced-motion: reduce)')
        const motions: SectionMotion[] = []
        let active = false
        let disposed = false
        let failed = false
        let frame = 0
        let needsMeasure = true
        let viewportHeight = innerHeight

        function reset() {
            motions.forEach((section) => section.animations.forEach((animation) => animation.cancel()))
            motions.length = 0
            active = false
        }

        function prepare() {
            sections.forEach((element) => {
                const visual = element.querySelector<HTMLElement>('[data-product-visual]')

                if (!visual) {
                    return
                }

                const motion: SectionMotion = { animations: [], element, height: 1, top: 0 }
                motions.push(motion)

                // A piece's individual translate/rotate compose with any authored CSS transform.
                // Do not animate the visual as well: that would double each piece's displacement.
                const pieces = [...visual.querySelectorAll<HTMLElement>('[data-product-piece]')]

                if (pieces.length === 0 && visual.matches('[data-product-piece]')) {
                    pieces.push(visual)
                }

                pieces.forEach((piece, index) => {
                    const animation = piece.animate(pieceFrames(piece.getAttribute('data-product-piece'), index), {
                        duration: DURATION,
                        easing: 'linear',
                        fill: 'both',
                    })

                    // Register before touching timing so a partial setup can always be cancelled.
                    motion.animations.push(animation)
                    animation.pause()
                    animation.currentTime = 0
                })
            })
            active = true
        }

        function measure() {
            viewportHeight = innerHeight
            const y = scrollY

            // Sections themselves never transform, so their cached geometry does not include
            // the offsets currently applied to their child pieces. Batch reads before writes.
            motions.forEach((motion) => {
                const rect = motion.element.getBoundingClientRect()
                motion.top = rect.top + y
                motion.height = Math.max(1, rect.height)
            })
            needsMeasure = false
        }

        function render() {
            frame = 0

            if (disposed || failed || document.hidden) {
                return
            }

            if (reduced.matches) {
                reset()
                return
            }

            try {
                if (!active) {
                    prepare()
                    needsMeasure = true
                }

                if (needsMeasure) {
                    measure()
                }

                const y = scrollY

                motions.forEach((motion) => {
                    // Entry at the lower viewport, settlement near the section center, then a
                    // restrained departure. No accumulated delta, clock or direction-dependent state.
                    const start = motion.top - viewportHeight * 0.85
                    const distance = Math.max(1, motion.height + viewportHeight * 0.6)
                    const progress = Math.max(0, Math.min(1, (y - start) / distance))

                    motion.animations.forEach((animation) => { animation.currentTime = progress * DURATION })
                })
            } catch {
                // An unsupported animation cannot make the public content disappear or block use.
                failed = true
                reset()
            }
        }

        function schedule() {
            if (!disposed && !failed && !document.hidden && frame === 0) {
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
        resize.observe(root)
        sections.forEach((section) => resize.observe(section))
        addEventListener('scroll', schedule, { passive: true })
        addEventListener('resize', scheduleMeasure, { passive: true })
        addEventListener('pageshow', scheduleMeasure)
        reduced.addEventListener('change', scheduleMeasure)
        document.addEventListener('visibilitychange', onVisibility)
        void document.fonts.ready.then(scheduleMeasure)
        // Synchronize directly with restored scroll in the setup turn, without an animated catch-up.
        render()

        return () => {
            disposed = true
            cancelAnimationFrame(frame)
            resize.disconnect()
            removeEventListener('scroll', schedule)
            removeEventListener('resize', scheduleMeasure)
            removeEventListener('pageshow', scheduleMeasure)
            reduced.removeEventListener('change', scheduleMeasure)
            document.removeEventListener('visibilitychange', onVisibility)
            reset()
        }
    }, [])

    return null
}

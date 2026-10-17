import type { CSSProperties } from 'react'

import './hero-scene.css'

// Escena del hero: la idea de la referencia SkyElite (objeto oscuro y mate que avanza entre nubes con
// un brillo cálido) traducida a FinTrack OS. En lugar del avión, tres barras ascendentes y una estela
// de luz con el degradado de marca que sube como una flecha. Solo SVG y CSS: sin video, canvas ni
// dependencias. Decorativa (aria-hidden); con movimiento reducido queda quieta.

type Cloud = { left: string; top: string; scale: number; seed: 'a' | 'b'; drift: 'slow' | 'mid' | 'fast'; delay?: string }

// Nubes detrás del objeto (lejanas) y delante de su base (cercanas), como en la referencia.
const BACK_CLOUDS: Cloud[] = [
    { left: '-6%', top: '3%', scale: 0.45, seed: 'a', drift: 'slow' },
    { left: '84%', top: '1%', scale: 0.4, seed: 'b', drift: 'slow', delay: '-9s' },
    { left: '-2%', top: '52%', scale: 0.9, seed: 'b', drift: 'mid' },
    { left: '70%', top: '48%', scale: 0.95, seed: 'a', drift: 'mid', delay: '-6s' },
]

const FRONT_CLOUDS: Cloud[] = [
    { left: '-16%', top: '79%', scale: 1.45, seed: 'a', drift: 'fast' },
    { left: '24%', top: '82%', scale: 1.6, seed: 'b', drift: 'fast', delay: '-7s' },
    { left: '64%', top: '78%', scale: 1.45, seed: 'a', drift: 'fast', delay: '-3s' },
]

function CloudPuff({ cloud }: { cloud: Cloud }) {
    const style = { left: cloud.left, top: cloud.top, '--cloud-scale': cloud.scale, animationDelay: cloud.delay } as CSSProperties

    return (
        <div className={`ft-cloud ft-drift-${cloud.drift}`} style={style}>
            <span className={`ft-cloud-back ft-cloud-${cloud.seed}`} />
            <span className={`ft-cloud-mid ft-cloud-${cloud.seed}`} />
            <span className={`ft-cloud-front ft-cloud-${cloud.seed}`} />
        </div>
    )
}

// Barra en perspectiva oblicua: cara frontal, lateral derecha y superior.
const DEPTH_X = 46
const DEPTH_Y = -28
const BASE_Y = 620
const BAR_WIDTH = 124
const BARS = [
    { x: 352, height: 210 },
    { x: 536, height: 330 },
    { x: 720, height: 460 },
]

function Bar({ x, height, index }: { height: number; index: number; x: number }) {
    const top = BASE_Y - height
    const right = x + BAR_WIDTH

    return (
        <g>
            <polygon points={`${right},${top} ${right + DEPTH_X},${top + DEPTH_Y} ${right + DEPTH_X},${BASE_Y + DEPTH_Y} ${right},${BASE_Y}`} fill="url(#ft-bar-side)" />
            <rect x={x} y={top} width={BAR_WIDTH} height={height} fill="url(#ft-bar-front)" />
            {/* Reflejo del degradado de la estela sobre la cara frontal, más intenso en la barra más alta. */}
            <rect x={x} y={top} width={BAR_WIDTH} height={height} fill="url(#ft-bar-glow)" opacity={0.18 + index * 0.12} />
            <polygon points={`${x},${top} ${x + DEPTH_X},${top + DEPTH_Y} ${right + DEPTH_X},${top + DEPTH_Y} ${right},${top}`} fill="url(#ft-bar-top)" />
            {/* Brillo vertical: sugiere un acabado mate satinado, como el fuselaje de la referencia. */}
            <rect x={x + 10} y={top + 6} width="10" height={height - 12} fill="#ffffff" opacity="0.06" />
            <line x1={x} y1={top} x2={right} y2={top} stroke="#ffffff" strokeOpacity="0.28" strokeWidth="1.5" />
            <line x1={right} y1={top} x2={right + DEPTH_X} y2={top + DEPTH_Y} stroke="#ffffff" strokeOpacity="0.16" strokeWidth="1.2" />
        </g>
    )
}

// Estela: curva que nace abajo a la izquierda, cruza delante de las barras y sube hacia la derecha.
const TRAIL = 'M 110 660 C 380 620, 650 470, 975 118'
const ARROW_HEAD = 'M 968 170 L 975 118 L 924 129'

export function HeroScene() {
    return (
        <div aria-hidden="true" className="ft-hero-scene">
            <svg className="ft-cloud-filters" width="0" height="0" focusable="false">
                <filter id="ft-cloud-back-a"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="4" seed="4" /><feDisplacementMap in="SourceGraphic" scale="170" /></filter>
                <filter id="ft-cloud-mid-a"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="4" /><feDisplacementMap in="SourceGraphic" scale="150" /></filter>
                <filter id="ft-cloud-front-a"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="4" /><feDisplacementMap in="SourceGraphic" scale="100" /></filter>
                <filter id="ft-cloud-back-b"><feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="4" seed="11" /><feDisplacementMap in="SourceGraphic" scale="170" /></filter>
                <filter id="ft-cloud-mid-b"><feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="2" seed="11" /><feDisplacementMap in="SourceGraphic" scale="150" /></filter>
                <filter id="ft-cloud-front-b"><feTurbulence type="fractalNoise" baseFrequency="0.013" numOctaves="2" seed="11" /><feDisplacementMap in="SourceGraphic" scale="100" /></filter>
            </svg>

            <div className="ft-sky" />
            <div className="ft-sky-glow" />
            {BACK_CLOUDS.map((cloud) => <CloudPuff key={`${cloud.left}-${cloud.top}`} cloud={cloud} />)}

            <div className="ft-hero-object">
                <svg viewBox="0 0 1200 680" preserveAspectRatio="xMidYMax meet" className="ft-hero-object-svg">
                    <defs>
                        <linearGradient id="ft-bar-front" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0" stopColor="#2c3445" />
                            <stop offset="0.55" stopColor="#1a2130" />
                            <stop offset="1" stopColor="#10151f" />
                        </linearGradient>
                        <linearGradient id="ft-bar-side" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0" stopColor="#141a25" />
                            <stop offset="1" stopColor="#0a0e15" />
                        </linearGradient>
                        <linearGradient id="ft-bar-top" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0" stopColor="#4a5469" />
                            <stop offset="1" stopColor="#323b4d" />
                        </linearGradient>
                        <linearGradient id="ft-bar-glow" x1="0" y1="1" x2="1" y2="0">
                            <stop offset="0" stopColor="#8c7cff" stopOpacity="0" />
                            <stop offset="0.6" stopColor="#cc63c5" stopOpacity="0.55" />
                            <stop offset="1" stopColor="#e5665f" stopOpacity="0.9" />
                        </linearGradient>
                        <linearGradient id="ft-trail" gradientUnits="userSpaceOnUse" x1="110" y1="660" x2="975" y2="118">
                            <stop offset="0" stopColor="#5b89ff" stopOpacity="0" />
                            <stop offset="0.18" stopColor="#5b89ff" />
                            <stop offset="0.5" stopColor="#8c7cff" />
                            <stop offset="0.78" stopColor="#cc63c5" />
                            <stop offset="1" stopColor="#e5665f" />
                        </linearGradient>
                        <radialGradient id="ft-tip-glow">
                            <stop offset="0" stopColor="#fff4ec" />
                            <stop offset="0.35" stopColor="#ff9b7a" stopOpacity="0.85" />
                            <stop offset="1" stopColor="#e5665f" stopOpacity="0" />
                        </radialGradient>
                        <filter id="ft-soft-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14" /></filter>
                        <filter id="ft-shadow-blur" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="18" /></filter>
                    </defs>

                    <g className="ft-hero-float">
                        <ellipse cx="600" cy="628" rx="340" ry="26" fill="#3f4a60" opacity="0.22" filter="url(#ft-shadow-blur)" />
                        {BARS.map((bar, index) => <Bar key={bar.x} index={index} {...bar} />)}

                        <path d={TRAIL} fill="none" stroke="url(#ft-trail)" strokeWidth="30" strokeLinecap="round" opacity="0.5" filter="url(#ft-soft-blur)" />
                        <path d={TRAIL} fill="none" stroke="url(#ft-trail)" strokeWidth="9" strokeLinecap="round" />
                        <path d={TRAIL} fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
                        <path d={TRAIL} pathLength={100} className="ft-trail-pulse" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
                        <path d={ARROW_HEAD} fill="none" stroke="#e5665f" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="975" cy="118" r="60" fill="url(#ft-tip-glow)" className="ft-tip-glow" />
                    </g>
                </svg>
            </div>

            {FRONT_CLOUDS.map((cloud) => <CloudPuff key={`${cloud.left}-${cloud.top}`} cloud={cloud} />)}
        </div>
    )
}

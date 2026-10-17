import Image from 'next/image'
import Link from 'next/link'

import symbol from '@/shared/brand/fintrack-os-symbol.png'
import { cn } from '@/shared/lib/utils'

// Variantes de la marca (DESIGN.md → Logo):
// - `full`: símbolo + nombre «FinTrack OS» como texto real (cabeceras, auth, sidebar).
// - `compact`: solo el símbolo, para espacios reducidos. Es el valor por defecto, que conserva el
//   comportamiento anterior del componente (una imagen) para sus consumidores.
export type BrandLogoVariant = 'full' | 'compact'
export type BrandLogoSize = 'sm' | 'md' | 'lg'

// Mínimos: símbolo de 24px de alto; con nombre, 28px. La separación mínima alrededor es el 25 %
// del alto del símbolo (`gap` y relleno del enlace lo respetan).
const SYMBOL_HEIGHT: Record<BrandLogoSize, number> = { sm: 28, md: 36, lg: 44 }
const WORDMARK_CLASS: Record<BrandLogoSize, string> = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-[22px]',
}
const SYMBOL_RATIO = symbol.width / symbol.height

type BrandLogoProps = {
    className?: string
    /** Si se indica, el logo es un enlace a ese destino con foco visible y objetivo táctil de 44px. */
    href?: string
    /** Alto del símbolo en px; sustituye al de `size`. */
    height?: number
    priority?: boolean
    size?: BrandLogoSize
    variant?: BrandLogoVariant
    /** Ancho del símbolo en px; por defecto sale del alto y conserva la proporción oficial. */
    width?: number
}

export function BrandLogo({
    className,
    height,
    href,
    priority = false,
    size = 'md',
    variant = 'compact',
    width,
}: BrandLogoProps) {
    const symbolHeight = height ?? SYMBOL_HEIGHT[size]
    const symbolWidth = width ?? Math.round(symbolHeight * SYMBOL_RATIO)
    const full = variant === 'full'

    const content = (
        <>
            {/* En `full` el nombre ya es texto visible: la imagen es decorativa y no duplica el nombre accesible. */}
            <Image
                src={symbol}
                alt={full ? '' : 'FinTrack OS'}
                width={symbolWidth}
                height={symbolHeight}
                priority={priority}
                sizes={`${symbolWidth}px`}
                style={{ width: symbolWidth, height: symbolHeight }}
                className="flex-none"
            />
            {full ? (
                <span className={cn('font-bold leading-none tracking-[-0.02em] whitespace-nowrap', WORDMARK_CLASS[size])}>
                    FinTrack OS
                </span>
            ) : null}
        </>
    )

    if (!href) {
        return <span className={cn('inline-flex items-center gap-2.5 text-foreground', className)}>{content}</span>
    }

    return (
        <Link
            href={href}
            className={cn(
                'inline-flex min-h-11 min-w-11 items-center gap-2.5 rounded-lg px-1.5 py-1 text-foreground focus-ring',
                className,
            )}
        >
            {content}
        </Link>
    )
}

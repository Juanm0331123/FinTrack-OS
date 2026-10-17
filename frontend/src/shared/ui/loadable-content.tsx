import { LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'

// Contenido de un botón que admite `loading` (Button y FtButton). Dos capas ocupan la misma celda de
// una rejilla, así que el botón mide lo mismo en reposo y en carga, con o sin icono inicial y aunque
// la etiqueta cambie («Copiar mes anterior» → «Copiando…»): la celda toma el ancho de la mayor.
// Solo la capa activa es visible y accesible; la otra conserva su espacio con `invisible` y aria-hidden.
// En carga, el indicador ocupa el lugar del icono inicial (`data-icon="inline-start"`).
export function LoadableContent({
    children,
    loading,
    loadingLabel,
}: {
    children: ReactNode
    loading: boolean
    /** Etiqueta progresiva durante la carga; por defecto, la misma etiqueta. */
    loadingLabel?: ReactNode
}) {
    return (
        <span className="inline-grid gap-[inherit]">
            <span
                aria-hidden={loading || undefined}
                className={cn(
                    'col-start-1 row-start-1 inline-flex items-center justify-center gap-[inherit]',
                    loading && 'invisible',
                )}
            >
                {children}
            </span>
            <span
                aria-hidden={!loading || undefined}
                className={cn(
                    'col-start-1 row-start-1 inline-flex items-center justify-center gap-[inherit] [&>svg[data-icon=inline-start]]:hidden',
                    !loading && 'invisible',
                )}
            >
                <LoaderCircle className="animate-spin motion-reduce:animate-none" />
                {loadingLabel ?? children}
            </span>
        </span>
    )
}

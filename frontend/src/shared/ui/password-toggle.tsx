import { Eye, EyeOff } from 'lucide-react'

// Botón «Mostrar/Ocultar contraseña» dentro de un campo público (el campo lleva `pr-12`). Ocupa todo el
// alto del campo a la derecha, sin desplazamientos al pulsar ni bloque de fondo: solo cambia la tinta del
// icono. El foco se dibuja por dentro del campo, siguiendo su esquina redondeada. 44×44 en todos los anchos.
export function PasswordToggle({
    hideLabel,
    onToggle,
    showLabel,
    visible,
}: {
    hideLabel: string
    onToggle: () => void
    showLabel: string
    visible: boolean
}) {
    const Icon = visible ? EyeOff : Eye

    return (
        <button
            type="button"
            aria-label={visible ? hideLabel : showLabel}
            onClick={onToggle}
            className="absolute inset-y-0 right-0 grid w-11 cursor-pointer place-items-center rounded-r-lg text-muted-foreground transition-colors duration-150 focus-ring-inset hover:text-foreground"
        >
            <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden="true" />
        </button>
    )
}

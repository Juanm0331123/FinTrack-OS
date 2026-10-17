import { createElement, type ComponentType, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { FtButton } from '@/modules/finance/ui/button'
import { Button } from './button'

// Contrato de los botones públicos y del espacio de trabajo durante una acción en curso: no admiten
// un segundo envío, lo anuncian a tecnologías de apoyo y conservan su etiqueta como nombre.
// El entorno de Vitest es node (sin DOM): se inspecciona el HTML estático del botón.
const buttons: ReadonlyArray<[string, ComponentType<Record<string, unknown>>]> = [
    ['Button', Button as ComponentType<Record<string, unknown>>],
    ['FtButton', FtButton as ComponentType<Record<string, unknown>>],
]

// Quita los subárboles aria-hidden (no forman parte del nombre accesible) sin depender de un DOM.
function withoutHiddenSubtrees(html: string) {
    let result = html

    for (let previous = ''; previous !== result; ) {
        previous = result
        result = result.replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>(?:(?!<\1[\s>])[\s\S])*?<\/\1>/, '')
    }

    return result
}

function render(component: ComponentType<Record<string, unknown>>, props: Record<string, unknown>, children: ReactNode = 'Guardar') {
    const html = renderToStaticMarkup(createElement(component, props, children))
    const openingTag = html.match(/^<button[^>]*>/)?.[0] ?? ''
    // Los valores van entre comillas, así que `disabled:` dentro de class no se confunde con el atributo.
    const attributes = new Map(
        Array.from(openingTag.matchAll(/\s([\w-]+)(?:="([^"]*)")?/g), ([, name, value]) => [name, value ?? ''] as const),
    )

    return {
        attribute: (name: string) => attributes.get(name) ?? null,
        hasDecorativeIcon: /<svg[^>]*aria-hidden="true"/.test(html),
        hasIcon: html.includes('<svg'),
        html,
        // Texto que compone el nombre accesible.
        name: withoutHiddenSubtrees(html).replace(/<[^>]+>/g, ''),
    }
}

describe.each(buttons)('%s', (_name, component) => {
    it('deshabilita y anuncia aria-busy mientras carga, sin perder la etiqueta', () => {
        const button = render(component, { loading: true })

        expect(button.attribute('disabled')).not.toBeNull()
        expect(button.attribute('aria-busy')).toBe('true')
        expect(button.name).toBe('Guardar')
        expect(button.hasDecorativeIcon).toBe(true)
    })

    it('sin carga queda activo y sin aria-busy', () => {
        const button = render(component, {})

        expect(button.attribute('disabled')).toBeNull()
        expect(button.attribute('aria-busy')).toBeNull()
        expect(button.hasIcon).toBe(false)
    })

    it('deshabilitado sin carga no se anuncia ocupado', () => {
        const button = render(component, { disabled: true })

        expect(button.attribute('disabled')).not.toBeNull()
        expect(button.attribute('aria-busy')).toBeNull()
    })

    it('con etiqueta progresiva anuncia esa etiqueta solo mientras carga', () => {
        const loading = render(component, { loading: true, loadingLabel: 'Copiando…' }, 'Copiar mes anterior')
        const idle = render(component, { loading: false, loadingLabel: 'Copiando…' }, 'Copiar mes anterior')

        expect(loading.name).toBe('Copiando…')
        expect(idle.name).toBe('Copiar mes anterior')
        expect(idle.attribute('aria-busy')).toBeNull()
    })

    it('con asChild entrega disabled al botón nativo hijo', () => {
        const button = render(component, { asChild: true, disabled: true }, createElement('button', { type: 'submit' }, 'Guardar'))

        expect(button.attribute('disabled')).not.toBeNull()
        expect(button.attribute('type')).toBe('submit')
    })

    it('con asChild y sin disabled el botón hijo queda activo', () => {
        const button = render(component, { asChild: true }, createElement('button', { type: 'button' }, 'Guardar'))

        expect(button.attribute('disabled')).toBeNull()
    })
})

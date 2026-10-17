import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/shared/config/site'

// Datos estructurados (schema.org) con información real y verificable de la landing: nombre,
// descripción, idioma y categoría. Sin precios, calificaciones, organización legal ni dominio
// inventado: la URL solo aparece cuando NEXT_PUBLIC_SITE_URL está definida.
const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    browserRequirements: 'Requiere un navegador moderno con JavaScript.',
    inLanguage: 'es-CO',
    ...(SITE_URL ? { url: `${SITE_URL}/` } : {}),
}

export function LandingStructuredData() {
    return (
        <script
            type="application/ld+json"
            // Contenido estático propio, serializado sin datos de usuario; `<` se escapa por seguridad.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }}
        />
    )
}

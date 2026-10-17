import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/shared/config/site'

// Un sitemap exige URLs absolutas del dominio real: sin NEXT_PUBLIC_SITE_URL queda vacío en lugar
// de anunciar localhost. Las páginas legales se añadirán cuando existan y estén aprobadas.
export default function sitemap(): MetadataRoute.Sitemap {
    if (!SITE_URL) {
        return []
    }

    return [
        { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
        { url: `${SITE_URL}/register`, changeFrequency: 'yearly', priority: 0.5 },
        { url: `${SITE_URL}/login`, changeFrequency: 'yearly', priority: 0.3 },
    ]
}

import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/shared/config/site'

// El espacio de trabajo y el callback OAuth no son contenido indexable. El sitemap se anuncia solo
// con el dominio final definido (NEXT_PUBLIC_SITE_URL).
export default function robots(): MetadataRoute.Robots {
    return {
        rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/auth/'] },
        ...(SITE_URL ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
    }
}

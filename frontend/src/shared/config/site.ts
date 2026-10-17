// Dominio público final del frontend (NEXT_PUBLIC_SITE_URL, sin ruta ni barra final). Mientras no
// esté definido, las URLs absolutas (canonical, sitemap, og:image, datos estructurados) se omiten o
// Next las resuelve contra localhost: nunca se inventa un dominio. Ver frontend/.env.example.
const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

export const SITE_URL = rawSiteUrl ? rawSiteUrl.replace(/\/+$/, '') : null

export const SITE_NAME = 'FinTrack OS'

export const SITE_DESCRIPTION =
    'FinTrack OS es una app de finanzas personales para registrar tus ingresos y gastos, organizar tu mes y revisar tus deudas. Gratis por ahora.'

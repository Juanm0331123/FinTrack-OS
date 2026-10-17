import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/shared/config/site'
import { TooltipProvider } from '@/shared/ui/tooltip'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

// SITE_URL (NEXT_PUBLIC_SITE_URL) vuelve absolutas las URLs de la imagen para compartir
// (`opengraph-image`). Sin ella Next las resuelve contra localhost: define la variable en el
// despliegue. Ver frontend/.env.example.
export const metadata: Metadata = {
    ...(SITE_URL ? { metadataBase: new URL(SITE_URL) } : {}),
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    applicationName: SITE_NAME,
    openGraph: {
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
        siteName: SITE_NAME,
        locale: 'es_CO',
        type: 'website',
    },
    twitter: {
        card: 'summary_large_image',
        title: SITE_NAME,
        description: SITE_DESCRIPTION,
    },
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="es-CO"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <TooltipProvider>{children}</TooltipProvider>
            </body>
        </html>
    )
}

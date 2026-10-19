import { NextResponse, type NextRequest } from 'next/server'

import { buildUpstreamHeaders, clientIpFrom, upstreamUrl } from '@/shared/lib/edge-proxy'

// Rewrite de /api/* hacia el segundo proyecto de Vercel (raíz backend/). El navegador solo habla con el dominio del
// frontend, así la cookie de refresh es first-party. El proxy añade el secreto compartido que el
// backend exige (EDGE_PROXY_SECRET) y la IP real del visitante; sin él, el backend rechaza el
// tráfico que llega directo al dominio público del backend. Sin BACKEND_ORIGIN (desarrollo local con el backend en
// otro puerto) el proxy no interviene.
export function proxy(request: NextRequest) {
    const backendOrigin = process.env.BACKEND_ORIGIN
    const secret = process.env.EDGE_PROXY_SECRET

    if (!backendOrigin) {
        return NextResponse.next()
    }

    const isVercel = process.env.VERCEL === '1'
    const clientIp = clientIpFrom(request.headers, isVercel)

    if (!secret || (isVercel && !clientIp)) {
        return NextResponse.json(
            { code: 'EDGE_PROXY_MISCONFIGURED', message: 'El servicio no está disponible.', success: false },
            { headers: { 'Cache-Control': 'no-store' }, status: 503 },
        )
    }

    return NextResponse.rewrite(upstreamUrl(backendOrigin, request.nextUrl.pathname, request.nextUrl.search), {
        request: { headers: buildUpstreamHeaders(request.headers, { clientIp, secret }) },
    })
}

export const config = {
    matcher: '/api/:path*',
}

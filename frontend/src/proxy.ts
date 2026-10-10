import { NextResponse, type NextRequest } from 'next/server'

import { buildUpstreamHeaders, clientIpFrom, upstreamUrl } from '@/shared/lib/edge-proxy'

// Rewrite de /api/* hacia el backend (Cloud Run). El navegador solo habla con el dominio del
// frontend, así la cookie de refresh es first-party. El proxy añade el secreto compartido que el
// backend exige (EDGE_PROXY_SECRET) y la IP real del visitante; sin él, el backend rechaza el
// tráfico que llega directo a run.app. Sin BACKEND_ORIGIN (desarrollo local con el backend en
// otro puerto) el proxy no interviene.
export function proxy(request: NextRequest) {
    const backendOrigin = process.env.BACKEND_ORIGIN
    const secret = process.env.EDGE_PROXY_SECRET

    if (!backendOrigin) {
        return NextResponse.next()
    }

    if (!secret) {
        return NextResponse.json(
            { code: 'EDGE_PROXY_MISCONFIGURED', message: 'El servicio no está disponible.', success: false },
            { status: 503 },
        )
    }

    return NextResponse.rewrite(upstreamUrl(backendOrigin, request.nextUrl.pathname, request.nextUrl.search), {
        request: { headers: buildUpstreamHeaders(request.headers, { clientIp: clientIpFrom(request.headers), secret }) },
    })
}

export const config = {
    matcher: '/api/:path*',
}

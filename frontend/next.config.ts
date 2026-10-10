import type { NextConfig } from "next";

// Cabeceras del HTML (la API ya envía las suyas con Helmet). Son compatibles con Next, las imágenes
// de Cloudinary y el inicio de OAuth por enlace: no restringen scripts ni imágenes. Una CSP de
// scripts exigiría nonces por petición y queda como decisión aparte (docs/qa-frontend-remediacion.md).
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    // /api/* lo reescribe el proxy al backend, que ya fija sus propias cabeceras.
    return [{ source: "/((?!api/).*)", headers: securityHeaders }];
  },
};

export default nextConfig;

// Copy público aprobado por el Project Owner (docs/landing-content.md, 2026-10-12). Cambiar una
// afirmación de producto requiere su aprobación; aquí solo vive el texto, no la presentación.

export const SUPPORT_EMAIL = 'fintrackos.auth@gmail.com'

export const LANDING_ANCHORS = {
    annualSummary: 'resumen-anual',
    access: 'acceso',
    debtPlan: 'plan-de-deudas',
    faq: 'preguntas',
    finalCta: 'empezar',
    hero: 'inicio',
    howItWorks: 'como-funciona',
    main: 'main',
    monthSheet: 'hoja-del-mes',
    pockets: 'bolsillos',
} as const

export const NAV_LINKS = [
    { href: `#${LANDING_ANCHORS.monthSheet}`, label: 'Producto' },
    { href: `#${LANDING_ANCHORS.howItWorks}`, label: 'Cómo funciona' },
    { href: `#${LANDING_ANCHORS.faq}`, label: 'Preguntas' },
] as const

export const HOW_IT_WORKS_STEPS = [
    {
        title: 'Crea tu cuenta.',
        body: 'Regístrate con tu correo y completa la verificación. También puedes usar un proveedor de inicio de sesión si está habilitado.',
    },
    {
        title: 'Prepara tu mes.',
        body: 'Configura tus cuentas y tu colchón mínimo. Crea la hoja del mes e ingresa tus ingresos y gastos previstos.',
    },
    {
        title: 'Registra y revisa.',
        body: 'Marca los pagos, agrega los consumos de tus bolsillos y consulta tus totales. Para el siguiente mes, puedes copiar las filas del anterior y actualizarlas.',
    },
] as const

export type FaqItem = {
    question: string
    /** La respuesta de soporte enlaza el correo; el resto es texto plano. */
    answer: string
    mentionsSupportEmail?: boolean
}

export const FAQ_ITEMS: readonly FaqItem[] = [
    {
        question: '¿FinTrack OS se conecta a mis bancos?',
        answer: 'No. Registras tus datos manualmente. Las cuentas sirven para organizar tus registros; FinTrack OS no consulta movimientos bancarios ni ejecuta pagos.',
    },
    {
        question: '¿Para quién está pensado?',
        answer: 'Para personas que quieren organizar sus finanzas personales por mes: ingresos, gastos, bolsillos y deudas. Si hoy llevas ese seguimiento en una hoja de cálculo, encontrarás una estructura familiar.',
    },
    {
        question: '¿Qué es un bolsillo?',
        answer: 'Es un presupuesto para un gasto variable. Puedes registrar los consumos dentro del bolsillo y ver cuánto has usado y cuánto queda. El presupuesto ya se cuenta en los gastos del mes.',
    },
    {
        question: '¿Qué significa el colchón mínimo?',
        answer: 'Es el disponible que te propones conservar al final de tu presupuesto mensual. Lo defines en Configuración y la app compara ese objetivo con el disponible calculado. No es una cuenta ni dinero reservado automáticamente.',
    },
    {
        question: '¿El plan de deudas hace los pagos por mí?',
        answer: 'No. Calcula recomendaciones según tus saldos, tasas, cuotas, estrategia y mes registrado. Mantén esos datos al día y revisa tus extractos; los pagos los realizas por tus canales habituales.',
    },
    {
        question: '¿Puedo reutilizar el mes anterior?',
        answer: 'Sí. Puedes copiar sus filas al mes elegido. Los pagos quedan pendientes y los bolsillos empiezan sin consumos. Las filas que ya tienes en el mes de destino se conservan.',
    },
    {
        question: '¿Puedo importar o descargar un archivo de Excel?',
        answer: 'La aplicación no ofrece actualmente importación ni exportación de archivos Excel para usuarios. El registro se realiza dentro de FinTrack OS.',
    },
    {
        question: '¿Cuánto cuesta?',
        answer: 'Es gratis por ahora. Está prevista una posible evolución a planes de pago, pero todavía no están definidos sus precios ni su fecha.',
    },
    {
        question: '¿Qué pasa si un cambio no se guarda?',
        answer: 'La app muestra el estado de guardado y el motivo del error cuando está disponible. Si quedan cambios fallidos, puedes reintentarlos o descartarlos. Revisa la confirmación de guardado antes de cerrar; esto no supone funcionamiento sin conexión.',
    },
    {
        question: '¿En qué moneda registro los montos?',
        answer: 'La interfaz actual está preparada para pesos colombianos: ingresas montos en pesos enteros. Los cálculos pueden conservar centavos; el formato que ves no modifica esa precisión.',
    },
    {
        question: '¿Cómo contacto a soporte o hago una solicitud sobre mis datos?',
        answer: 'No envíes contraseñas ni códigos de verificación.',
        mentionsSupportEmail: true,
    },
]

export const FOOTER_PRODUCT_LINKS = [
    { href: `#${LANDING_ANCHORS.monthSheet}`, label: 'Hoja del mes' },
    { href: `#${LANDING_ANCHORS.pockets}`, label: 'Bolsillos' },
    { href: `#${LANDING_ANCHORS.debtPlan}`, label: 'Plan de deudas' },
    { href: `#${LANDING_ANCHORS.annualSummary}`, label: 'Resumen anual' },
    { href: `#${LANDING_ANCHORS.howItWorks}`, label: 'Cómo funciona' },
] as const

// Privacidad y Términos (`/privacidad`, `/terminos`) no se enlazan: sus textos siguen en borrador
// (docs/landing-contenido-legal.md) y las rutas no existen. Se añaden al footer al aprobarlos.

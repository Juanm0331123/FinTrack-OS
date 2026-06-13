import {
    CreditCard,
    HandCoins,
    LayoutDashboard,
    PiggyBank,
    ReceiptText,
    Settings,
    TrendingUp,
} from 'lucide-react'

export const dashboardUser = {
    name: 'Juan Medina',
    email: 'juan.medina@example.com',
}

export const dashboardNavigation = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        current: true,
        available: true,
    },
    {
        label: 'Ingresos',
        icon: TrendingUp,
        current: false,
        available: false,
    },
    {
        label: 'Gastos',
        icon: ReceiptText,
        current: false,
        available: false,
    },
    {
        label: 'Deudas',
        icon: CreditCard,
        current: false,
        available: false,
    },
    {
        label: 'Ahorro',
        icon: PiggyBank,
        current: false,
        available: false,
    },
    {
        label: 'Ajustes',
        icon: Settings,
        current: false,
        available: false,
    },
] as const

export const dashboardMetrics = [
    {
        label: 'Ingresos del mes',
        value: '$4.850.000',
        detail: '2 ingresos registrados esta semana',
        tone: 'var(--chart-1)',
        icon: TrendingUp,
    },
    {
        label: 'Gastos acumulados',
        value: '$2.940.000',
        detail: '61% de tus ingresos actuales',
        tone: 'var(--chart-2)',
        icon: ReceiptText,
    },
    {
        label: 'Ahorro estimado',
        value: '$820.000',
        detail: 'Ya supera tu referencia del 20%',
        tone: 'var(--accent)',
        icon: PiggyBank,
    },
    {
        label: 'Pagos a deuda',
        value: '$640.000',
        detail: 'Tarjeta principal al dia',
        tone: 'var(--chart-3)',
        icon: HandCoins,
    },
] as const

export const monthlyAllocation = [
    {
        label: 'Necesidades',
        current: '52%',
        goal: 'Meta 50%',
        progress: 52,
        tone: 'var(--chart-2)',
    },
    {
        label: 'Deseos',
        current: '23%',
        goal: 'Meta 30%',
        progress: 23,
        tone: 'var(--brand-cyan)',
    },
    {
        label: 'Ahorro',
        current: '25%',
        goal: 'Meta 20%',
        progress: 25,
        tone: 'var(--chart-1)',
    },
] as const

export const recentActivity = [
    {
        title: 'Pago de tarjeta principal',
        detail: 'Hoy, 9:15 AM',
        amount: '-$320.000',
        tone: 'var(--chart-3)',
    },
    {
        title: 'Ingreso quincenal',
        detail: 'Ayer, 7:40 PM',
        amount: '+$2.100.000',
        tone: 'var(--chart-1)',
    },
    {
        title: 'Mercado del mes',
        detail: 'Ayer, 1:10 PM',
        amount: '-$184.000',
        tone: 'var(--chart-2)',
    },
    {
        title: 'Transferencia a ahorro',
        detail: 'Lunes, 6:22 PM',
        amount: '-$250.000',
        tone: 'var(--accent)',
    },
] as const

export const nextActions = [
    {
        title: 'Definir moneda principal',
        detail: 'Falta completar este dato para los reportes y metas.',
        emphasis: 'Pendiente',
    },
    {
        title: 'Registrar gastos recurrentes',
        detail: 'Te dara una lectura mas realista de tu cierre mensual.',
        emphasis: 'Siguiente paso',
    },
    {
        title: 'Crear meta de ahorro',
        detail: 'Activa comparacion entre lo recomendado y lo ejecutado.',
        emphasis: 'Recomendado',
    },
] as const

import { Suspense, type ReactNode } from 'react'

import { FinanceShell } from '@/modules/finance/shell/finance-shell'
import { ShellSkeleton } from '@/modules/finance/shell/shell-skeleton'

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <Suspense fallback={<ShellSkeleton />}>
            <FinanceShell>{children}</FinanceShell>
        </Suspense>
    )
}

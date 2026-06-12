import type { LucideIcon } from 'lucide-react'

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'

type HomeSummaryCardProps = {
    detail: string
    Icon: LucideIcon
    label: string
    tone: string
    value: string
}

export function HomeSummaryCard({
    detail,
    Icon,
    label,
    tone,
    value,
}: HomeSummaryCardProps) {
    return (
        <Card className="bg-card/90">
            <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
                <CardAction>
                    <div
                        className="grid size-9 place-items-center rounded-lg"
                        style={{
                            backgroundColor: `color-mix(in oklch, ${tone} 14%, transparent)`,
                            color: tone,
                        }}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent>
                <p className="finance-number text-2xl font-semibold tracking-[-0.01em]">
                    {value}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
            </CardContent>
        </Card>
    )
}

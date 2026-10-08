export function roundMoney(value: number) {
    return Math.round((value + Number.EPSILON) * 100) / 100
}

export function sumAmounts(entries: ReadonlyArray<{ amount: number | null }>) {
    let total = 0

    for (const entry of entries) {
        total += entry.amount ?? 0
    }

    return roundMoney(total)
}

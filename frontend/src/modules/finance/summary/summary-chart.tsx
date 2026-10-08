'use client'

import { useEffect, useRef, useState } from 'react'

import type { SummaryRow } from '../domain/annual-summary'
import { formatYearMonth, monthLabel, shortMonthLabel } from '../domain/year-month'
import { formatCompactMoney, formatMoney } from '../lib/format'

const MIN_WIDTH = 560
const HEIGHT = 300
const MARGIN = { bottom: 32, left: 56, right: 72, top: 28 }
const PLOT_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom
const BASELINE = MARGIN.top + PLOT_HEIGHT
const BAR_GAP = 2

function useChartWidth() {
    const ref = useRef<HTMLDivElement>(null)
    const [width, setWidth] = useState(720)

    useEffect(() => {
        const element = ref.current

        if (!element) {
            return
        }

        const observer = new ResizeObserver(([entry]) => {
            setWidth(Math.max(MIN_WIDTH, Math.round(entry.contentRect.width)))
        })

        observer.observe(element)

        return () => observer.disconnect()
    }, [])

    return { ref, width }
}

type Series = 'expenses' | 'income'

const SERIES: Record<Series, { color: string; label: string }> = {
    expenses: { color: 'var(--chart-expense)', label: 'Total gastos' },
    income: { color: 'var(--chart-income)', label: 'Ingreso neto' },
}

function niceStep(value: number) {
    if (value <= 0) {
        return 1
    }

    const exponent = Math.pow(10, Math.floor(Math.log10(value)))
    const fraction = value / exponent
    const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10

    return nice * exponent
}

function topRoundedBar(x: number, top: number, width: number) {
    const radius = Math.min(4, width / 2, Math.max(0, BASELINE - top))

    return [
        `M${x.toFixed(1)} ${BASELINE}`,
        `V${(top + radius).toFixed(1)}`,
        `Q${x.toFixed(1)} ${top.toFixed(1)} ${(x + radius).toFixed(1)} ${top.toFixed(1)}`,
        `H${(x + width - radius).toFixed(1)}`,
        `Q${(x + width).toFixed(1)} ${top.toFixed(1)} ${(x + width).toFixed(1)} ${(top + radius).toFixed(1)}`,
        `V${BASELINE}`,
        'Z',
    ].join(' ')
}

type Hovered = { series: Series; value: number; x: number; y: number; yearMonth: string }

export function SummaryChart({ cushion, rows, year }: { cushion: number; rows: readonly SummaryRow[]; year: number }) {
    const [hovered, setHovered] = useState<Hovered | null>(null)
    const { ref, width: WIDTH } = useChartWidth()
    const PLOT_WIDTH = WIDTH - MARGIN.left - MARGIN.right
    const GROUP_WIDTH = PLOT_WIDTH / 12
    const BAR_WIDTH = Math.min(22, (GROUP_WIDTH * 0.62 - BAR_GAP) / 2)
    const byMonth = new Map(rows.map((row) => [row.yearMonth, row]))
    const months = Array.from({ length: 12 }, (_, index) => formatYearMonth(year, index + 1))
    const maxValue = Math.max(cushion, ...rows.flatMap((row) => [row.netIncome, row.totalExpenses]), 1)
    const step = niceStep(maxValue / 4)
    const top = step * 4
    const scale = (value: number) => BASELINE - (Math.max(0, value) / top) * PLOT_HEIGHT
    const latest = rows.at(-1)?.yearMonth
    const cushionY = scale(cushion)

    useEffect(() => {
        const element = ref.current

        if (!element || element.scrollWidth <= element.clientWidth) {
            return
        }

        const latestIndex = latest ? Number(latest.slice(5)) - 1 : 11
        const groupWidth = (WIDTH - MARGIN.left - MARGIN.right) / 12

        element.scrollLeft = Math.max(0, MARGIN.left + (latestIndex + 1) * groupWidth + MARGIN.right - element.clientWidth)
    }, [WIDTH, latest, ref])

    return (
        <div ref={ref} className="overflow-x-auto">
            <div className="relative" style={{ width: WIDTH }}>
                <svg
                    width={WIDTH}
                    height={HEIGHT}
                    viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                    className="block"
                    role="group"
                    aria-label={`Ingreso neto y total de gastos por mes de ${year}. La tabla de abajo tiene las mismas cifras.`}
                    onMouseLeave={() => setHovered(null)}
                >
                    {[0, 1, 2, 3, 4].map((tick) => {
                        const value = step * tick
                        const y = scale(value)

                        return (
                            <g key={tick} aria-hidden="true">
                                <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} stroke="var(--ft-line-soft)" />
                                <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="var(--ft-ink-3)">
                                    {formatCompactMoney(value)}
                                </text>
                            </g>
                        )
                    })}

                    {cushion > 0 ? (
                        <g aria-hidden="true">
                            <line
                                x1={MARGIN.left}
                                x2={WIDTH - MARGIN.right}
                                y1={cushionY}
                                y2={cushionY}
                                stroke="var(--ft-ink-2)"
                                strokeDasharray="5 4"
                                strokeWidth="1.25"
                            />
                            <text x={WIDTH - MARGIN.right + 8} y={cushionY + 4} fontSize="11" fontWeight="600" fill="var(--ft-ink-2)">
                                Colchón
                            </text>
                        </g>
                    ) : null}

                    {months.map((yearMonth, index) => {
                        const row = byMonth.get(yearMonth)
                        const groupX = MARGIN.left + index * GROUP_WIDTH
                        const startX = groupX + (GROUP_WIDTH - (BAR_WIDTH * 2 + BAR_GAP)) / 2
                        const bars: Array<{ series: Series; value: number; x: number }> = row
                            ? [
                                  { series: 'income', value: row.netIncome, x: startX },
                                  { series: 'expenses', value: row.totalExpenses, x: startX + BAR_WIDTH + BAR_GAP },
                              ]
                            : []

                        return (
                            <g key={yearMonth}>
                                <text
                                    x={groupX + GROUP_WIDTH / 2}
                                    y={HEIGHT - 10}
                                    textAnchor="middle"
                                    fontSize="11"
                                    fill={row ? 'var(--ft-ink-2)' : 'var(--ft-ink-4)'}
                                    aria-hidden="true"
                                >
                                    {shortMonthLabel(yearMonth)}
                                </text>
                                {bars.map((bar) => {
                                    const barTop = scale(bar.value)

                                    return (
                                        <path
                                            key={bar.series}
                                            d={topRoundedBar(bar.x, barTop, BAR_WIDTH)}
                                            fill={SERIES[bar.series].color}
                                            tabIndex={0}
                                            role="img"
                                            aria-label={`${monthLabel(yearMonth)}, ${SERIES[bar.series].label.toLowerCase()}: ${formatMoney(bar.value)}`}
                                            className="cursor-default outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ft-focus"
                                            opacity={hovered && (hovered.yearMonth !== yearMonth || hovered.series !== bar.series) ? 0.55 : 1}
                                            onMouseEnter={() => setHovered({ ...bar, x: bar.x + BAR_WIDTH / 2, y: barTop, yearMonth })}
                                            onFocus={() => setHovered({ ...bar, x: bar.x + BAR_WIDTH / 2, y: barTop, yearMonth })}
                                            onBlur={() => setHovered(null)}
                                        />
                                    )
                                })}
                                {row && yearMonth === latest
                                    ? bars.map((bar) => (
                                          <text
                                              key={`label-${bar.series}`}
                                              x={bar.x + BAR_WIDTH / 2}
                                              y={scale(bar.value) - 6}
                                              textAnchor="middle"
                                              fontSize="10.5"
                                              fontWeight="600"
                                              fill="var(--ft-ink)"
                                              aria-hidden="true"
                                          >
                                              {formatCompactMoney(bar.value)}
                                          </text>
                                      ))
                                    : null}
                            </g>
                        )
                    })}
                    <line x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={BASELINE} y2={BASELINE} stroke="var(--ft-control)" aria-hidden="true" />
                </svg>
                {hovered ? (
                    <div
                        role="status"
                        className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-ft-line bg-white px-3 py-2 text-[12.5px] shadow-[0_8px_24px_-12px_rgba(16,24,40,0.3)]"
                        style={{ left: hovered.x, top: hovered.y - 8 }}
                    >
                        <p className="font-semibold text-ft-ink">{monthLabel(hovered.yearMonth)}</p>
                        <p className="text-ft-ink-2">
                            {SERIES[hovered.series].label}:{' '}
                            <span className="font-semibold text-ft-ink tabular">{formatMoney(hovered.value)}</span>
                        </p>
                    </div>
                ) : null}
            </div>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[12.5px] text-ft-ink-2" aria-label="Leyenda">
                {(Object.keys(SERIES) as Series[]).toReversed().map((series) => (
                    <li key={series} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: SERIES[series].color }} />
                        {SERIES[series].label}
                    </li>
                ))}
                <li className="flex items-center gap-1.5">
                    <svg aria-hidden="true" width="18" height="6" className="overflow-visible">
                        <line x1="0" x2="18" y1="3" y2="3" stroke="var(--ft-ink-2)" strokeDasharray="5 4" strokeWidth="1.25" />
                    </svg>
                    Colchón {formatMoney(cushion)}
                </li>
            </ul>
        </div>
    )
}

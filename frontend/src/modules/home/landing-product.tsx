import { ArrowDownLeft, ArrowRight, Check, ChevronRight, CreditCard, WalletCards } from 'lucide-react'
import type { CSSProperties } from 'react'

import { shortMonthLabel } from '@/modules/finance/domain/year-month'
import { formatMoney } from '@/modules/finance/lib/format'
import { LANDING_ANCHORS } from './landing-content'
import { landingSample } from './landing-sample'
import { landingContainer } from './landing-styles'

function chapterStyle(chapter: number) {
    return { '--chapter': chapter } as CSSProperties
}

function SheetScene() {
    const { month } = landingSample

    return (
        <div data-story-layer="0" className="ft-scene-layer ft-scene-month" style={chapterStyle(0)}>
            <div className="ft-scene-label"><span><WalletCards size={17} />Hoja mensual</span><span>Octubre 2026</span></div>
            <div className="ft-paper ft-month-paper">
                <div className="ft-paper-title"><strong>Todo empieza por aquí.</strong><span className="ft-sample-tag">Datos de ejemplo</span></div>
                <div className="ft-sheet-balance" data-story-item><span>Disponible</span><strong>{formatMoney(month.available)}</strong></div>
                <div className="ft-paper-table">
                    <div className="ft-paper-row ft-paper-table-head"><span>Movimiento</span><span>Estado</span><span>Valor</span></div>
                    {month.rows.map((row) => (
                        <div key={row.concept} className="ft-paper-row" data-story-item>
                            <span><i className={`ft-receipt-dot ft-tone-${row.category.toLowerCase()}`} />{row.concept}</span>
                            <span className="ft-entry-state">{row.pocketSpent !== null ? 'Bolsillo' : row.isPaid ? <><Check size={12} />Pagado</> : 'Pendiente'}</span>
                            <strong>{formatMoney(row.amount)}</strong>
                        </div>
                    ))}
                </div>
                <div className="ft-paper-total"><span>Gastos del mes</span><strong>{formatMoney(month.totalExpenses)}</strong></div>
            </div>
            <div className="ft-result-strip" data-story-item>
                <div><span>Ingreso neto</span><strong>{formatMoney(month.netIncome)}</strong></div>
                <ArrowRight size={18} />
                <div><span>Gastos del mes</span><strong>{formatMoney(month.totalExpenses)}</strong></div>
            </div>
        </div>
    )
}

function PocketScene() {
    const { pocket } = landingSample

    return (
        <div data-story-layer="1" className="ft-scene-layer ft-scene-pocket" style={chapterStyle(1)}>
            <div className="ft-scene-label"><span><WalletCards size={16} />Bolsillos</span><span>Sin contar dos veces</span></div>
            <div className="ft-pocket-folder-tab">Tu bolsillo de mercado</div>
            <div className="ft-paper ft-pocket-paper">
                <div className="ft-paper-title"><span className="ft-sample-tag">Datos de ejemplo</span></div>
                <div className="ft-pocket-head" data-story-item><span>Presupuesto del mes</span><strong>{formatMoney(pocket.budget)}</strong></div>
                <div className="ft-pocket-track"><span style={{ width: `${pocket.share * 100}%` }} /></div>
                <div className="ft-pocket-key"><span><i />Consumido <b>{formatMoney(pocket.spent)}</b></span><span><i />Queda <b>{formatMoney(pocket.remaining)}</b></span></div>
                <p className="ft-spend-title">Lo que vas registrando</p>
                {pocket.spends.map((spend, index) => (
                    <div key={index} className="ft-spend" data-story-item>
                        <span className="ft-spend-icon"><ArrowDownLeft size={18} /></span>
                        <span>Compra de mercado<small>{spend.label}</small></span>
                        <strong>{formatMoney(spend.amount)}</strong>
                    </div>
                ))}
            </div>
            <p className="ft-scene-footnote" data-story-item><Check size={16} />El bolsillo cuenta una sola vez en tus gastos.</p>
        </div>
    )
}

function DebtScene() {
    const { debt, month } = landingSample

    return (
        <div data-story-layer="2" className="ft-scene-layer ft-scene-debt" style={chapterStyle(2)}>
            <div className="ft-scene-label"><span><CreditCard size={16} />Plan de deudas</span><span>Primero, tu colchón</span></div>
            <div className="ft-reserve-sheet" data-story-item>
                <div className="ft-debt-balance">
                    <div><span>Disponible del mes</span><strong>{formatMoney(month.available)}</strong></div>
                    <div><span>Tu colchón mínimo</span><strong>{formatMoney(month.cushion)}</strong></div>
                </div>
                <div className="ft-reserve-track"><span style={{ width: `${Math.min(100, month.available > 0 ? month.cushion / month.available * 100 : 0)}%` }} /></div>
                <div className="ft-reserve-key"><span>Colchón mínimo</span><span>Extra disponible</span></div>
            </div>
            <div className="ft-paper ft-debt-paper">
                <div className="ft-paper-title"><strong>{debt.name}</strong><span className="ft-sample-tag">Mayor interés</span></div>
                <div className="ft-debt-calculation" data-story-item>
                    <div><span>Cuota base</span><strong>{formatMoney(debt.base)}</strong></div>
                    <span>+</span>
                    <div><span>Extra disponible</span><strong>{formatMoney(debt.extra)}</strong></div>
                </div>
                <div className="ft-debt-recommendation" data-story-item><div><span>Pago recomendado</span><strong>{formatMoney(debt.recommended)}</strong></div><ArrowRight size={24} /></div>
                <p>Con los datos de esta muestra, quedarían {formatMoney(debt.availableAfterRecommended)} disponibles.</p>
            </div>
            <p className="ft-scene-footnote" data-story-item>La recomendación orienta. Tú decides qué pagar. Datos de ejemplo.</p>
        </div>
    )
}

function YearScene() {
    const { year } = landingSample

    return (
        <div data-story-layer="3" className="ft-scene-layer ft-scene-year" style={chapterStyle(3)}>
            <div className="ft-scene-label"><span><WalletCards size={16} />Resumen anual</span><span>2026</span></div>
            <div className="ft-paper ft-year-paper">
                <div className="ft-paper-title"><strong>Tu año, mes a mes.</strong><span className="ft-sample-tag">Datos de ejemplo</span></div>
                <div className="ft-chart-legend"><span><i />Ingresos</span><span><i />Gastos</span></div>
                <div className="ft-year-chart">
                    <div className="ft-year-grid"><span /><span /><span /></div>
                    {year.rows.map((row) => (
                        <div key={row.yearMonth} className="ft-year-group" data-story-item>
                            <div className="ft-year-bars"><span style={{ height: `${row.netIncome / 3_000_000 * 100}%` }} /><span style={{ height: `${row.totalExpenses / 3_000_000 * 100}%` }} /></div>
                            <span>{shortMonthLabel(row.yearMonth)}</span>
                        </div>
                    ))}
                </div>
                <div className="ft-year-totals" data-story-item>
                    <div><span>Ingresos</span><strong>{formatMoney(year.netIncome)}</strong></div>
                    <div><span>Gastos</span><strong>{formatMoney(year.totalExpenses)}</strong></div>
                    <div><span>Ahorro</span><strong>{formatMoney(year.savings)}</strong></div>
                </div>
            </div>
        </div>
    )
}

export function LandingProduct() {
    const { month, pocket, debt, year } = landingSample

    return (
        <div data-story className={`${landingContainer} ft-story-area`}>
            <div className="ft-story-layout">
                <div data-story-stage className="ft-stage" aria-hidden="true">
                    <div className="ft-stage-topline"><span><b data-story-index>01</b> / 04</span><span>UNA HISTORIA. TU MES.</span><ChevronRight size={16} /></div>
                    <SheetScene />
                    <PocketScene />
                    <DebtScene />
                    <YearScene />
                    <div className="ft-stage-progress"><span className="ft-story-progress-fill" /></div>
                </div>
                <div className="ft-story-copy">
                    <section id={LANDING_ANCHORS.monthSheet} data-story-chapter="0" className="ft-story-chapter" style={chapterStyle(0)} aria-labelledby="hoja-title">
                        <p className="ft-chapter-number">01 / TU HOJA DEL MES</p>
                        <h2 id="hoja-title">Una hoja para cada mes. Tus números, en contexto.</h2>
                        <p>Registra tu ingreso, organiza los gastos por cuenta y categoría y marca los pagos que ya hiciste. Revisa el disponible y compáralo con tu colchón mínimo.</p>
                        <dl className="ft-chapter-facts"><div><dt>Ingreso neto</dt><dd>{formatMoney(month.netIncome)}</dd></div><div><dt>Disponible</dt><dd>{formatMoney(month.available)}</dd></div></dl>
                        <p className="ft-chapter-note">Datos de ejemplo. Gastos del mes: {formatMoney(month.totalExpenses)}.</p>
                        <table className="sr-only"><caption>Movimientos de la hoja de ejemplo, octubre de 2026</caption><thead><tr><th scope="col">Movimiento</th><th scope="col">Valor</th></tr></thead><tbody>{month.rows.map((row) => <tr key={row.concept}><th scope="row">{row.concept}</th><td>{formatMoney(row.amount)}</td></tr>)}</tbody></table>
                    </section>
                    <section id={LANDING_ANCHORS.pockets} data-story-chapter="1" className="ft-story-chapter" style={chapterStyle(1)} aria-labelledby="bolsillos-title">
                        <p className="ft-chapter-number">02 / BOLSILLOS</p>
                        <h2 id="bolsillos-title">Dale un lugar a cada gasto.</h2>
                        <p>Separa lo fijo de lo que vas consumiendo. Un bolsillo te permite definir un presupuesto y registrar sus consumos sin sumar el mismo gasto dos veces.</p>
                        <dl className="ft-chapter-facts"><div><dt>Presupuesto</dt><dd>{formatMoney(pocket.budget)}</dd></div><div><dt>Te queda</dt><dd>{formatMoney(pocket.remaining)}</dd></div></dl>
                        <p className="ft-chapter-note">Datos de ejemplo. Consumos registrados: {formatMoney(pocket.spent)}.</p>
                    </section>
                    <section id={LANDING_ANCHORS.debtPlan} data-story-chapter="2" className="ft-story-chapter" style={chapterStyle(2)} aria-labelledby="deudas-title">
                        <p className="ft-chapter-number">03 / PLAN DE DEUDAS</p>
                        <h2 id="deudas-title">Cuida lo que queda. Ordena lo que debes.</h2>
                        <p>Define el colchón que quieres conservar y revisa un plan de pago que prioriza las deudas con mayor interés. Tú decides qué hacer con la recomendación.</p>
                        <dl className="ft-chapter-facts"><div><dt>Colchón mínimo</dt><dd>{formatMoney(month.cushion)}</dd></div><div><dt>Pago recomendado</dt><dd>{formatMoney(debt.recommended)}</dd></div></dl>
                        <p className="ft-chapter-note">Datos de ejemplo: saldo {formatMoney(debt.balance)}, interés mensual del 2 %, sin seguros ni aportes compartidos. No es una promesa de ahorro ni de plazo.</p>
                    </section>
                    <section id={LANDING_ANCHORS.annualSummary} data-story-chapter="3" className="ft-story-chapter" style={chapterStyle(3)} aria-labelledby="resumen-title">
                        <p className="ft-chapter-number">04 / RESUMEN ANUAL</p>
                        <h2 id="resumen-title">Mira más allá de un solo mes.</h2>
                        <p>Compara ingresos, gastos y ahorro a lo largo del año. Consulta los meses en los que conservaste tu colchón y entiende cómo va cambiando tu flujo de caja.</p>
                        <dl className="ft-chapter-facts"><div><dt>Ingresos acumulados</dt><dd>{formatMoney(year.netIncome)}</dd></div><div><dt>Ahorro registrado</dt><dd>{formatMoney(year.savings)}</dd></div></dl>
                        <p className="ft-chapter-note">Datos de ejemplo. Solo tres meses registrados: agosto, septiembre y octubre de 2026.</p>
                        <table className="sr-only"><caption>Comparación mensual de la muestra</caption><thead><tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th></tr></thead><tbody>{year.rows.map((row) => <tr key={row.yearMonth}><th scope="row">{shortMonthLabel(row.yearMonth)}</th><td>{formatMoney(row.netIncome)}</td><td>{formatMoney(row.totalExpenses)}</td></tr>)}</tbody></table>
                    </section>
                </div>
            </div>
        </div>
    )
}

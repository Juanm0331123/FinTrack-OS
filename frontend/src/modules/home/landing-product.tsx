import { ArrowDownLeft, ArrowRight, Check } from 'lucide-react'

import { shortMonthLabel } from '@/modules/finance/domain/year-month'
import { formatMoney } from '@/modules/finance/lib/format'
import { LANDING_ANCHORS } from './landing-content'
import { landingSample } from './landing-sample'
import { landingContainer } from './landing-styles'

function MonthlySheet() {
    const { month } = landingSample

    return (
        <div data-product-visual className="ft-month-visual">
            <div data-product-piece="sheet" className="ft-month-sheet">
                <div className="ft-month-heading"><span>Tu hoja del mes</span><span>Octubre 2026</span></div>
                <dl className="ft-month-balances">
                    <div><dt>Ingreso neto</dt><dd>{formatMoney(month.netIncome)}</dd></div>
                    <div><dt>Gastos del mes</dt><dd>{formatMoney(month.totalExpenses)}</dd></div>
                    <div><dt>Disponible</dt><dd>{formatMoney(month.available)}</dd></div>
                </dl>
                <table className="ft-month-table">
                    <caption className="sr-only">Datos de ejemplo. Movimientos de la hoja de octubre de 2026.</caption>
                    <thead><tr><th scope="col">Movimiento</th><th scope="col" className="ft-month-detail">Cuenta</th><th scope="col" className="ft-month-detail">Estado</th><th scope="col">Valor</th></tr></thead>
                    <tbody>{month.rows.map((row) => {
                        const state = row.pocketSpent !== null ? 'Bolsillo' : row.isPaid ? 'Pagado' : 'Pendiente'

                        return (
                            <tr key={row.concept}>
                                <th scope="row"><span className="ft-month-concept"><i aria-hidden="true" className={`ft-receipt-dot ft-tone-${row.category.toLowerCase()}`} />{row.concept}</span><span className="ft-month-mobile-detail">{row.accountName} · {state}</span></th>
                                <td className="ft-month-detail">{row.accountName}</td>
                                <td className="ft-month-detail"><span className="ft-entry-state">{row.isPaid && <Check size={13} aria-hidden="true" />}{state}</span></td>
                                <td>{formatMoney(row.amount)}</td>
                            </tr>
                        )
                    })}</tbody>
                </table>
                <div className="ft-month-bottom"><span>Colchón mínimo <strong>{formatMoney(month.cushion)}</strong></span><span className="ft-example-label">Datos de ejemplo</span></div>
            </div>
        </div>
    )
}

function PocketComposition() {
    const { pocket } = landingSample

    return (
        <div data-product-visual className="ft-pocket-composition">
            <div data-product-piece="sheet" className="ft-budget-folder">
                <span className="ft-folder-tab">Bolsillo · {pocket.concept}</span>
                <div className="ft-folder-content">
                    <p>Presupuesto del mes</p>
                    <strong className="ft-folder-budget">{formatMoney(pocket.budget)}</strong>
                    <div className="ft-pocket-track" aria-hidden="true"><span style={{ width: `${pocket.share * 100}%` }} /></div>
                    <dl className="ft-pocket-amounts"><div><dt>Consumido</dt><dd>{formatMoney(pocket.spent)}</dd></div><div><dt>Te queda</dt><dd>{formatMoney(pocket.remaining)}</dd></div></dl>
                    <span className="ft-example-label">Datos de ejemplo</span>
                </div>
            </div>
            <ol className="ft-pocket-receipts" aria-label="Consumos registrados en el bolsillo de ejemplo">
                {pocket.spends.map((spend, index) => (
                    <li data-product-piece="receipt" key={spend.label} className={`ft-pocket-receipt ft-pocket-receipt-${index + 1}`}>
                        <ArrowDownLeft size={20} aria-hidden="true" />
                        <span>Compra de mercado<small>{spend.label}</small></span>
                        <strong>{formatMoney(spend.amount)}</strong>
                    </li>
                ))}
            </ol>
            <p className="ft-pocket-once"><Check size={16} aria-hidden="true" />El bolsillo cuenta una sola vez en tus gastos.</p>
        </div>
    )
}

function DebtPath() {
    const { debt, month } = landingSample
    const cushionShare = Math.min(100, month.available > 0 ? month.cushion / month.available * 100 : 0)

    return (
        <div data-product-visual className="ft-debt-path">
            <div data-product-piece="reserve" className="ft-reserve-landscape">
                <div className="ft-reserve-heading"><span>Disponible del mes</span><strong>{formatMoney(month.available)}</strong></div>
                <div className="ft-reserve-track" aria-hidden="true"><span style={{ width: `${cushionShare}%` }} /><i style={{ left: `${cushionShare}%` }} /></div>
                <dl className="ft-reserve-labels"><div><dt>Tu colchón mínimo</dt><dd>{formatMoney(month.cushion)}</dd></div><div><dt>Extra disponible</dt><dd>{formatMoney(debt.extra)}</dd></div></dl>
            </div>
            <div className="ft-debt-equation-label"><span>{debt.name}</span><span>Mayor interés · 2 % mensual</span></div>
            <div className="ft-debt-equation" data-product-piece="reserve" role="group" aria-label="Cálculo del pago recomendado">
                <dl><dt>Cuota base</dt><dd>{formatMoney(debt.base)}</dd></dl>
                <span aria-hidden="true">+</span>
                <dl><dt>Extra disponible</dt><dd>{formatMoney(debt.extra)}</dd></dl>
                <ArrowRight aria-hidden="true" size={24} />
                <dl className="ft-debt-answer"><dt>Pago recomendado</dt><dd>{formatMoney(debt.recommended)}</dd></dl>
            </div>
            <p className="ft-debt-after">Con los datos de esta muestra, quedarían <strong>{formatMoney(debt.availableAfterRecommended)}</strong> disponibles.</p>
        </div>
    )
}

function AnnualPanorama() {
    const { year } = landingSample

    return (
        <div data-product-visual className="ft-annual-panorama">
            <dl className="ft-annual-totals"><div><dt>Ingresos acumulados</dt><dd>{formatMoney(year.netIncome)}</dd></div><div><dt>Gastos acumulados</dt><dd>{formatMoney(year.totalExpenses)}</dd></div><div><dt>Ahorro registrado</dt><dd>{formatMoney(year.savings)}</dd></div></dl>
            <div className="ft-chart-legend" aria-hidden="true"><span><i />Ingresos</span><span><i />Gastos</span></div>
            <div className="ft-annual-chart" data-product-piece="chart" aria-hidden="true">
                <div className="ft-chart-grid"><span /><span /><span /></div>
                {year.rows.map((row) => (
                    <div key={row.yearMonth} className="ft-chart-month">
                        <div className="ft-chart-pair"><div style={{ height: `${row.netIncome / 3_000_000 * 100}%` }}><span>{formatMoney(row.netIncome)}</span></div><div style={{ height: `${row.totalExpenses / 3_000_000 * 100}%` }}><span>{formatMoney(row.totalExpenses)}</span></div></div>
                        <span>{shortMonthLabel(row.yearMonth)}</span>
                    </div>
                ))}
            </div>
            <table className="sr-only"><caption>Comparación mensual de la muestra, 2026</caption><thead><tr><th scope="col">Mes</th><th scope="col">Ingresos</th><th scope="col">Gastos</th></tr></thead><tbody>{year.rows.map((row) => <tr key={row.yearMonth}><th scope="row">{shortMonthLabel(row.yearMonth)}</th><td>{formatMoney(row.netIncome)}</td><td>{formatMoney(row.totalExpenses)}</td></tr>)}</tbody></table>
        </div>
    )
}

export function LandingProduct() {
    const { month, pocket, debt } = landingSample

    return (
        <div className="ft-product-journey">
            <section id={LANDING_ANCHORS.monthSheet} data-product-section="month" className={`${landingContainer} ft-product-section ft-product-month`} aria-labelledby="hoja-title">
                <div className="ft-product-intro ft-month-intro"><div><p className="ft-product-eyebrow">TU HOJA DEL MES</p><h2 id="hoja-title">Una hoja para cada mes. Tus números, en contexto.</h2></div><p>Registra tu ingreso, organiza los gastos por cuenta y categoría y marca los pagos que ya hiciste. Revisa el disponible y compáralo con tu colchón mínimo.</p></div>
                <MonthlySheet />
                <p className="ft-product-note">Datos de ejemplo. Gastos del mes: {formatMoney(month.totalExpenses)}.</p>
            </section>
            <section id={LANDING_ANCHORS.pockets} data-product-section="pockets" className={`${landingContainer} ft-product-section ft-product-pockets`} aria-labelledby="bolsillos-title">
                <div className="ft-product-intro ft-pocket-intro"><p className="ft-product-eyebrow">BOLSILLOS</p><h2 id="bolsillos-title">Dale un lugar a cada gasto.</h2><p>Separa lo fijo de lo que vas consumiendo. Un bolsillo te permite definir un presupuesto y registrar sus consumos sin sumar el mismo gasto dos veces.</p><p className="ft-product-note">Datos de ejemplo. Consumos registrados: {formatMoney(pocket.spent)}.</p></div>
                <PocketComposition />
            </section>
            <section id={LANDING_ANCHORS.debtPlan} data-product-section="debts" className={`${landingContainer} ft-product-section ft-product-debts`} aria-labelledby="deudas-title">
                <div className="ft-product-intro ft-debt-intro"><p className="ft-product-eyebrow">PLAN DE DEUDAS</p><h2 id="deudas-title">Cuida lo que queda. Ordena lo que debes.</h2><p>Define el colchón que quieres conservar y revisa un plan de pago que prioriza las deudas con mayor interés. Tú decides qué hacer con la recomendación.</p></div>
                <DebtPath />
                <p className="ft-product-note">Datos de ejemplo: saldo {formatMoney(debt.balance)}, interés mensual del 2 %, sin seguros ni aportes compartidos. No es una promesa de ahorro ni de plazo.</p>
            </section>
            <section id={LANDING_ANCHORS.annualSummary} data-product-section="year" className={`${landingContainer} ft-product-section ft-product-year`} aria-labelledby="resumen-title">
                <div className="ft-product-intro ft-year-intro"><p className="ft-product-eyebrow">RESUMEN ANUAL · 2026</p><h2 id="resumen-title">Mira más allá de un solo mes.</h2><p>Compara ingresos, gastos y ahorro a lo largo del año. Consulta los meses en los que conservaste tu colchón y entiende cómo va cambiando tu flujo de caja.</p></div>
                <AnnualPanorama />
                <p className="ft-product-note">Datos de ejemplo. Solo tres meses registrados: agosto, septiembre y octubre de 2026.</p>
            </section>
        </div>
    )
}

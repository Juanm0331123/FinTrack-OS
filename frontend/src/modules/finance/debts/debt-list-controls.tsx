import { ArrowDownWideNarrow, ArrowUpNarrowWide, RotateCcw, Search, X } from 'lucide-react'
import { useRef } from 'react'

import { FtButton } from '../ui/button'
import { Field, inputClassName, SELECT_CHEVRON_STYLE, selectClassName } from '../ui/fields'
import { DEBT_SORT_OPTIONS, type DebtSortKey, type DebtViewSort } from './debt-list-view'

export function DebtListControls({
    onQueryChange,
    onSortChange,
    query,
    shown,
    sort,
    total,
}: {
    onQueryChange: (query: string) => void
    onSortChange: (sort: DebtViewSort) => void
    query: string
    shown: number
    sort: DebtViewSort
    total: number
}) {
    const input = useRef<HTMLInputElement>(null)
    const DirectionIcon = sort.direction === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow

    return (
        <section aria-label="Buscar y ordenar deudas" className="min-w-0 rounded-xl border border-ft-line bg-white p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
                <Field label="Buscar deudas activas" htmlFor="debt-search" className="flex-1">
                    <div className="flex items-center gap-2">
                        <div className="relative min-w-0 flex-1">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ft-ink-2" aria-hidden="true" />
                            <input
                                ref={input}
                                id="debt-search"
                                type="search"
                                autoComplete="off"
                                className={`${inputClassName} pl-9 [&::-webkit-search-cancel-button]:appearance-none`}
                                placeholder="Nombre o entidad"
                                value={query}
                                aria-describedby="debt-list-result"
                                onChange={(event) => onQueryChange(event.currentTarget.value)}
                            />
                        </div>
                        {query ? (
                            <FtButton
                                type="button"
                                size="icon"
                                variant="ghost"
                                aria-label="Limpiar búsqueda"
                                onClick={() => { onQueryChange(''); input.current?.focus() }}
                            >
                                <X aria-hidden="true" />
                            </FtButton>
                        ) : null}
                    </div>
                </Field>
                <Field label="Ordenar deudas por" htmlFor="debt-sort" className="xl:w-48">
                    <select
                        id="debt-sort"
                        className={selectClassName}
                        style={SELECT_CHEVRON_STYLE}
                        value={sort.key}
                        onChange={(event) => onSortChange({ key: event.currentTarget.value as DebtSortKey, direction: 'asc' })}
                    >
                        {DEBT_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                </Field>
                <div className="flex flex-wrap gap-2">
                    <FtButton
                        type="button"
                        variant="secondary"
                        disabled={sort.key === 'strategy'}
                        aria-label={`Orden ${sort.direction === 'asc' ? 'ascendente' : 'descendente'}. Cambiar a ${sort.direction === 'asc' ? 'descendente' : 'ascendente'}`}
                        onClick={() => onSortChange({ ...sort, direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
                    >
                        <DirectionIcon aria-hidden="true" />
                        {sort.direction === 'asc' ? 'Ascendente' : 'Descendente'}
                    </FtButton>
                    <FtButton
                        type="button"
                        variant="ghost"
                        disabled={sort.key === 'strategy'}
                        onClick={() => onSortChange({ key: 'strategy', direction: 'asc' })}
                    >
                        <RotateCcw aria-hidden="true" />
                        Orden de la estrategia
                    </FtButton>
                </div>
            </div>
            <p id="debt-list-result" role="status" aria-live="polite" aria-atomic="true" className="mt-3 text-[13px] text-ft-ink-2">
                Mostrando {shown} de {total} {total === 1 ? 'deuda activa' : 'deudas activas'}.
            </p>
            <p className="mt-1 text-xs leading-5 text-ft-ink-2">La búsqueda y el orden solo cambian la vista. Las prioridades y los totales del plan se conservan.</p>
        </section>
    )
}

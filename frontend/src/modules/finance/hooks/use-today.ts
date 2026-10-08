'use client'

import { useSyncExternalStore } from 'react'

import { toIsoDate } from '../domain/year-month'

let cachedToday = ''

function readToday() {
    const today = toIsoDate(new Date())

    if (today !== cachedToday) {
        cachedToday = today
    }

    return cachedToday
}

function subscribe(onChange: () => void) {
    const interval = window.setInterval(onChange, 60_000)

    return () => window.clearInterval(interval)
}

function readServerToday() {
    return ''
}

export function useToday() {
    return useSyncExternalStore(subscribe, readToday, readServerToday)
}

'use client'

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'

import { createWorkbookStore, type WorkbookState, type WorkbookStore } from './workbook-store'

const WorkbookStoreContext = createContext<WorkbookStore | null>(null)

export function WorkbookProvider({ children }: { children: ReactNode }) {
    const [store] = useState(() => createWorkbookStore())

    useEffect(() => {
        void store.actions.load()
    }, [store])

    useEffect(() => {
        const flush = () => store.actions.flush()
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') {
                flush()
            }
        }
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            flush()

            if (store.actions.hasUnsavedChanges()) {
                event.preventDefault()
            }
        }

        document.addEventListener('visibilitychange', onVisibility)
        window.addEventListener('pagehide', flush)
        window.addEventListener('beforeunload', onBeforeUnload)

        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            window.removeEventListener('pagehide', flush)
            window.removeEventListener('beforeunload', onBeforeUnload)
        }
    }, [store])

    return <WorkbookStoreContext value={store}>{children}</WorkbookStoreContext>
}

function useWorkbookStore() {
    const store = useContext(WorkbookStoreContext)

    if (!store) {
        throw new Error('useWorkbookStore must be used inside WorkbookProvider.')
    }

    return store
}

export function useWorkbookState<T>(selector: (state: WorkbookState) => T): T {
    const store = useWorkbookStore()

    return useSyncExternalStore(
        store.subscribe,
        () => selector(store.getState()),
        () => selector(store.getState()),
    )
}

export function useWorkbookActions() {
    return useWorkbookStore().actions
}

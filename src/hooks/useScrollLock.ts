'use client'

import { useEffect } from 'react'

/**
 * Bloquea el scroll mientras hay un overlay abierto.
 *
 * Dos detalles que no tiene un scroll-lock genérico y que aquí hacen falta:
 *
 *  1. En /dashboard y /admin quien scrollea NO es el `body`, sino el `<main>` de
 *     MainContent.tsx (`overflow-y-auto`). Poner `body { overflow: hidden }` a
 *     secas —lo que hacía Modal.tsx— no bloquea nada en esas rutas.
 *  2. Modal y MobileSidebar pueden estar montados a la vez. Con un contador
 *     compartido, el cleanup de uno deja de liberar el bloqueo del otro.
 */

let lockCount = 0
let restore: (() => void) | null = null

function lock() {
    lockCount += 1
    if (lockCount > 1) return

    const main = document.querySelector('main')
    const prevBody = document.body.style.overflow
    const prevMain = main?.style.overflow ?? ''

    document.body.style.overflow = 'hidden'
    if (main) main.style.overflow = 'hidden'

    restore = () => {
        document.body.style.overflow = prevBody
        if (main) main.style.overflow = prevMain
    }
}

function unlock() {
    lockCount = Math.max(0, lockCount - 1)
    if (lockCount === 0 && restore) {
        restore()
        restore = null
    }
}

export function useScrollLock(active: boolean) {
    useEffect(() => {
        if (!active) return
        lock()
        return unlock
    }, [active])
}

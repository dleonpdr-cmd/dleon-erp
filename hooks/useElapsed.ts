'use client'

import { useState, useEffect, useRef } from 'react'

/**
 * Retorna o tempo decorrido em segundos desde `startedAt`.
 * Atualiza a cada segundo enquanto o componente estiver montado.
 *
 * @param startedAt - ISO string do início (ex: task.started_at). null/undefined = timer parado.
 */
export function useElapsed(startedAt: string | null | undefined): number {
  const [sec, setSec] = useState(0)
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!startedAt) {
      setSec(0)
      return
    }
    const base = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
    setSec(Math.max(0, base))

    ref.current = setInterval(() => setSec(s => s + 1), 1000)
    return () => {
      if (ref.current) clearInterval(ref.current)
    }
  }, [startedAt])

  return sec
}

/**
 * Formata segundos como string de tempo legível.
 *
 * @example
 * fmtElapsed(75)    // "01:15"
 * fmtElapsed(3665)  // "1:01:05"
 */
export function fmtElapsed(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

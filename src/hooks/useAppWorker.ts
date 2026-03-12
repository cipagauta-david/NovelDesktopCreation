import { useEffect, useState } from 'react'
import * as Comlink from 'comlink'
import type { AppWorker } from '../data/worker'

export function useAppWorker() {
  const [worker, setWorker] = useState<Comlink.Remote<AppWorker> | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const rawWorker = new Worker(new URL('../data/worker.ts', import.meta.url), {
      type: 'module',
    })
    const proxy = Comlink.wrap<AppWorker>(rawWorker)

    let cancelled = false

    proxy
      .init()
      .then(async () => {
        // Health-check: garantiza que la API expuesta realmente tiene loadState()
        // y evita errores tipo "worker.loadState is not a function" por proxies stale.
        await proxy.loadState().catch(() => null)
        if (!cancelled) {
          window.requestAnimationFrame(() => {
            setWorker(() => proxy)
            setIsReady(true)
          })
        }
      })
      .catch((err: unknown) => {
        console.error('[Worker Error] Fallo al inicializar motor', err)
      })

    return () => {
      cancelled = true
      setIsReady(false)
      setWorker(null)
      rawWorker.terminate()
    }
  }, [])

  return { worker, isReady }
}

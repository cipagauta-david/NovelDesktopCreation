import { useEffect, useState } from 'react'
import * as Comlink from 'comlink'
import type { AppWorker } from '../data/worker'

// Singleton para asegurar que no se levanten multiples workers
let workerProxyCache: Comlink.Remote<AppWorker> | null = null

export function useAppWorker() {
  const [isReady, setIsReady] = useState(() => !!workerProxyCache)
  const [worker] = useState<Comlink.Remote<AppWorker> | null>(() => {
    if (workerProxyCache) {
      return workerProxyCache
    }

    const rawWorker = new Worker(new URL('../data/worker.ts', import.meta.url), {
      type: 'module',
    })
    const proxy = Comlink.wrap<AppWorker>(rawWorker)
    workerProxyCache = proxy
    return proxy
  })

  useEffect(() => {
    if (!worker) {
      return
    }

    let cancelled = false
    worker
      .init()
      .then(() => {
        if (!cancelled) {
          setIsReady(true)
        }
      })
      .catch((err: unknown) => {
        console.error('[Worker Error] Fallo al inicializar motor', err)
      })

    return () => {
      cancelled = true
    }
  }, [worker])

  return { worker, isReady }
}

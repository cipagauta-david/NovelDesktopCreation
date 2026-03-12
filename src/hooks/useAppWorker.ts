import { useEffect, useState } from 'react'
import * as Comlink from 'comlink'
import type { AppWorker } from '../data/worker'

// Singleton para asegurar que no se levanten multiples workers
let workerProxyCache: Comlink.Remote<AppWorker> | null = null

export function useAppWorker() {
  const [worker, setWorker] = useState<Comlink.Remote<AppWorker> | null>(() => workerProxyCache)
  const [isReady, setIsReady] = useState(() => !!workerProxyCache)

  useEffect(() => {
    let proxy = workerProxyCache
    if (!proxy) {
      const rawWorker = new Worker(new URL('../data/worker.ts', import.meta.url), {
        type: 'module',
      })
      proxy = Comlink.wrap<AppWorker>(rawWorker)
      workerProxyCache = proxy
    }

    let cancelled = false
    const frameId = window.requestAnimationFrame(() => {
      if (!cancelled) {
        setWorker(proxy)
      }
    })

    proxy
      .init()
      .then(() => {
        if (!cancelled) {
          window.requestAnimationFrame(() => setIsReady(true))
        }
      })
      .catch((err: unknown) => {
        console.error('[Worker Error] Fallo al inicializar motor', err)
      })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(frameId)
    }
  }, [])

  return { worker, isReady }
}

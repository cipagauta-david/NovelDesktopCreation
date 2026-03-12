import { useEffect, useState } from 'react'
import * as Comlink from 'comlink'
import type { AppWorker } from '../data/worker'

// Singleton para asegurar que no se levanten multiples workers
let workerProxyCache: Comlink.Remote<AppWorker> | null = null

export function useAppWorker() {
  const [worker, setWorker] = useState<Comlink.Remote<AppWorker> | null>(() => workerProxyCache)
  const [isReady, setIsReady] = useState(() => !!workerProxyCache)

  useEffect(() => {
    if (workerProxyCache) {
      return
    }

    // Instancia limpia del Web Worker nativo de Vite
    const rawWorker = new Worker(new URL('../data/worker.ts', import.meta.url), {
      type: 'module'
    })

    const proxy = Comlink.wrap<AppWorker>(rawWorker)

    workerProxyCache = proxy
    setWorker(() => proxy)
    
    // Inicializar DB off-thread si es necesario
    proxy.init().then(() => {
      setIsReady(true)
    }).catch((err: unknown) => {
      console.error('[Worker Error] Fallo al inicializar motor', err)
      // Fallback fallback ...
    })
  }, [])

  return { worker, isReady }
}

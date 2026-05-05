import { useState, useRef, useEffect } from 'react'

export function useFusionVeil(activeEntityId: string | undefined) {
  const [fusionVeilActive, setFusionVeilActive] = useState(false)
  const fusionVeilTimerRef = useRef<number | null>(null)
  const prevEntityIdRef = useRef<string | undefined>(undefined)

  useEffect(() => {
    const currentId = activeEntityId
    if (prevEntityIdRef.current !== undefined && prevEntityIdRef.current !== currentId) {
      setFusionVeilActive(true)
      if (fusionVeilTimerRef.current != null) window.clearTimeout(fusionVeilTimerRef.current)
      fusionVeilTimerRef.current = window.setTimeout(() => setFusionVeilActive(false), 320)
    }
    prevEntityIdRef.current = currentId
  }, [activeEntityId])

  useEffect(() => () => {
    if (fusionVeilTimerRef.current != null) {
      window.clearTimeout(fusionVeilTimerRef.current)
    }
  }, [])

  return { fusionVeilActive }
}

import { useState, useRef, useEffect, useCallback } from 'react'

export function useSpectralMode() {
  const [spectralMode, setSpectralMode] = useState(false)
  const spectralTimerRef = useRef<number | null>(null)

  const handleMainColumnScroll = useCallback(() => {
    setSpectralMode(true)
    if (spectralTimerRef.current != null) {
      window.clearTimeout(spectralTimerRef.current)
    }
    spectralTimerRef.current = window.setTimeout(() => {
      setSpectralMode(false)
    }, 220)
  }, [])

  useEffect(() => {
    function handleMouseMove() {
      if (spectralMode) {
        setSpectralMode(false)
        if (spectralTimerRef.current != null) {
          window.clearTimeout(spectralTimerRef.current)
          spectralTimerRef.current = null
        }
      }
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [spectralMode])

  useEffect(() => () => {
    if (spectralTimerRef.current != null) {
      window.clearTimeout(spectralTimerRef.current)
    }
  }, [])

  return { spectralMode, handleMainColumnScroll }
}

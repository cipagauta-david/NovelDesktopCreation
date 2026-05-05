import { useState, useRef, useEffect, useCallback } from 'react'

export function useWritingMode() {
  const [isWriting, setIsWriting] = useState(false)
  const writingTimerRef = useRef<number | null>(null)

  const handleWritingActivity = useCallback(() => {
    setIsWriting(true)
    if (writingTimerRef.current != null) {
      window.clearTimeout(writingTimerRef.current)
    }
    writingTimerRef.current = window.setTimeout(() => {
      setIsWriting(false)
    }, 2500)
  }, [])

  useEffect(() => () => {
    if (writingTimerRef.current != null) {
      window.clearTimeout(writingTimerRef.current)
    }
  }, [])

  return { isWriting, handleWritingActivity }
}

import { useState, useEffect } from 'react'

export function useZenMode() {
  const [zenMode, setZenMode] = useState(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-focus-mode', zenMode ? 'true' : 'false')
    return () => {
      document.documentElement.setAttribute('data-focus-mode', 'false')
    }
  }, [zenMode])

  return { zenMode, setZenMode }
}

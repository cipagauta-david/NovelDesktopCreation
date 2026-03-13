type DesktopBridge = {
  platform?: 'desktop'
  fs?: {
    saveFile?: (payload: { filename: string; content: string; mimeType: string }) => Promise<void>
    pickTextFile?: (payload: { accept: string }) => Promise<string | null>
  }
}

export type PlatformFileAdapter = {
  runtime: 'web' | 'desktop'
  downloadTextFile: (filename: string, content: string, mimeType?: string) => Promise<void>
  pickTextFile: (accept?: string) => Promise<string | null>
}

function getDesktopBridge(): DesktopBridge | undefined {
  return (globalThis as { __NOVEL_DESKTOP__?: DesktopBridge }).__NOVEL_DESKTOP__
}

function createWebFileAdapter(): PlatformFileAdapter {
  return {
    runtime: 'web',
    async downloadTextFile(filename: string, content: string, mimeType = 'application/json') {
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    },
    async pickTextFile(accept = '.json,application/json') {
      return new Promise<string | null>((resolve) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = accept
        input.onchange = () => {
          const file = input.files?.[0]
          if (!file) {
            resolve(null)
            return
          }

          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string) ?? null)
          reader.onerror = () => resolve(null)
          reader.readAsText(file)
        }
        input.oncancel = () => resolve(null)
        input.click()
      })
    },
  }
}

function createDesktopFileAdapter(bridge: DesktopBridge): PlatformFileAdapter {
  return {
    runtime: 'desktop',
    async downloadTextFile(filename: string, content: string, mimeType = 'application/json') {
      if (bridge.fs?.saveFile) {
        await bridge.fs.saveFile({ filename, content, mimeType })
        return
      }
      await createWebFileAdapter().downloadTextFile(filename, content, mimeType)
    },
    async pickTextFile(accept = '.json,application/json') {
      if (bridge.fs?.pickTextFile) {
        return bridge.fs.pickTextFile({ accept })
      }
      return createWebFileAdapter().pickTextFile(accept)
    },
  }
}

export function getPlatformFileAdapter(): PlatformFileAdapter {
  const bridge = getDesktopBridge()
  if (bridge?.platform === 'desktop') {
    return createDesktopFileAdapter(bridge)
  }
  return createWebFileAdapter()
}

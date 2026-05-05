import { useEffect, type Dispatch, type SetStateAction } from 'react'
import type { PanelKey, WorkspaceView } from '../types/workspace'

export interface ShortcutMap {
  zenMode: boolean
  searchPaletteOpen: boolean
  shortcutsOpen: boolean
  godMode: boolean
  setZenMode: Dispatch<SetStateAction<boolean>>
  setSearchPaletteOpen: Dispatch<SetStateAction<boolean>>
  setShortcutsOpen: Dispatch<SetStateAction<boolean>>
  setWorkspaceView: (view: WorkspaceView) => void
  togglePanel: (panel: PanelKey) => void
}

export function useKeyboardShortcuts({
  zenMode,
  searchPaletteOpen,
  shortcutsOpen,
  godMode,
  setZenMode,
  setSearchPaletteOpen,
  setShortcutsOpen,
  setWorkspaceView,
  togglePanel,
}: ShortcutMap): void {
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      const usesCommand = e.metaKey || e.ctrlKey
      const key = e.key.toLowerCase()

      if (e.key === 'Escape' && zenMode) { e.preventDefault(); setZenMode(false); return }
      if (e.key === 'Escape' && searchPaletteOpen) { e.preventDefault(); setSearchPaletteOpen(false); return }
      if (e.key === 'Escape' && shortcutsOpen) { e.preventDefault(); setShortcutsOpen(false); return }
      if (e.key === 'F11' || (usesCommand && e.shiftKey && key === 'f')) { e.preventDefault(); setZenMode(c => !c); return }
      if (usesCommand && key === 'm') {
        e.preventDefault()
        setZenMode(false)
        setWorkspaceView(godMode ? 'editor' : 'graph')
        return
      }
      if (usesCommand && key === 'k') { e.preventDefault(); setSearchPaletteOpen(true); return }
      if (usesCommand && key === '\\') { e.preventDefault(); togglePanel('inspector') }
      if (
        e.key === '?' &&
        !usesCommand &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target as HTMLElement)?.isContentEditable
      ) {
        e.preventDefault()
        setShortcutsOpen(c => !c)
      }
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [
    godMode,
    searchPaletteOpen,
    setWorkspaceView,
    shortcutsOpen,
    togglePanel,
    zenMode,
    setZenMode,
    setSearchPaletteOpen,
    setShortcutsOpen,
  ])
}

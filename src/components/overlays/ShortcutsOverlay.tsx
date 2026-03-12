import { useEffect } from 'react'

const shortcuts: { keys: string; description: string }[] = [
  { keys: 'Ctrl + K', description: 'Abrir búsqueda / Command Palette' },
  { keys: 'Ctrl + M', description: 'Alternar God Mode (Editor / Mapa)' },
  { keys: 'Ctrl + \\', description: 'Mostrar / ocultar Inspector' },
  { keys: 'F11 / Ctrl + Shift + F', description: 'Activar / desactivar modo Zen' },
  { keys: 'Escape', description: 'Salir del modo Zen / Cerrar búsqueda' },
  { keys: 'Ctrl + Click', description: 'Navegar a una referencia [[entity]]' },
  { keys: '?', description: 'Mostrar / ocultar esta ayuda de atajos' },
]

type Props = {
  open: boolean
  onClose: () => void
}

export function ShortcutsOverlay({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === '?') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="shortcuts-overlay-backdrop" onClick={onClose} role="presentation">
      <div
        className="shortcuts-overlay"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Atajos de teclado"
      >
        <div className="shortcuts-header">
          <h2>Atajos de teclado</h2>
          <button type="button" className="ghost-button compact-button" onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>
        <ul className="shortcuts-list">
          {shortcuts.map((s) => (
            <li key={s.keys} className="shortcut-row">
              <kbd className="shortcut-keys">{s.keys}</kbd>
              <span className="shortcut-desc">{s.description}</span>
            </li>
          ))}
        </ul>
        <p className="shortcuts-footer">
          Presiona <kbd>?</kbd> o <kbd>Esc</kbd> para cerrar
        </p>
      </div>
    </div>
  )
}

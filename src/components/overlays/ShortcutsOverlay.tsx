import { useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
      if (e.key === '?') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-md" aria-label="Atajos de teclado">
        <DialogHeader>
          <DialogTitle>Atajos de teclado</DialogTitle>
        </DialogHeader>
        <ul className="grid gap-2 list-none p-0 m-0">
          {shortcuts.map((s) => (
            <li
              key={s.keys}
              className="flex justify-between items-center gap-4 py-1.5 border-b border-border/40 last:border-0"
            >
              <kbd className="font-mono text-[0.8rem] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{s.keys}</kbd>
              <span className="text-sm text-foreground">{s.description}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Presiona <kbd className="font-mono bg-muted px-1 rounded">?</kbd> o{' '}
          <kbd className="font-mono bg-muted px-1 rounded">Esc</kbd> para cerrar
        </p>
      </DialogContent>
    </Dialog>
  )
}

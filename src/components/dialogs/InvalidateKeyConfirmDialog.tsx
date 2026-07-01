import { StackedDialog } from './StackedDialog'
import { Button } from '../ui/Button'

type InvalidateKeyConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function InvalidateKeyConfirmDialog({ open, onOpenChange, onConfirm }: InvalidateKeyConfirmDialogProps) {
  return (
    <StackedDialog open={open} onOpenChange={onOpenChange} title="Eliminar API key">
      <p>Esta acción elimina la key del vault del proveedor activo.</p>
      <Button
        type="button"
        className="ghost-button btn--ghost"
        onClick={() => onOpenChange(false)}
      >Cancelar</Button>
      <Button
        type="button"
        className="primary-button btn--default"
        onClick={() => { onConfirm(); onOpenChange(false) }}
      >Confirmar invalidación</Button>
    </StackedDialog>
  )
}

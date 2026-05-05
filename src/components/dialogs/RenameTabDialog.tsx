import { useEffect, useState } from 'react'
import { StackedDialog } from './StackedDialog'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'

type RenameTabDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onRename: (name: string) => void
}

export function RenameTabDialog({ open, onOpenChange, currentName, onRename }: RenameTabDialogProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue(currentName)
  }, [open, currentName])

  return (
    <StackedDialog open={open} onOpenChange={onOpenChange} title="Renombrar colección">
      <Field label={<span className="visually-hidden">Nombre de la colección</span>}>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nombre de la colección" />
      </Field>
      <Button
        type="button"
        variant="primary"
        className="primary-button"
        onClick={() => { onRename(value); onOpenChange(false) }}
      >Guardar</Button>
    </StackedDialog>
  )
}

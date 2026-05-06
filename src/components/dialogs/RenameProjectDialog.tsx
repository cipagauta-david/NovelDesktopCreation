import { useEffect, useState } from 'react'
import { StackedDialog } from './StackedDialog'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'

type RenameProjectDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentName: string
  onRename: (name: string) => void
}

export function RenameProjectDialog({ open, onOpenChange, currentName, onRename }: RenameProjectDialogProps) {
  const [value, setValue] = useState('')

  useEffect(() => {
    if (open) setValue(currentName)
  }, [open, currentName])

  return (
    <StackedDialog open={open} onOpenChange={onOpenChange} title="Renombrar proyecto">
      <Field label={<span className="visually-hidden">Nombre del proyecto</span>}>
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Nombre del proyecto" />
      </Field>
      <Button
        type="button"
        className="primary-button btn--default"
        onClick={() => { onRename(value); onOpenChange(false) }}
      >Guardar</Button>
    </StackedDialog>
  )
}

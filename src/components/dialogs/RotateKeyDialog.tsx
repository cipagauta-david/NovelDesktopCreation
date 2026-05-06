import { useEffect, useState } from 'react'
import { StackedDialog } from './StackedDialog'
import { Field } from '../common/Field'
import { Button } from '../ui/Button'

type RotateKeyDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRotate: (newKey: string) => void
}

export function RotateKeyDialog({ open, onOpenChange, onRotate }: RotateKeyDialogProps) {
  const [key, setKey] = useState('')

  useEffect(() => {
    if (open) setKey('')
  }, [open])

  return (
    <StackedDialog open={open} onOpenChange={onOpenChange} title="Rotar API key del proveedor">
      <Field label={<span className="visually-hidden">Nueva API key del proveedor</span>}>
        <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="Nueva API key" />
      </Field>
      <Button
        type="button"
        className="primary-button btn--default"
        onClick={() => { onRotate(key); onOpenChange(false) }}
      >Rotar key</Button>
    </StackedDialog>
  )
}

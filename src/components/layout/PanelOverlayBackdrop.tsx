// SYNAPSE_WARNING: onClose MUST close ALL panels atomically — callers are responsible for checking individual panel state before calling togglePanel per panel

import { memo } from 'react'

interface PanelOverlayBackdropProps {
  visible: boolean
  onClose: () => void
}

export const PanelOverlayBackdrop = memo(function PanelOverlayBackdrop({ visible, onClose }: PanelOverlayBackdropProps) {
  return (
    <button
      type="button"
      className={visible ? 'panel-overlay-backdrop visible' : 'panel-overlay-backdrop'}
      aria-label="Cerrar paneles"
      onClick={onClose}
    />
  )
})

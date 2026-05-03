import { memo, useMemo } from 'react'
import type { DraftState, EntityRecord } from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'
import { cn } from '@/lib/utils'
import { ActionRow } from '../../common/ActionRow'
import { ActionMenu } from '../../common/ActionMenu'
import { Button } from '../../ui/Button'
import '../../../styles/editor/panel/EditorHeader.css';



type EditorHeaderProps = {
  draft: DraftState
  entity: EntityRecord
  saveStatus: 'idle' | 'saving' | 'saved'
  zenMode: boolean
  onDraftChange: (next: DraftState) => void
  onApplyTemplate: () => void
  onSaveAsTemplate: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onGenerateAiProposal: () => void
  onToggleZenMode: () => void
  detailsOpen: boolean
  onToggleDetails: () => void
}

// V0ID_NOTE: memo prevents this entire header from re-rendering on every draft keystroke —
// the parent updates draft on each character, but EditorHeader only cares about title changes.
export const EditorHeader = memo(function EditorHeader({
  draft,
  entity,
  saveStatus,
  zenMode,
  onDraftChange,
  onApplyTemplate,
  onSaveAsTemplate,
  onDuplicate,
  onArchive,
  onDelete,
  onGenerateAiProposal,
  onToggleZenMode,
  detailsOpen,
  onToggleDetails,
}: EditorHeaderProps) {
  const menuItems = useMemo(
    () => [
      { label: 'Aplicar template seleccionado', onSelect: onApplyTemplate },
      { label: 'Convertir en plantilla', onSelect: onSaveAsTemplate },
      { label: 'Duplicar entidad', onSelect: onDuplicate },
      { label: 'Archivar entidad', onSelect: onArchive },
      { label: 'Eliminar entidad', onSelect: onDelete, destructive: true },
    ],
    [onApplyTemplate, onSaveAsTemplate, onDuplicate, onArchive, onDelete]
  )

  return (
    <div className={cn('panel-header editor-topbar-shell', { 'is-hidden': zenMode })}>
      <div className="editor-heading">
        <span className="eyebrow">Entidad activa</span>
        <div className="editor-title-row">
          <input
            className="title-inline-input"
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            placeholder="Título de la entidad"
            aria-label="Título de la entidad"
          />
          <span className="editor-mode-badge" aria-label="Editor en modo inmersivo">
            ◉ Texto limpio
          </span>
        </div>
        <div className="entity-meta-row editor-meta-inline">
          <span>
            rev {entity.revision}
          </span>
          <span aria-hidden="true">•</span>
          <span>{formatTimestamp(entity.updatedAt)}</span>
          <span aria-hidden="true">•</span>
          <span className={`save-indicator ${saveStatus}`}>
            <span className="save-indicator-dot" />
            {saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? 'Sincronizado' : 'Listo'}
          </span>
          <span className="editor-reference-hint" aria-label="Usa doble llave para enlazar entidades">
            Usa {'{{}}'} para enlazar
          </span>
        </div>
      </div>
      <ActionRow>
        <Button variant="ai" type="button" onClick={onGenerateAiProposal}>
          Sugerencia IA
        </Button>
        <Button variant="ghost" type="button" onClick={onToggleZenMode}>
          {zenMode ? 'Salir de foco' : 'Modo foco'}
        </Button>
        {!zenMode && (
          <Button variant="ghost" type="button" onClick={onToggleDetails}>
            {detailsOpen ? 'Ocultar detalles' : 'Mostrar detalles'}
          </Button>
        )}
        <ActionMenu
          label="Opciones de entidad"
          items={menuItems}
        />
      </ActionRow>
    </div>
  )
})

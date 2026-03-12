import type { DraftState, EntityRecord } from '../../../types/workspace'
import { formatTimestamp } from '../../../utils/workspace'
import { ActionMenu } from '../../common/ActionMenu'

type EditorHeaderProps = {
  draft: DraftState
  entity: EntityRecord
  saveStatus: 'idle' | 'saving' | 'saved'
  zenMode: boolean
  onDraftChange: (next: DraftState) => void
  onApplyTemplate: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onGenerateAiProposal: () => void
  onToggleZenMode: () => void
}

export function EditorHeader({
  draft,
  entity,
  saveStatus,
  zenMode,
  onDraftChange,
  onApplyTemplate,
  onDuplicate,
  onArchive,
  onDelete,
  onGenerateAiProposal,
  onToggleZenMode,
}: EditorHeaderProps) {
  return (
    <div className={zenMode ? 'panel-header editor-topbar-shell is-hidden' : 'panel-header editor-topbar-shell'}>
      <div className="editor-heading">
        <span className="eyebrow">Entidad activa</span>
        <input
          className="title-inline-input"
          value={draft.title}
          onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
          placeholder="Título de la entidad"
          aria-label="Título de la entidad"
        />
        <div className="entity-meta-row">
          <p>
            rev {entity.revision} · {formatTimestamp(entity.updatedAt)}
          </p>
          <span className={`save-indicator ${saveStatus}`}>
            <span className="save-indicator-dot" />
            {saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? 'Sincronizado' : 'Listo'}
          </span>
        </div>
      </div>
      <div className="toolbar-group">
        <button className="ghost-button" type="button" onClick={onGenerateAiProposal}>
          Sugerencia IA
        </button>
        <button className="ghost-button mode-switch-pill" type="button" onClick={onToggleZenMode}>
          {zenMode ? 'Salir de foco' : 'Modo foco'}
        </button>
        <ActionMenu
          label="Opciones de entidad"
          items={[
            { label: 'Aplicar template seleccionado', onSelect: onApplyTemplate },
            { label: 'Duplicar entidad', onSelect: onDuplicate },
            { label: 'Archivar entidad', onSelect: onArchive },
            { label: 'Eliminar entidad', onSelect: onDelete, destructive: true },
          ]}
        />
      </div>
    </div>
  )
}

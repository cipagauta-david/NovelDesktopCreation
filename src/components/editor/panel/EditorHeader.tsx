import type { DraftState, EntityRecord } from '../../../types/workspace'
import type { EditorMode } from '../../../types/editor'
import { formatTimestamp } from '../../../utils/workspace'
import { ActionMenu } from '../../common/ActionMenu'
import '../../../styles/editor/panel/EditorHeader.css';



type EditorHeaderProps = {
  draft: DraftState
  entity: EntityRecord
  editorMode: EditorMode
  saveStatus: 'idle' | 'saving' | 'saved'
  zenMode: boolean
  onDraftChange: (next: DraftState) => void
  onEditorModeChange: (mode: EditorMode) => void
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
  editorMode,
  saveStatus,
  zenMode,
  onDraftChange,
  onEditorModeChange,
  onApplyTemplate,
  onDuplicate,
  onArchive,
  onDelete,
  onGenerateAiProposal,
  onToggleZenMode,
}: EditorHeaderProps) {
  const editorModeButtons: Array<{ mode: EditorMode; icon: string; label: string }> = [
    { mode: 'split', icon: '◫', label: 'Vista dividida' },
    { mode: 'source', icon: '</>', label: 'Código fuente' },
    { mode: 'live', icon: '◉', label: 'Vista previa en vivo' },
  ]

  return (
    <div className={zenMode ? 'panel-header editor-topbar-shell is-hidden' : 'panel-header editor-topbar-shell'}>
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
          <div className="editor-mode-icon-toggle" role="tablist" aria-label="Modo del editor">
            {editorModeButtons.map((button) => (
              <button
                key={button.mode}
                type="button"
                className={editorMode === button.mode ? 'active' : ''}
                title={button.label}
                aria-label={button.label}
                aria-pressed={editorMode === button.mode}
                onClick={() => onEditorModeChange(button.mode)}
              >
                {button.icon}
              </button>
            ))}
          </div>
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

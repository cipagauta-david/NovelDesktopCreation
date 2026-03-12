import type { DraftState, EntityTemplate } from '../../../types/workspace'
import { PanelSection } from '../../common/PanelSection'

type EditorMetadataProps = {
  draft: DraftState
  templates: EntityTemplate[]
  zenMode: boolean
  onDraftChange: (next: DraftState) => void
}

export function EditorMetadata({ draft, templates, zenMode, onDraftChange }: EditorMetadataProps) {
  return (
    <div className={zenMode ? 'editor-meta-shell is-hidden' : 'editor-meta-shell'} style={{ fontFamily: 'var(--font-sans)' }}>
      <PanelSection title="Metadatos" meta="Plantilla, etiquetas y claves de contexto" defaultOpen={false}>
        <div className="form-grid compact-metadata-grid">
          <label>
            Plantilla
            <select
              value={draft.templateId}
              onChange={(event) => onDraftChange({ ...draft, templateId: event.target.value })}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Etiquetas
            <input
              value={draft.tagsText}
              onChange={(event) => onDraftChange({ ...draft, tagsText: event.target.value })}
              placeholder="misterio, política, magia"
            />
          </label>
          <label>
            Alias
            <input
              value={draft.aliasesText}
              onChange={(event) => onDraftChange({ ...draft, aliasesText: event.target.value })}
              placeholder="sobrenombres, títulos, abreviaturas"
            />
          </label>
        </div>
      </PanelSection>
    </div>
  )
}

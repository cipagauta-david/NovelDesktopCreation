import { memo } from 'react'
import type { DraftState, EntityTemplate } from '../../../types/workspace'
import { SectionCard } from '../../common/SectionCard'
import '../../../styles/editor/panel/EditorMetadata.css';
import '../../../styles/common/BentoFields.css'



type EditorMetadataProps = {
  draft: DraftState
  templates: EntityTemplate[]
  onDraftChange: (next: DraftState) => void
}

// V0ID_NOTE: memo isolates this panel from the editor's keystroke cycle.
// The parent draft object changes on every character, but metadata fields are low-frequency.
export const EditorMetadata = memo(function EditorMetadata({ draft, templates, onDraftChange }: EditorMetadataProps) {
  return (
    <SectionCard
      title="Metadatos"
      meta="Plantilla, etiquetas y claves de contexto"
      defaultOpen={false}
    >
      <div className="field-bento-grid compact-metadata-grid">
        <div className="field-bento-card">
          <label className="field-key-label" htmlFor="editor-metadata-template">Plantilla</label>
          <select
            id="editor-metadata-template"
            className="field-select-input"
            value={draft.templateId}
            onChange={(event) => onDraftChange({ ...draft, templateId: event.target.value })}
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field-bento-card">
          <label className="field-key-label" htmlFor="editor-metadata-tags">Etiquetas</label>
          <input
            id="editor-metadata-tags"
            className="field-value-input"
            value={draft.tagsText}
            onChange={(event) => onDraftChange({ ...draft, tagsText: event.target.value })}
            placeholder="misterio, politica, magia"
          />
        </div>

        <div className="field-bento-card">
          <label className="field-key-label" htmlFor="editor-metadata-aliases">Alias</label>
          <input
            id="editor-metadata-aliases"
            className="field-value-input"
            value={draft.aliasesText}
            onChange={(event) => onDraftChange({ ...draft, aliasesText: event.target.value })}
            placeholder="sobrenombres, titulos, abreviaturas"
          />
        </div>
      </div>
    </SectionCard>
  )
})

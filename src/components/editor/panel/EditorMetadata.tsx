import { memo } from 'react'
import type { DraftState, EntityTemplate } from '../../../types/workspace'
import { Field } from '../../common/Field'
import { SectionCard } from '../../common/SectionCard'
import '../../../styles/editor/panel/EditorMetadata.css';



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
      <div className="form-grid compact-metadata-grid">
        <Field label="Plantilla">
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
        </Field>
        <Field label="Etiquetas">
          <input
            value={draft.tagsText}
            onChange={(event) => onDraftChange({ ...draft, tagsText: event.target.value })}
            placeholder="misterio, política, magia"
          />
        </Field>
        <Field label="Alias">
          <input
            value={draft.aliasesText}
            onChange={(event) => onDraftChange({ ...draft, aliasesText: event.target.value })}
            placeholder="sobrenombres, títulos, abreviaturas"
          />
        </Field>
      </div>
    </SectionCard>
  )
})

import type { DraftState, EntityTemplate } from '../../../types/workspace'
import { Field } from '../../common/Field'
import { PanelSection } from '../../common/PanelSection'
import '../../../styles/editor/panel/EditorMetadata.css';



type EditorMetadataProps = {
  draft: DraftState
  templates: EntityTemplate[]
  zenMode: boolean
  onDraftChange: (next: DraftState) => void
}

export function EditorMetadata({ draft, templates, zenMode, onDraftChange }: EditorMetadataProps) {
  return (
    <PanelSection
      title="Metadatos"
      meta="Plantilla, etiquetas y claves de contexto"
      defaultOpen={false}
      className={zenMode ? 'editor-meta-shell is-hidden' : 'editor-meta-shell'}
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
    </PanelSection>
  )
}

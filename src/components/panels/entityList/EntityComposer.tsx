import type { EntityTemplate } from '../../../types/workspace'
import '../../../styles/panels/entityList/EntityComposer.css';


type EntityComposerProps = {
  templates: EntityTemplate[]
  selectedTemplateId: string
  onTemplateChange: (value: string) => void
  onCreateEntity: () => void
}

export function EntityComposer({
  templates,
  selectedTemplateId,
  onTemplateChange,
  onCreateEntity,
}: EntityComposerProps) {
  return (
    <div className="stacked-form entity-composer">
      <label className="compact-label">
        Plantilla base
        <select value={selectedTemplateId} onChange={(event) => onTemplateChange(event.target.value)}>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </label>
      <button className="ghost-button create-entity-button" type="button" onClick={onCreateEntity}>
        Crear entidad
      </button>
    </div>
  )
}

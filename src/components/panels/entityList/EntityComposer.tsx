import type { EntityTemplate } from '../../../types/workspace'
import { Field } from '../../common/Field'
import { FormStack } from '../../common/FormStack'
import { Button } from '../../ui/Button'
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
    <FormStack className="entity-composer">
      <Field className="compact-label" label="Plantilla base" hintClassName="form-hint">
        <select value={selectedTemplateId} onChange={(event) => onTemplateChange(event.target.value)}>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </Field>
      <Button className="ghost-button create-entity-button btn--ghost" type="button" onClick={onCreateEntity}>
        Crear entidad
      </Button>
    </FormStack>
  )
}

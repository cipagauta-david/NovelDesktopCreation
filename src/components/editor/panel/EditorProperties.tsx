import type { FieldValue } from '../../../types/workspace'
import { PanelSection } from '../../common/PanelSection'

type EditorPropertiesProps = {
  fields: FieldValue[]
  assetCount: number
  onAddField: () => void
  onUpdateField: (fieldId: string, key: 'key' | 'value', value: string) => void
  onRemoveField: (fieldId: string) => void
}

export function EditorProperties({
  fields,
  assetCount,
  onAddField,
  onUpdateField,
  onRemoveField,
}: EditorPropertiesProps) {
  return (
    <PanelSection
      title="Propiedades"
      meta={`${fields.length} propiedades · ${assetCount} assets`}
      defaultOpen={false}
      actions={
        <button type="button" className="ghost-button compact-button" onClick={onAddField}>
          Añadir propiedad
        </button>
      }
    >
      {fields.map((field) => (
        <div key={field.id} className="field-row">
          <input
            value={field.key}
            onChange={(event) => onUpdateField(field.id, 'key', event.target.value)}
            placeholder="Nombre de la propiedad"
          />
          <input
            value={field.value}
            onChange={(event) => onUpdateField(field.id, 'value', event.target.value)}
            placeholder="Valor"
          />
          <button type="button" className="icon-button" onClick={() => onRemoveField(field.id)}>
            ✕
          </button>
        </div>
      ))}
    </PanelSection>
  )
}

import { memo } from 'react'
import type { FieldValue } from '../../../types/workspace'
import { SectionCard } from '../../common/SectionCard'
import { Button } from '../../ui/Button'
import '../../../styles/editor/panel/EditorProperties.css';



type EditorPropertiesProps = {
  fields: FieldValue[]
  assetCount: number
  onAddField: () => void
  onUpdateField: (fieldId: string, key: 'key' | 'value', value: string) => void
  onRemoveField: (fieldId: string) => void
}

// V0ID_NOTE: memo prevents the fields list from reconciling on every keystroke
// happening in the editor — fields are written infrequently, not per-character.
export const EditorProperties = memo(function EditorProperties({
  fields,
  assetCount,
  onAddField,
  onUpdateField,
  onRemoveField,
}: EditorPropertiesProps) {
  return (
    <>
      <div className="heading-style-preview" aria-label="Estilo de títulos nivel 1">
        <p className="heading-style-preview-title">Título Nivel 1</p>
        <div className="heading-style-preview-line" aria-hidden="true" />
      </div>
      <SectionCard
        title="Propiedades"
        meta={`${fields.length} propiedades · ${assetCount} assets`}
        defaultOpen={false}
        actions={
          <Button type="button" variant="ghost" className="ghost-button compact-button" onClick={onAddField}>
            Añadir propiedad
          </Button>
        }
      >
        {fields.map((field) => (
          <div key={field.id} className="field-row">
            <input
              value={field.key}
              onChange={(event) => onUpdateField(field.id, 'key', event.target.value)}
              placeholder="Nombre de la propiedad"
              aria-label="Nombre de la propiedad"
            />
            <input
              value={field.value}
              onChange={(event) => onUpdateField(field.id, 'value', event.target.value)}
              placeholder="Valor"
              aria-label="Valor de la propiedad"
            />
            <Button type="button" variant="ghost" size="icon" className="icon-button" onClick={() => onRemoveField(field.id)}>
              ✕
            </Button>
          </div>
        ))}
      </SectionCard>
    </>
  )
})

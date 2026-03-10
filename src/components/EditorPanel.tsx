import type { RefObject } from 'react'

import type {
  DraftState,
  EntityRecord,
  EntityTemplate,
  FieldValue,
  Project,
} from '../types/workspace'
import { buildSnippet } from '../utils/search'
import { getReferenceTokens } from '../utils/references'
import { formatTimestamp } from '../utils/workspace'
import { ActionMenu } from './common/ActionMenu'
import { PanelSection } from './common/PanelSection'

type EditorPanelProps = {
  project?: Project
  entity: EntityRecord
  draft: DraftState
  templates: EntityTemplate[]
  textareaRef: RefObject<HTMLTextAreaElement | null>
  referenceSuggestionActive: boolean
  suggestionOptions: EntityRecord[]
  onDraftChange: (next: DraftState) => void
  onHandleEditorChange: (value: string, selectionEnd: number | null) => void
  onInsertReference: (entity: EntityRecord) => void
  onAttachImages: (files: FileList | null) => Promise<void>
  onAddField: () => void
  onUpdateField: (fieldId: string, key: 'key' | 'value', value: string) => void
  onRemoveField: (fieldId: string) => void
  onApplyTemplate: () => void
  onDuplicate: () => void
  onArchive: () => void
  onDelete: () => void
  onGenerateAiProposal: () => void
  onNavigateFromReference: (entityId: string, ctrlKey: boolean) => void
}

export function EditorPanel({
  project,
  entity,
  draft,
  templates,
  textareaRef,
  referenceSuggestionActive,
  suggestionOptions,
  onDraftChange,
  onHandleEditorChange,
  onInsertReference,
  onAttachImages,
  onAddField,
  onUpdateField,
  onRemoveField,
  onApplyTemplate,
  onDuplicate,
  onArchive,
  onDelete,
  onGenerateAiProposal,
  onNavigateFromReference,
}: EditorPanelProps) {
  return (
    <section className="panel surface-panel editor-panel">
      <div className="panel-header">
        <div>
          <span className="eyebrow">Entidad activa</span>
          <h3>{entity.title}</h3>
          <p>
            rev {entity.revision} · {formatTimestamp(entity.updatedAt)}
          </p>
        </div>
        <div className="toolbar-group">
          <button className="primary-button" type="button" onClick={onGenerateAiProposal}>
            IA propone
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

      <div className="editor-grid">
        <PanelSection title="Metadatos" meta="Título, template, tags y aliases">
          <div className="form-grid">
            <label>
              Título
              <input
                value={draft.title}
                onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
              />
            </label>
            <label>
              Template
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
              Tags
              <input
                value={draft.tagsText}
                onChange={(event) => onDraftChange({ ...draft, tagsText: event.target.value })}
                placeholder="misterio, política, magia"
              />
            </label>
            <label>
              Aliases
              <input
                value={draft.aliasesText}
                onChange={(event) => onDraftChange({ ...draft, aliasesText: event.target.value })}
                placeholder="sobrenombres, títulos, abreviaturas"
              />
            </label>
          </div>
        </PanelSection>

        <div className="split-grid">
          <PanelSection title="Documento editable" meta="Usa {{}} para enlazar entidades">
            <textarea
              ref={textareaRef}
              value={draft.content}
              onChange={(event) => onHandleEditorChange(event.target.value, event.target.selectionEnd)}
              placeholder="Escribe aquí la entidad. Usa {{}} para referencias cruzadas."
            />
            {referenceSuggestionActive && suggestionOptions.length > 0 && (
              <div className="suggestions-popover">
                {suggestionOptions.map((option) => (
                  <button key={option.id} type="button" onClick={() => onInsertReference(option)}>
                    <strong>{option.title}</strong>
                    <span>{option.aliases.join(', ') || 'Sin aliases'}</span>
                  </button>
                ))}
              </div>
            )}
            <div
              className="dropzone"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                void onAttachImages(event.dataTransfer.files)
              }}
            >
              <span>Arrastra imágenes aquí o</span>
              <label className="inline-upload">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    void onAttachImages(event.target.files)
                    event.target.value = ''
                  }}
                />
                súbelas desde disco
              </label>
            </div>
          </PanelSection>

          <PanelSection
            title="Preview contextual"
            meta="Hover preview · Ctrl + click navega"
            defaultOpen={false}
          >
            <div className="rendered-document">
              {draft.content.split(/(\{\{entity:[^|}]+\|[^}]+\}\})/g).map((chunk, index) => {
                const token = getReferenceTokens(chunk)[0]
                if (!token) {
                  return (
                    <span key={`${chunk}-${index}`} className="plain-chunk">
                      {chunk}
                    </span>
                  )
                }

                const referencedEntity = project?.entities.find(
                  (projectEntity) => projectEntity.id === token.entityId,
                )
                return (
                  <span key={token.raw} className="reference-chip-wrapper">
                    <button
                      type="button"
                      className="reference-chip"
                      onClick={(event) => onNavigateFromReference(token.entityId, event.ctrlKey)}
                    >
                      {token.label}
                    </button>
                    {referencedEntity && (
                      <div className="reference-tooltip">
                        <strong>{referencedEntity.title}</strong>
                        <p>{buildSnippet(referencedEntity, referencedEntity.title)}</p>
                        <small>{referencedEntity.fields.map((field) => field.key).join(' · ')}</small>
                      </div>
                    )}
                  </span>
                )
              })}
            </div>
          </PanelSection>
        </div>

        <div className="split-grid">
          <PanelSection
            title="Fields tipados"
            meta={`${draft.fields.length} fields activos`}
            actions={
              <button type="button" className="ghost-button" onClick={onAddField}>
                Añadir field
              </button>
            }
          >
            {draft.fields.map((field: FieldValue) => (
              <div key={field.id} className="field-row">
                <input
                  value={field.key}
                  onChange={(event) => onUpdateField(field.id, 'key', event.target.value)}
                  placeholder="Nombre del field"
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

          <PanelSection title="Assets visuales" meta={`${entity.assets.length} imágenes`} defaultOpen={false}>
            <div className="asset-grid">
              {entity.assets.map((asset) => (
                <figure key={asset.id} className="asset-card">
                  <img src={asset.dataUrl} alt={asset.name} />
                  <figcaption>{asset.name}</figcaption>
                </figure>
              ))}
              {entity.assets.length === 0 && (
                <div className="empty-mini-state">Todavía no hay imágenes asociadas.</div>
              )}
            </div>
          </PanelSection>
        </div>
      </div>
    </section>
  )
}

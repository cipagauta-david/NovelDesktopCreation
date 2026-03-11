import { useMemo, useState, type ReactNode, type RefObject } from 'react'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'

import type { EditorMode } from '../types/editor'
import type { DraftState, EntityRecord, EntityTemplate, FieldValue } from '../types/workspace'
import { formatTimestamp } from '../utils/workspace'
import { ActionMenu } from './common/ActionMenu'
import { PanelSection } from './common/PanelSection'
import { baseEditorTheme, editorBasicSetup, editorModes, liveOverlayTheme } from './editor/editorThemes'
import { getActiveBlockRange } from './editor/editorUtils'
import { renderDocument } from './editor/renderDocument'

type EditorPanelProps = {
  entity: EntityRecord
  draft: DraftState
  templates: EntityTemplate[]
  editorViewRef: RefObject<EditorView | null>
  referenceSuggestionActive: boolean
  suggestionOptions: EntityRecord[]
  saveStatus: 'idle' | 'saving' | 'saved'
  zenMode: boolean
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
  onToggleZenMode: () => void
}

export function EditorPanel({
  entity,
  draft,
  templates,
  editorViewRef,
  referenceSuggestionActive,
  suggestionOptions,
  saveStatus,
  zenMode,
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
  onToggleZenMode,
}: EditorPanelProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>('live')
  const [cursorPosition, setCursorPosition] = useState(0)

  const sourceEditorExtensions = useMemo(
    () => [markdown(), EditorView.lineWrapping, baseEditorTheme],
    [],
  )
  const liveEditorExtensions = useMemo(
    () => [markdown(), EditorView.lineWrapping, baseEditorTheme, liveOverlayTheme],
    [],
  )

  function handleCursorActivity(selectionEnd: number | null) {
    setCursorPosition(Math.max(selectionEnd ?? 0, 0))
  }

  const activeBlockRange = getActiveBlockRange(draft.content, cursorPosition)

  const commonEditorProps = {
    value: draft.content,
    minHeight: '420px',
    theme: 'dark' as const,
    editable: true,
    placeholder: 'Escribe aquí la entidad. Usa {{}} para referencias cruzadas.',
    basicSetup: editorBasicSetup,
    onCreateEditor: (view: EditorView) => {
      editorViewRef.current = view
      handleCursorActivity(view.state.selection.main.head)
    },
    onChange: (value: string, viewUpdate: ViewUpdate) => {
      const nextSelectionEnd = viewUpdate.state.selection.main.head
      editorViewRef.current = viewUpdate.view
      onHandleEditorChange(value, nextSelectionEnd)
      handleCursorActivity(nextSelectionEnd)
    },
    onUpdate: (viewUpdate: ViewUpdate) => {
      editorViewRef.current = viewUpdate.view
      handleCursorActivity(viewUpdate.state.selection.main.head)
    },
  }

  const previewDocument = renderDocument(draft.content, {
    activeBlockRange,
    showRawActiveBlock: editorMode === 'live',
  })

  let editorSurface: ReactNode

  if (editorMode === 'split') {
    editorSurface = (
      <div className="editor-split-layout">
        <CodeMirror
          {...commonEditorProps}
          extensions={sourceEditorExtensions}
          className="editor-code-mirror editor-source-editor"
          aria-label="Editor markdown en vista dividida"
        />
        <div className="editor-pane editor-preview-pane">
          {renderDocument(draft.content)}
        </div>
      </div>
    )
  } else if (editorMode === 'source') {
    editorSurface = (
      <CodeMirror
        {...commonEditorProps}
        extensions={sourceEditorExtensions}
        className="editor-code-mirror editor-source-editor"
        aria-label="Editor markdown original"
      />
    )
  } else {
    editorSurface = (
      <div className="editor-stack">
        <div className="editor-render-layer" aria-hidden="true">
          {previewDocument}
        </div>

        <CodeMirror
          {...commonEditorProps}
          extensions={liveEditorExtensions}
          className="editor-code-mirror editor-live-editor"
          aria-label="Editor markdown live"
        />
      </div>
    )
  }

  const documentEditor = (
    <PanelSection
      title="Documento"
      meta="Usa {{}} para enlazar entidades relacionadas"
      actions={
        <div className="editor-mode-switch segmented-control" role="tablist" aria-label="Modo del editor">
          {editorModes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={editorMode === mode.id ? 'active' : ''}
              title={mode.description}
              aria-pressed={editorMode === mode.id}
              onClick={() => setEditorMode(mode.id)}
            >
              {mode.label}
            </button>
          ))}
        </div>
      }
    >
      <div className={zenMode ? 'writing-lane zen-writing-lane' : 'writing-lane'}>
        {editorSurface}

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

        {!zenMode && (
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
        )}
      </div>
    </PanelSection>
  )

  if (zenMode) {
    return (
      <section className="editor-panel editor-panel-zen" aria-label="Editor en modo foco">
        <button
          type="button"
          className="zen-exit-button"
          onClick={onToggleZenMode}
          aria-label="Cerrar modo foco"
        >
          ✕
        </button>
        {documentEditor}
      </section>
    )
  }

  return (
    <section className="editor-panel" aria-label="Editor principal">
      <div className="panel-header">
        <div className="editor-heading">
          <span className="eyebrow">Entidad activa</span>
          <input
            className="title-inline-input"
            value={draft.title}
            onChange={(event) => onDraftChange({ ...draft, title: event.target.value })}
            placeholder="Título de la entidad"
            aria-label="Título de la entidad"
          />
          <div className="entity-meta-row">
            <p>
              rev {entity.revision} · {formatTimestamp(entity.updatedAt)}
            </p>
            <span className={`save-indicator ${saveStatus}`}>
              <span className="save-indicator-dot" />
              {saveStatus === 'saving' ? 'Guardando…' : saveStatus === 'saved' ? 'Sincronizado' : 'Listo'}
            </span>
          </div>
        </div>
        <div className="toolbar-group">
          <button className="ghost-button" type="button" onClick={onGenerateAiProposal}>
            Sugerencia IA
          </button>
          <button className="ghost-button" type="button" onClick={onToggleZenMode}>
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

      <div className="editor-grid">
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

        <div className="split-grid">{documentEditor}</div>

        <div className="split-grid">
          <PanelSection
            title="Propiedades"
            meta={`${draft.fields.length} propiedades · ${entity.assets.length} assets`}
            defaultOpen={false}
            actions={
              <button type="button" className="ghost-button compact-button" onClick={onAddField}>
                Añadir propiedad
              </button>
            }
          >
            {draft.fields.map((field: FieldValue) => (
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

          <PanelSection
            title="Assets visuales"
            meta={`${entity.assets.length} imágenes`}
            defaultOpen={false}
          >
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

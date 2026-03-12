import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'

import type { EditorMode } from '../types/editor'
import type { DraftState, EntityRecord, EntityTemplate, FieldValue } from '../types/workspace'
import { formatTimestamp } from '../utils/workspace'
import { ActionMenu } from './common/ActionMenu'
import { PanelSection } from './common/PanelSection'
import {
  type EntityHoverPayload,
  createGhostTextExtensions,
  createLiveEditorExtensions,
  createNarrativeGhostTextProvider,
  createSourceEditorExtensions,
} from './editor/editorExperience'
import { baseEditorTheme, editorBasicSetup, editorModes } from './editor/editorThemes'
import { renderDocument } from './editor/renderDocument'

type EditorPanelProps = {
  entity: EntityRecord
  draft: DraftState
  templates: EntityTemplate[]
  allEntities: EntityRecord[]
  editorViewRef: RefObject<EditorView | null>
  referenceSuggestionActive: boolean
  suggestionOptions: EntityRecord[]
  saveStatus: 'idle' | 'saving' | 'saved'
  zenMode: boolean
  onOpenEntity: (entityId: string, tabId?: string) => void
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
  allEntities,
  editorViewRef,
  referenceSuggestionActive,
  suggestionOptions,
  saveStatus,
  zenMode,
  onOpenEntity,
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
  const [previewContent, setPreviewContent] = useState(draft.content)
  const [suggestionsStyle, setSuggestionsStyle] = useState<CSSProperties>()
  const [hoveredReference, setHoveredReference] = useState<{
    entityId: string
    left: number
    top: number
  } | null>(null)
  const [hoverPayload, setHoverPayload] = useState<EntityHoverPayload | null>(null)
  const previewPaneRef = useRef<HTMLDivElement | null>(null)
  const writingLaneRef = useRef<HTMLDivElement | null>(null)
  const entityById = useMemo(() => new Map(allEntities.map((entry) => [entry.id, entry])), [allEntities])

  const ghostTextProvider = useMemo(() => createNarrativeGhostTextProvider(draft.title), [draft.title])
  const handleEntityHover = useCallback((payload: EntityHoverPayload) => {
    setHoverPayload(payload)
  }, [])
  const hideEntityHover = useCallback(() => {
    setHoverPayload(null)
    setHoveredReference(null)
  }, [])
  const handleReferenceNavigation = useCallback(
    (entityId: string) => {
      const targetEntity = entityById.get(entityId)
      onOpenEntity(entityId, targetEntity?.tabId)
    },
    [entityById, onOpenEntity],
  )
  const sourceEditorExtensions = useMemo(
    () => [markdown(), EditorView.lineWrapping, baseEditorTheme, ...createSourceEditorExtensions(), ...createGhostTextExtensions(ghostTextProvider)],
    [ghostTextProvider],
  )
  const liveEditorExtensions = useMemo(
    () => [
      markdown(),
      EditorView.lineWrapping,
      baseEditorTheme,
      ...createLiveEditorExtensions({
        onEntityInteract: handleReferenceNavigation,
        onEntityHover: handleEntityHover,
        onEntityHoverEnd: hideEntityHover,
      }),
      ...createGhostTextExtensions(ghostTextProvider),
    ],
    [ghostTextProvider, handleEntityHover, hideEntityHover, handleReferenceNavigation],
  )
  const hoveredEntity = hoveredReference ? (entityById.get(hoveredReference.entityId) ?? null) : null

  function handleCursorActivity(selectionEnd: number | null) {
    setCursorPosition(Math.max(selectionEnd ?? 0, 0))
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPreviewContent(draft.content), 32)
    return () => window.clearTimeout(timeoutId)
  }, [draft.content])

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setHoveredReference(null)
      setHoverPayload(null)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [draft.entityId, editorMode])

  useLayoutEffect(() => {
    if (!hoverPayload) {
      return
    }

    const lane = writingLaneRef.current
    if (!lane) {
      return
    }

    const laneRect = lane.getBoundingClientRect()
    const top = Math.max(12, hoverPayload.rect.bottom - laneRect.top + 10)
    const left = Math.max(12, Math.min(hoverPayload.rect.left - laneRect.left, laneRect.width - 320))
    setHoveredReference((current) => {
      if (
        current?.entityId === hoverPayload.entityId &&
        Math.abs(current.left - left) < 1 &&
        Math.abs(current.top - top) < 1
      ) {
        return current
      }

      return {
        entityId: hoverPayload.entityId,
        left,
        top,
      }
    })
  }, [hoverPayload])

  useLayoutEffect(() => {
    if (!referenceSuggestionActive || suggestionOptions.length === 0) {
      const frameId = window.requestAnimationFrame(() => setSuggestionsStyle(undefined))
      return () => window.cancelAnimationFrame(frameId)
    }

    const view = editorViewRef.current
    const lane = writingLaneRef.current
    if (!view || !lane) {
      return
    }

    const updatePosition = () => {
      const caret = view.coordsAtPos(view.state.selection.main.head)
      const laneRect = lane.getBoundingClientRect()
      const fallbackTop = 24
      const fallbackLeft = 24
      if (!caret) {
        setSuggestionsStyle({ top: fallbackTop, left: fallbackLeft, width: Math.min(420, laneRect.width - 48) })
        return
      }

      const nextLeft = Math.max(20, Math.min(caret.left - laneRect.left - 12, laneRect.width - 380))
      const nextTop = Math.max(20, caret.bottom - laneRect.top + 12)
      setSuggestionsStyle({
        top: nextTop,
        left: nextLeft,
        width: Math.min(360, Math.max(260, laneRect.width - nextLeft - 20)),
      })
    }

    updatePosition()
    const scrollTarget = view.scrollDOM
    window.addEventListener('resize', updatePosition)
    scrollTarget.addEventListener('scroll', updatePosition, { passive: true })

    return () => {
      window.removeEventListener('resize', updatePosition)
      scrollTarget.removeEventListener('scroll', updatePosition)
    }
  }, [cursorPosition, editorMode, editorViewRef, referenceSuggestionActive, suggestionOptions.length])

  useEffect(() => {
    if (editorMode !== 'split') {
      return
    }

    let cleanup: (() => void) | undefined
    const frameId = window.requestAnimationFrame(() => {
      const sourceScroller = editorViewRef.current?.scrollDOM
      const previewScroller = previewPaneRef.current
      if (!sourceScroller || !previewScroller) {
        return
      }

      let syncing: 'source' | 'preview' | null = null
      const syncScroll = (origin: 'source' | 'preview') => {
        if (syncing && syncing !== origin) {
          return
        }

        syncing = origin
        const from = origin === 'source' ? sourceScroller : previewScroller
        const to = origin === 'source' ? previewScroller : sourceScroller
        const maxFrom = from.scrollHeight - from.clientHeight
        const maxTo = to.scrollHeight - to.clientHeight
        const ratio = maxFrom <= 0 ? 0 : from.scrollTop / maxFrom

        window.requestAnimationFrame(() => {
          to.scrollTop = maxTo <= 0 ? 0 : ratio * maxTo
          syncing = null
        })
      }

      const handleSourceScroll = () => syncScroll('source')
      const handlePreviewScroll = () => syncScroll('preview')

      sourceScroller.addEventListener('scroll', handleSourceScroll, { passive: true })
      previewScroller.addEventListener('scroll', handlePreviewScroll, { passive: true })

      cleanup = () => {
        sourceScroller.removeEventListener('scroll', handleSourceScroll)
        previewScroller.removeEventListener('scroll', handlePreviewScroll)
      }
    })

    return () => {
      window.cancelAnimationFrame(frameId)
      cleanup?.()
    }
  }, [draft.entityId, editorMode, editorViewRef, previewContent])

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
        <div ref={previewPaneRef} className="editor-pane editor-preview-pane">
          {renderDocument(previewContent)}
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
      <CodeMirror
        {...commonEditorProps}
        extensions={liveEditorExtensions}
        className="editor-code-mirror editor-live-editor"
        aria-label="Editor markdown live"
      />
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
      <div ref={writingLaneRef} className={zenMode ? 'writing-lane zen-writing-lane' : 'writing-lane'}>
        {editorSurface}

        {referenceSuggestionActive && suggestionOptions.length > 0 && (
          <div className="suggestions-popover floating-suggestions-popover" style={suggestionsStyle}>
            {suggestionOptions.map((option) => (
              <button key={option.id} type="button" onClick={() => onInsertReference(option)}>
                <strong>{option.title}</strong>
                <span>{option.aliases.join(', ') || 'Sin aliases'}</span>
              </button>
            ))}
          </div>
        )}

        {hoveredReference && hoveredEntity && (
          <aside
            className="entity-hover-popover"
            style={{ left: hoveredReference.left, top: hoveredReference.top }}
            aria-live="polite"
          >
            <span className="eyebrow">Entidad referenciada</span>
            <strong>{hoveredEntity.title}</strong>
            <p>
              {hoveredEntity.content.trim().slice(0, 170) || 'Sin contenido descriptivo.'}
              {hoveredEntity.content.trim().length > 170 ? '…' : ''}
            </p>
            <div className="entity-hover-meta">
              <span>rev {hoveredEntity.revision}</span>
              <span>{formatTimestamp(hoveredEntity.updatedAt)}</span>
            </div>
            {hoveredEntity.tags.length > 0 && (
              <small>{hoveredEntity.tags.slice(0, 4).map((tag) => `#${tag}`).join(' ')}</small>
            )}
          </aside>
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

  return (
    <section className={zenMode ? 'editor-panel editor-panel-zen' : 'editor-panel'} aria-label="Editor principal">
      {zenMode && (
        <button
          type="button"
          className="zen-exit-button"
          onClick={onToggleZenMode}
          aria-label="Cerrar modo foco"
        >
          ✕
        </button>
      )}

      <div className={zenMode ? 'panel-header editor-topbar-shell is-hidden' : 'panel-header editor-topbar-shell'}>
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
        <div className={zenMode ? 'editor-meta-shell is-hidden' : 'editor-meta-shell'}>
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

        <div className="split-grid">{documentEditor}</div>

        <div className={zenMode ? 'split-grid editor-side-shell is-hidden' : 'split-grid editor-side-shell'}>
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

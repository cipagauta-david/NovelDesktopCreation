import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { markdown } from '@codemirror/lang-markdown'
import { EditorSelection, type Range } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'

import type { DraftState, EntityRecord, EntityTemplate, FieldValue, SuggestionState } from '../types/workspace'
import { getReferenceTokens } from '../utils/references'
import { formatTimestamp } from '../utils/workspace'
import { ActionMenu } from './common/ActionMenu'
import { PanelSection } from './common/PanelSection'

type EditorMode = 'live' | 'split' | 'source'

const editorModes: Array<{ id: EditorMode; label: string; description: string }> = [
  { id: 'split', label: 'Dividida', description: 'Markdown y previsualización lado a lado' },
  { id: 'source', label: 'Source', description: 'Texto markdown sin formato' },
  { id: 'live', label: 'Live Preview', description: 'Sintaxis visible solo en el bloque activo' },
]

const REFERENCE_WIDGET_PATTERN = /\{\{entity:([^|}]+)\|([^}]+)\}\}/g
const HEADING_PATTERN = /^(#{1,3})\s+/

const editorBasicSetup = {
  lineNumbers: false,
  highlightActiveLineGutter: false,
  foldGutter: false,
  highlightActiveLine: false,
  highlightSelectionMatches: false,
  autocompletion: false,
  searchKeymap: false,
  foldKeymap: false,
  completionKeymap: false,
  lintKeymap: false,
}

class EntityReferenceWidget extends WidgetType {
  label: string
  entityId: string
  rawLength: number

  constructor(label: string, entityId: string, rawLength: number) {
    super()
    this.label = label
    this.entityId = entityId
    this.rawLength = rawLength
  }

  override eq(other: EntityReferenceWidget) {
    return other.label === this.label && other.entityId === this.entityId
  }

  override toDOM() {
    const pill = document.createElement('span')
    pill.className = 'cm-entity-pill'
    pill.dataset.rawLength = String(this.rawLength)
    pill.dataset.entityId = this.entityId
    pill.setAttribute('aria-label', `Referencia a ${this.label}`)

    const icon = document.createElement('span')
    icon.className = 'cm-entity-pill-icon'
    icon.textContent = '◈'

    const label = document.createElement('span')
    label.className = 'cm-entity-pill-label'
    label.textContent = this.label

    pill.append(icon, label)
    return pill
  }

  override ignoreEvent() {
    return false
  }
}

function isSelectionInsideRange(head: number, from: number, to: number) {
  return head > from && head < to
}

function buildLiveDecorations(view: EditorView) {
  const decorations: Range<Decoration>[] = []
  const head = view.state.selection.main.head
  const decoratedLines = new Set<number>()

  for (const { from, to } of view.visibleRanges) {
    const visibleText = view.state.doc.sliceString(from, to)
    REFERENCE_WIDGET_PATTERN.lastIndex = 0

    let match = REFERENCE_WIDGET_PATTERN.exec(visibleText)
    while (match) {
      const start = from + match.index
      const end = start + match[0].length

      if (!isSelectionInsideRange(head, start, end)) {
        decorations.push(
          Decoration.replace({
            widget: new EntityReferenceWidget(match[2], match[1], match[0].length),
          }).range(start, end),
        )
      }

      match = REFERENCE_WIDGET_PATTERN.exec(visibleText)
    }

    let line = view.state.doc.lineAt(from)
    while (line.from <= to && !decoratedLines.has(line.number)) {
      decoratedLines.add(line.number)
      const headingMatch = line.text.match(HEADING_PATTERN)
      const isActiveLine = head >= line.from && head <= line.to

      if (headingMatch && !isActiveLine) {
        const level = headingMatch[1].length
        const prefixLength = headingMatch[0].length
        const contentFrom = line.from + prefixLength

        decorations.push(Decoration.line({ class: `cm-md-heading-line cm-md-heading-line-${level}` }).range(line.from))
        decorations.push(Decoration.replace({}).range(line.from, contentFrom))

        if (contentFrom < line.to) {
          decorations.push(
            Decoration.mark({ class: `cm-md-heading cm-md-heading-${level}` }).range(contentFrom, line.to),
          )
        }
      }

      if (line.to >= to) {
        break
      }

      line = view.state.doc.line(line.number + 1)
    }
  }

  return Decoration.set(decorations, true)
}

const livePreviewDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildLiveDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLiveDecorations(update.view)
      }
    }
  },
  {
    decorations: (instance) => instance.decorations,
    eventHandlers: {
      mousedown: (event, view) => {
        const target = event.target instanceof HTMLElement ? event.target.closest('.cm-entity-pill') : null
        if (!(target instanceof HTMLElement)) {
          return false
        }

        event.preventDefault()
        const start = view.posAtDOM(target)
        const rawLength = Number(target.dataset.rawLength ?? 0)
        const nextPosition = rawLength > 4 ? Math.min(start + 2, start + rawLength - 1) : start

        view.dispatch({ selection: EditorSelection.cursor(nextPosition) })
        view.focus()
        return true
      },
    },
  },
)

const baseEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: '#dbe6f5',
      fontFamily: 'inherit',
      fontSize: '1.05rem',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.6',
    },
    '.cm-content, .cm-gutter': {
      minHeight: '420px',
      padding: '1rem 1.1rem',
    },
    '.cm-content': {
      caretColor: '#f8fafc',
    },
    '.cm-line': {
      padding: '0',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    },
    '.cm-entity-pill': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.38rem',
      margin: '0 0.08rem',
      padding: '0.18rem 0.62rem',
      borderRadius: '999px',
      backgroundColor: 'rgba(59, 130, 246, 0.14)',
      color: '#dbeafe',
      border: '1px solid rgba(125, 211, 252, 0.2)',
      boxShadow: '0 10px 20px rgba(15, 23, 42, 0.18)',
      verticalAlign: 'baseline',
      cursor: 'pointer',
    },
    '.cm-entity-pill-icon': {
      fontSize: '0.68rem',
      color: '#7dd3fc',
    },
    '.cm-entity-pill-label': {
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    '.cm-md-heading': {
      color: '#f8fafc',
      fontWeight: '700',
      letterSpacing: '-0.025em',
    },
    '.cm-md-heading-1': {
      fontSize: 'clamp(1.9rem, 2.35vw, 2.5rem)',
      lineHeight: '1.06',
    },
    '.cm-md-heading-2': {
      fontSize: 'clamp(1.28rem, 1.8vw, 1.7rem)',
      lineHeight: '1.16',
    },
    '.cm-md-heading-3': {
      fontSize: '1.08rem',
      lineHeight: '1.24',
    },
    '.cm-md-heading-line': {
      paddingTop: '0.12rem',
      paddingBottom: '0.12rem',
    },
    '.cm-activeLine, .cm-gutterElement': {
      backgroundColor: 'transparent',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.22) !important',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#f8fafc',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(59, 130, 246, 0.22)',
    },
    '.cm-panels': {
      backgroundColor: 'rgba(10, 16, 28, 0.98)',
      color: '#dbe6f5',
    },
  },
  { dark: true },
)

type EditorPanelProps = {
  entity: EntityRecord
  draft: DraftState
  templates: EntityTemplate[]
  editorViewRef: RefObject<EditorView | null>
  referenceSuggestion: SuggestionState | null
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

const REFERENCE_TOKEN_PATTERN = /(\{\{entity:[^|}]+\|[^}]+\}\})/g

function renderInlineContent(text: string) {
  return text.split(REFERENCE_TOKEN_PATTERN).map((chunk, index) => {
    const token = getReferenceTokens(chunk)[0]
    if (!token) {
      return <span key={`${chunk}-${index}`}>{chunk}</span>
    }

    return (
      <span
        key={`${token.raw}-${index}`}
        className="editor-inline-pill"
        contentEditable={false}
        spellCheck={false}
      >
        {token.label}
      </span>
    )
  })
}

function renderDocument(content: string): ReactNode {
  if (!content) {
    return <span className="editor-placeholder">Escribe aquí la entidad. Usa {'{{}}'} para referencias cruzadas.</span>
  }

  return content.split('\n').map((line, index) => {
    const trimmed = line.trim()

    if (!trimmed) {
      return <div key={`blank-${index}`} className="doc-blank" aria-hidden="true" />
    }

    if (trimmed.startsWith('### ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-heading doc-heading-3">
          {renderInlineContent(line.replace(/^\s*###\s+/, ''))}
        </div>
      )
    }

    if (trimmed.startsWith('## ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-heading doc-heading-2">
          {renderInlineContent(line.replace(/^\s*##\s+/, ''))}
        </div>
      )
    }

    if (trimmed.startsWith('# ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-heading doc-heading-1">
          {renderInlineContent(line.replace(/^\s*#\s+/, ''))}
        </div>
      )
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-list-item">
          <span className="doc-list-bullet">•</span>
          <span>{renderInlineContent(line.replace(/^\s*[-*]\s+/, ''))}</span>
        </div>
      )
    }

    return (
      <div key={`line-${index}`} className="doc-block doc-paragraph">
        {renderInlineContent(line)}
      </div>
    )
  })
}

export function EditorPanel({
  entity,
  draft,
  templates,
  editorViewRef,
  referenceSuggestion,
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
  const [previewContent, setPreviewContent] = useState(draft.content)
  const [suggestionPosition, setSuggestionPosition] = useState<{ top: number; left: number } | null>(null)
  const editorShellRef = useRef<HTMLDivElement | null>(null)
  const previewPaneRef = useRef<HTMLDivElement | null>(null)
  const scrollSyncLockRef = useRef<'source' | 'preview' | null>(null)

  const sourceEditorExtensions = useMemo(
    () => [markdown(), EditorView.lineWrapping, baseEditorTheme],
    [],
  )
  const liveEditorExtensions = useMemo(
    () => [markdown(), EditorView.lineWrapping, baseEditorTheme, livePreviewDecorations],
    [],
  )

  function handleCursorActivity(selectionEnd: number | null) {
    setCursorPosition(Math.max(selectionEnd ?? 0, 0))
  }

  function syncPreviewScrollFromEditor(view: EditorView) {
    if (editorMode !== 'split' || scrollSyncLockRef.current === 'preview' || !previewPaneRef.current) {
      return
    }

    const sourceScroll = view.scrollDOM
    const preview = previewPaneRef.current
    const sourceMax = sourceScroll.scrollHeight - sourceScroll.clientHeight
    const previewMax = preview.scrollHeight - preview.clientHeight

    if (previewMax <= 0 || sourceMax <= 0) {
      preview.scrollTop = 0
      return
    }

    scrollSyncLockRef.current = 'source'
    preview.scrollTop = (sourceScroll.scrollTop / sourceMax) * previewMax
    window.requestAnimationFrame(() => {
      if (scrollSyncLockRef.current === 'source') {
        scrollSyncLockRef.current = null
      }
    })
  }

  function syncEditorScrollFromPreview() {
    const view = editorViewRef.current
    const preview = previewPaneRef.current
    if (editorMode !== 'split' || !view || !preview || scrollSyncLockRef.current === 'source') {
      return
    }

    const sourceScroll = view.scrollDOM
    const sourceMax = sourceScroll.scrollHeight - sourceScroll.clientHeight
    const previewMax = preview.scrollHeight - preview.clientHeight

    if (sourceMax <= 0 || previewMax <= 0) {
      sourceScroll.scrollTop = 0
      return
    }

    scrollSyncLockRef.current = 'preview'
    sourceScroll.scrollTop = (preview.scrollTop / previewMax) * sourceMax
    window.requestAnimationFrame(() => {
      if (scrollSyncLockRef.current === 'preview') {
        scrollSyncLockRef.current = null
      }
    })
  }

  useEffect(() => {
    const delay = editorMode === 'split' ? 32 : 0
    const timeoutId = window.setTimeout(() => setPreviewContent(draft.content), delay)
    return () => window.clearTimeout(timeoutId)
  }, [draft.content, draft.entityId, editorMode])

  useEffect(() => {
    if (!referenceSuggestion) {
      const frameId = window.requestAnimationFrame(() => setSuggestionPosition(null))
      return () => window.cancelAnimationFrame(frameId)
    }

    const frameId = window.requestAnimationFrame(() => {
      const view = editorViewRef.current
      const shell = editorShellRef.current
      if (!view || !shell) {
        return
      }

      const coords = view.coordsAtPos(referenceSuggestion.end)
      const shellRect = shell.getBoundingClientRect()
      if (!coords) {
        setSuggestionPosition({ top: 18, left: 18 })
        return
      }

      const maxLeft = Math.max(16, shell.clientWidth - 320)
      setSuggestionPosition({
        top: Math.max(12, coords.bottom - shellRect.top + 12),
        left: Math.min(Math.max(12, coords.left - shellRect.left), maxLeft),
      })
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [cursorPosition, editorMode, editorViewRef, referenceSuggestion])

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
      syncPreviewScrollFromEditor(view)
    },
    onChange: (value: string, viewUpdate: ViewUpdate) => {
      const nextSelectionEnd = viewUpdate.state.selection.main.head
      editorViewRef.current = viewUpdate.view
      onHandleEditorChange(value, nextSelectionEnd)
      handleCursorActivity(nextSelectionEnd)
      syncPreviewScrollFromEditor(viewUpdate.view)
    },
    onUpdate: (viewUpdate: ViewUpdate) => {
      editorViewRef.current = viewUpdate.view
      handleCursorActivity(viewUpdate.state.selection.main.head)
      syncPreviewScrollFromEditor(viewUpdate.view)
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
        <div
          ref={previewPaneRef}
          className="editor-pane editor-preview-pane"
          onScroll={syncEditorScrollFromPreview}
        >
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
      <div className="editor-stack editor-live-stack">
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
        <div ref={editorShellRef} className="editor-surface-shell">
          {editorSurface}

          {referenceSuggestion && suggestionOptions.length > 0 && suggestionPosition && (
            <div
              className="suggestions-popover suggestions-popover-floating"
              style={{ top: suggestionPosition.top, left: suggestionPosition.left }}
            >
              {suggestionOptions.map((option) => (
                <button key={option.id} type="button" onClick={() => onInsertReference(option)}>
                  <strong>{option.title}</strong>
                  <span>{option.aliases.join(', ') || 'Sin aliases'}</span>
                </button>
              ))}
            </div>
          )}
        </div>

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

        <div className="split-grid editor-document-shell">{documentEditor}</div>

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

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

import type { EditorMode } from '../../types/editor'
import type { DraftState, EntityRecord, EntityTemplate, FieldValue, LlmStreamStatus } from '../../types/workspace'
import { PanelSection } from '../common/PanelSection'
import {
  type EntityHoverPayload,
  createGhostTextExtensions,
  createLiveEditorExtensions,
  createNarrativeGhostTextProvider,
  createSourceEditorExtensions,
} from '../editor/editorExperience'
import { baseEditorTheme, editorBasicSetup, editorModes } from '../editor/editorThemes'
import { renderDocument } from '../editor/renderDocument'
import { EditorAssets } from '../editor/panel/EditorAssets'
import { EditorHeader } from '../editor/panel/EditorHeader'
import { EditorMetadata } from '../editor/panel/EditorMetadata'
import { EditorProperties } from '../editor/panel/EditorProperties'
import { EditorSuggestions } from '../editor/panel/EditorSuggestions'
import { EntityHover } from '../editor/panel/EntityHover'

type EditorPanelProps = {
  entity: EntityRecord
  draft: DraftState
  templates: EntityTemplate[]
  allEntities: EntityRecord[]
  editorViewRef: RefObject<EditorView | null>
  referenceSuggestionActive: boolean
  suggestionOptions: EntityRecord[]
  saveStatus: 'idle' | 'saving' | 'saved'
  streamStatus: LlmStreamStatus
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
  streamStatus,
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
  const isAiStreaming = streamStatus === 'streaming'

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

    const estimatePopoverHeight = () => {
      const rows = Math.min(suggestionOptions.length, 5)
      return 52 + rows * 48
    }

    const updatePosition = () => {
      const caret = view.coordsAtPos(view.state.selection.main.head)
      const laneRect = lane.getBoundingClientRect()
      const fallbackTop = 24
      const fallbackLeft = 24
      const estimatedHeight = estimatePopoverHeight()

      if (!caret) {
        setSuggestionsStyle({ top: fallbackTop, left: fallbackLeft, width: Math.min(420, laneRect.width - 48) })
        return
      }

      const nextLeft = Math.max(20, Math.min(caret.left - laneRect.left - 12, laneRect.width - 380))
      const lowerTop = Math.max(20, caret.bottom - laneRect.top + 12)
      const canFitBelow = lowerTop + estimatedHeight <= laneRect.height - 12
      const upperTop = Math.max(12, caret.top - laneRect.top - estimatedHeight - 12)
      const nextTop = canFitBelow ? lowerTop : upperTop

      setSuggestionsStyle({
        top: nextTop,
        left: nextLeft,
        width: Math.min(360, Math.max(260, laneRect.width - nextLeft - 20)),
      })
    }

    let rafId = 0
    const requestPositionUpdate = () => {
      if (rafId !== 0) {
        return
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = 0
        updatePosition()
      })
    }

    updatePosition()
    const scrollTarget = view.scrollDOM
    window.addEventListener('resize', requestPositionUpdate)
    window.addEventListener('scroll', requestPositionUpdate, { passive: true, capture: true })
    scrollTarget.addEventListener('scroll', requestPositionUpdate, { passive: true })
    lane.addEventListener('scroll', requestPositionUpdate, { passive: true })
    window.visualViewport?.addEventListener('resize', requestPositionUpdate)
    window.visualViewport?.addEventListener('scroll', requestPositionUpdate)

    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId)
      }
      window.removeEventListener('resize', requestPositionUpdate)
      window.removeEventListener('scroll', requestPositionUpdate, true)
      scrollTarget.removeEventListener('scroll', requestPositionUpdate)
      lane.removeEventListener('scroll', requestPositionUpdate)
      window.visualViewport?.removeEventListener('resize', requestPositionUpdate)
      window.visualViewport?.removeEventListener('scroll', requestPositionUpdate)
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
      <div
        ref={writingLaneRef}
        className={[
          zenMode ? 'writing-lane zen-writing-lane' : 'writing-lane',
          isAiStreaming ? 'ai-streaming' : '',
        ].filter(Boolean).join(' ')}
        aria-live="polite"
        aria-busy={isAiStreaming || undefined}
      >
        <span className="visually-hidden">
          {isAiStreaming ? 'La inteligencia artificial está generando contenido.' : 'La generación de inteligencia artificial está detenida.'}
        </span>

        {editorSurface}

        <EditorSuggestions
          active={referenceSuggestionActive}
          options={suggestionOptions}
          style={suggestionsStyle}
          onInsertReference={onInsertReference}
        />

        <EntityHover position={hoveredReference} entity={hoveredEntity} />

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

      <EditorHeader
        draft={draft}
        entity={entity}
        saveStatus={saveStatus}
        zenMode={zenMode}
        onDraftChange={onDraftChange}
        onApplyTemplate={onApplyTemplate}
        onDuplicate={onDuplicate}
        onArchive={onArchive}
        onDelete={onDelete}
        onGenerateAiProposal={onGenerateAiProposal}
        onToggleZenMode={onToggleZenMode}
      />

      <div className="editor-grid">
        <EditorMetadata draft={draft} templates={templates} zenMode={zenMode} onDraftChange={onDraftChange} />

        <div className="split-grid">{documentEditor}</div>

        <div className={zenMode ? 'split-grid editor-side-shell is-hidden' : 'split-grid editor-side-shell'}>
          <EditorProperties
            fields={draft.fields as FieldValue[]}
            assetCount={entity.assets.length}
            onAddField={onAddField}
            onUpdateField={onUpdateField}
            onRemoveField={onRemoveField}
          />

          <EditorAssets assets={entity.assets} />
        </div>
      </div>
    </section>
  )
}

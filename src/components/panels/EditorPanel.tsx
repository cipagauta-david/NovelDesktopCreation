import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type RefObject,
} from 'react'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import CodeMirror from '@uiw/react-codemirror'

import type { DraftState, EntityRecord, EntityTemplate, FieldValue, LlmStreamStatus } from '../../types/workspace'
import {
  type EntityHoverPayload,
  createGhostTextExtensions,
  createLiveEditorExtensions,
  createNarrativeGhostTextProvider,
} from '../editor/editorExperience'
import { baseEditorTheme, editorBasicSetup } from '../editor/editorThemes'
import { EditorAssets } from '../editor/panel/EditorAssets'
import { EditorDocumentSection } from '../editor/panel/EditorDocumentSection'
import { EditorHeader } from '../editor/panel/EditorHeader'
import { EditorMetadata } from '../editor/panel/EditorMetadata'
import { EditorProperties } from '../editor/panel/EditorProperties'
import '../../styles/panels/EditorPanel.css';



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
  const [cursorPosition, setCursorPosition] = useState(0)
  const [suggestionsStyle, setSuggestionsStyle] = useState<CSSProperties>()
  const [hoveredReference, setHoveredReference] = useState<{
    entityId: string
    left: number
    top: number
  } | null>(null)
  const [hoverPayload, setHoverPayload] = useState<EntityHoverPayload | null>(null)
  const [assetDragActive, setAssetDragActive] = useState(false)
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false)
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

  const hasValidImageDrag = useCallback((event: DragEvent<HTMLElement>) => {
    const { dataTransfer } = event
    if (!dataTransfer) {
      return false
    }

    if (!Array.from(dataTransfer.types).includes('Files')) {
      return false
    }

    if (dataTransfer.items.length === 0) {
      return true
    }

    return Array.from(dataTransfer.items).some((item) => {
      if (item.kind !== 'file') {
        return false
      }
      return item.type === '' || item.type.startsWith('image/')
    })
  }, [])

  function handleCursorActivity(selectionEnd: number | null) {
    setCursorPosition(Math.max(selectionEnd ?? 0, 0))
  }

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setHoveredReference(null)
      setHoverPayload(null)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [draft.entityId])

  useEffect(() => {
    if (zenMode) {
      setDetailsPanelOpen(false)
    }
  }, [zenMode])

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
  }, [cursorPosition, editorViewRef, referenceSuggestionActive, suggestionOptions.length])

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

  const editorSurface = (
    <CodeMirror
      {...commonEditorProps}
      extensions={liveEditorExtensions}
      className="editor-code-mirror editor-live-editor"
      aria-label="Editor narrativo inmersivo"
    />
  )

  const documentEditor = (
    <EditorDocumentSection
      zenMode={zenMode}
      isAiStreaming={isAiStreaming}
      assetDragActive={assetDragActive}
      writingLaneRef={writingLaneRef}
      editorSurface={editorSurface}
      referenceSuggestionActive={referenceSuggestionActive}
      suggestionOptions={suggestionOptions}
      suggestionsStyle={suggestionsStyle}
      onInsertReference={onInsertReference}
      hoveredReference={hoveredReference}
      hoveredEntity={hoveredEntity}
      hasValidImageDrag={hasValidImageDrag}
      onAttachImages={onAttachImages}
      setAssetDragActive={setAssetDragActive}
    />
  )

  return (
    <section className={`editor-panel ${zenMode ? 'editor-panel-zen' : ''} ${isAiStreaming ? 'is-streaming' : ''}`} aria-label="Editor principal">
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
        detailsOpen={detailsPanelOpen}
        onToggleDetails={() => setDetailsPanelOpen((current) => !current)}
      />

      <div className="editor-grid">
        {documentEditor}
      </div>

      {!zenMode && (
        <aside className={detailsPanelOpen ? 'editor-details-drawer open' : 'editor-details-drawer'} aria-label="Detalles de entidad">
          <EditorMetadata draft={draft} templates={templates} zenMode={zenMode} onDraftChange={onDraftChange} />
          <EditorProperties
            fields={draft.fields as FieldValue[]}
            assetCount={entity.assets.length}
            onAddField={onAddField}
            onUpdateField={onUpdateField}
            onRemoveField={onRemoveField}
          />
          <EditorAssets assets={entity.assets} onAttachImages={onAttachImages} />
        </aside>
      )}
    </section>
  )
}

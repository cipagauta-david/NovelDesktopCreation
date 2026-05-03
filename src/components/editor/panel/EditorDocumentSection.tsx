import { memo, useCallback, type CSSProperties, type DragEvent, type ReactNode, type RefObject } from 'react'

import { cn } from '@/lib/utils'
import type { EntityRecord } from '../../../types/workspace'
import { EditorSuggestions } from './EditorSuggestions'
import { EntityHover } from './EntityHover'

type EditorDocumentSectionProps = {
  zenMode: boolean
  isAiStreaming: boolean
  assetDragActive: boolean
  writingLaneRef: RefObject<HTMLDivElement | null>
  editorSurface: ReactNode
  referenceSuggestionActive: boolean
  suggestionOptions: EntityRecord[]
  suggestionsStyle?: CSSProperties
  onInsertReference: (entity: EntityRecord) => void
  hoveredReference: {
    entityId: string
    left: number
    top: number
  } | null
  hoveredEntity: EntityRecord | null
  hasValidImageDrag: (event: DragEvent<HTMLElement>) => boolean
  onAttachImages: (files: FileList | null) => Promise<void>
  setAssetDragActive: (active: boolean) => void
}

export const EditorDocumentSection = memo(function EditorDocumentSection({
  zenMode,
  isAiStreaming,
  assetDragActive,
  writingLaneRef,
  editorSurface,
  referenceSuggestionActive,
  suggestionOptions,
  suggestionsStyle,
  onInsertReference,
  hoveredReference,
  hoveredEntity,
  hasValidImageDrag,
  onAttachImages,
  setAssetDragActive,
}: EditorDocumentSectionProps) {
  const handleImageDragActivate = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasValidImageDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setAssetDragActive(true)
  }, [hasValidImageDrag, setAssetDragActive])

  // V0ID_NOTE: extracting these into useCallback prevents new function instances on every
  // render — inline handlers inside JSX defeat the entire point of memo on this component.
  const handleDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setAssetDragActive(false)
    }
  }, [setAssetDragActive])

  const handleDrop = useCallback((event: DragEvent<HTMLElement>) => {
    if (!hasValidImageDrag(event)) return
    event.preventDefault()
    setAssetDragActive(false)
    void onAttachImages(event.dataTransfer.files)
  }, [hasValidImageDrag, onAttachImages, setAssetDragActive])

  return (
    <section className="editor-doc-shell" aria-label="Documento">
      <div
        ref={writingLaneRef}
        className={cn(
          zenMode ? 'writing-lane zen-writing-lane' : 'writing-lane',
          isAiStreaming && 'ai-streaming',
          assetDragActive && 'is-file-dragging'
        )}
        aria-live="polite"
        aria-busy={isAiStreaming || undefined}
        onDragEnter={handleImageDragActivate}
        onDragOver={handleImageDragActivate}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <span className="visually-hidden">
          {isAiStreaming
            ? 'La inteligencia artificial esta generando contenido.'
            : 'La generacion de inteligencia artificial esta detenida.'}
        </span>

        {editorSurface}

        {assetDragActive && (
          <div className="editor-drop-overlay" aria-live="polite">
            <strong>Suelta imagenes para anexarlas a la entidad activa</strong>
            <span>Se agregaran al panel de assets de esta entidad.</span>
          </div>
        )}
      </div>

      {/* Popovers live outside .writing-lane (which has overflow:hidden) so they
          are never clipped. editor-doc-shell carries position:relative as anchor. */}
      <EditorSuggestions
        active={referenceSuggestionActive}
        options={suggestionOptions}
        style={suggestionsStyle}
        onInsertReference={onInsertReference}
      />

      <EntityHover position={hoveredReference} entity={hoveredEntity} />
    </section>
  )
})

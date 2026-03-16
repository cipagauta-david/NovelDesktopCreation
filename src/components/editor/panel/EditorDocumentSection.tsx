import type { CSSProperties, Dispatch, DragEvent, ReactNode, RefObject, SetStateAction } from 'react'

import type { EntityRecord } from '../../../types/workspace'
import { PanelSection } from '../../common/PanelSection'
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
  setAssetDragActive: Dispatch<SetStateAction<boolean>>
}

export function EditorDocumentSection({
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
  return (
    <PanelSection title="Documento" meta="Usa {{}} para enlazar entidades relacionadas" className="editor-doc-shell">
      <div
        ref={writingLaneRef}
        className={[
          zenMode ? 'writing-lane zen-writing-lane' : 'writing-lane',
          isAiStreaming ? 'ai-streaming' : '',
          assetDragActive ? 'is-file-dragging' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-live="polite"
        aria-busy={isAiStreaming || undefined}
        onDragEnter={(event) => {
          if (!hasValidImageDrag(event)) {
            return
          }
          event.preventDefault()
          setAssetDragActive(true)
        }}
        onDragOver={(event) => {
          if (!hasValidImageDrag(event)) {
            return
          }
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
          if (!assetDragActive) {
            setAssetDragActive(true)
          }
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setAssetDragActive(false)
          }
        }}
        onDrop={(event) => {
          if (!hasValidImageDrag(event)) {
            return
          }
          event.preventDefault()
          setAssetDragActive(false)
          void onAttachImages(event.dataTransfer.files)
        }}
      >
        <span className="visually-hidden">
          {isAiStreaming
            ? 'La inteligencia artificial esta generando contenido.'
            : 'La generacion de inteligencia artificial esta detenida.'}
        </span>

        {editorSurface}

        <EditorSuggestions
          active={referenceSuggestionActive}
          options={suggestionOptions}
          style={suggestionsStyle}
          onInsertReference={onInsertReference}
        />

        <EntityHover position={hoveredReference} entity={hoveredEntity} />

        {assetDragActive && (
          <div className="editor-drop-overlay" aria-live="polite">
            <strong>Suelta imagenes para anexarlas a la entidad activa</strong>
            <span>Se agregaran al panel de assets de esta entidad.</span>
          </div>
        )}
      </div>
    </PanelSection>
  )
}

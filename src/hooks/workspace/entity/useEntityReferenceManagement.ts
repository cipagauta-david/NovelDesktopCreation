import { useRef } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { EditorView } from '@codemirror/view'
import { EditorSelection } from '@codemirror/state'

import type { DraftState, EntityRecord, Project } from '../../../types/workspace'
import { buildStructuredReference } from '../../../utils/references'

type ReferenceSuggestion = { start: number; end: number; query: string } | null

type UseEntityReferenceManagementArgs = {
  activeProject: Project | undefined
  activeDraft: DraftState | null
  setDraft: Dispatch<SetStateAction<DraftState | null>>
  referenceSuggestion: ReferenceSuggestion
  setReferenceSuggestion: Dispatch<SetStateAction<ReferenceSuggestion>>
  selectEntity: (entityId: string, tabId?: string) => void
  setToast: (msg: string) => void
}

export function useEntityReferenceManagement({
  activeProject,
  activeDraft,
  setDraft,
  referenceSuggestion,
  setReferenceSuggestion,
  selectEntity,
  setToast,
}: UseEntityReferenceManagementArgs) {
  const editorViewRef = useRef<EditorView | null>(null)

  function insertReference(entity: EntityRecord) {
    if (!activeDraft || !editorViewRef.current || !referenceSuggestion) return
    const replacement = buildStructuredReference(entity.id, entity.title)
    const nextContent = `${activeDraft.content.slice(0, referenceSuggestion.start)}${replacement}${activeDraft.content.slice(referenceSuggestion.end)}`
    setDraft({ ...activeDraft, content: nextContent })
    setReferenceSuggestion(null)

    requestAnimationFrame(() => {
      const nextPosition = referenceSuggestion.start + replacement.length
      const view = editorViewRef.current
      if (!view) {
        return
      }

      view.focus()
      view.dispatch({ selection: EditorSelection.cursor(nextPosition) })
    })
  }

  function handleEditorChange(value: string, selectionEnd: number | null) {
    if (!activeDraft) return
    setDraft({ ...activeDraft, content: value })
    if (selectionEnd == null) {
      setReferenceSuggestion(null)
      return
    }

    const priorText = value.slice(0, selectionEnd)
    const openIndex = priorText.lastIndexOf('{{')
    const closeIndex = priorText.lastIndexOf('}}')
    if (openIndex > closeIndex) {
      const query = priorText.slice(openIndex + 2)
      if (!query.includes('\n')) {
        setReferenceSuggestion({ start: openIndex, end: selectionEnd, query })
        return
      }
    }
    setReferenceSuggestion(null)
  }

  function navigateFromReference(entityId: string, ctrlKey: boolean) {
    if (!activeProject) return
    const entity = activeProject.entities.find((entry) => entry.id === entityId)
    if (!entity) return
    if (!ctrlKey) {
      setToast('Usa Ctrl + click para navegar y click normal para seguir editando.')
      return
    }
    selectEntity(entity.id, entity.tabId)
    setToast(`Navegaste a ${entity.title}.`)
  }

  return {
    editorViewRef,
    insertReference,
    handleEditorChange,
    navigateFromReference,
  }
}

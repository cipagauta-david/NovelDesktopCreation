import type { Dispatch, SetStateAction } from 'react'

import type {
  PersistedState,
  Project,
  CollectionTab,
  EntityRecord,
  DraftState,
  WorkspaceView,
} from '../../types/workspace'
import { useEntityCrudManagement } from './entity/useEntityCrudManagement'
import { useEntityDraftManagement } from './entity/useEntityDraftManagement'
import { useEntityReferenceManagement } from './entity/useEntityReferenceManagement'

export function useEntityManagement(
  setData: Dispatch<SetStateAction<PersistedState>>,
  activeProject: Project | undefined,
  activeTab: CollectionTab | null,
  activeEntity: EntityRecord | null,
  activeDraft: DraftState | null,
  activeTabEntities: EntityRecord[],
  setDraft: Dispatch<SetStateAction<DraftState | null>>,
  referenceSuggestion: { start: number; end: number; query: string } | null,
  setReferenceSuggestion: Dispatch<SetStateAction<{ start: number; end: number; query: string } | null>>,
  setWorkspaceView: Dispatch<SetStateAction<WorkspaceView>>,
  withProjectUpdate: (projectId: string, updater: (project: Project) => Project) => void,
  setToast: (msg: string) => void
) {
  const crud = useEntityCrudManagement({
    setData,
    activeProject,
    activeTab,
    activeEntity,
    activeDraft,
    activeTabEntities,
    setDraft,
    setWorkspaceView,
    withProjectUpdate,
    setToast,
  })

  const draft = useEntityDraftManagement({
    activeProject,
    activeEntity,
    activeDraft,
    setDraft,
    withProjectUpdate,
    setToast,
  })

  const references = useEntityReferenceManagement({
    activeProject,
    activeDraft,
    setDraft,
    referenceSuggestion,
    setReferenceSuggestion,
    selectEntity: crud.selectEntity,
    setToast,
  })

  return {
    editorViewRef: references.editorViewRef,
    newEntityTemplateId: crud.newEntityTemplateId,
    setNewEntityTemplateId: crud.setNewEntityTemplateId,
    selectedNewEntityTemplateId: crud.selectedNewEntityTemplateId,
    selectEntity: crud.selectEntity,
    createEntity: crud.createEntity,
    duplicateActiveEntity: crud.duplicateActiveEntity,
    archiveActiveEntity: crud.archiveActiveEntity,
    deleteActiveEntity: crud.deleteActiveEntity,
    applyActiveTemplate: crud.applyActiveTemplate,
    addField: draft.addField,
    updateField: draft.updateField,
    removeField: draft.removeField,
    attachImages: draft.attachImages,
    insertReference: references.insertReference,
    handleEditorChange: references.handleEditorChange,
    navigateFromReference: references.navigateFromReference,
    saveCurrentAsTemplate: crud.saveCurrentAsTemplate,
  }
}

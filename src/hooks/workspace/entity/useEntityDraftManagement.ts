import type { Dispatch, SetStateAction } from 'react'

import type { DraftState, EntityRecord, FieldValue, Project } from '../../../types/workspace'
import { createHistoryEvent, isoNow, uid } from '../../../utils/workspace'

type UseEntityDraftManagementArgs = {
  activeProject: Project | undefined
  activeEntity: EntityRecord | null
  activeDraft: DraftState | null
  setDraft: Dispatch<SetStateAction<DraftState | null>>
  withProjectUpdate: (projectId: string, updater: (project: Project) => Project) => void
  setToast: (msg: string) => void
}

export function useEntityDraftManagement({
  activeProject,
  activeEntity,
  activeDraft,
  setDraft,
  withProjectUpdate,
  setToast,
}: UseEntityDraftManagementArgs) {
  function addField() {
    if (!activeDraft) return
    setDraft({
      ...activeDraft,
      fields: [...activeDraft.fields, { id: uid('field'), key: 'Nuevo field', value: '' }],
    })
  }

  function updateField(fieldId: string, key: 'key' | 'value', value: string) {
    if (!activeDraft) return
    setDraft({
      ...activeDraft,
      fields: activeDraft.fields.map((field) =>
        field.id === fieldId ? { ...field, [key]: value } : field,
      ),
    })
  }

  function removeField(fieldId: string) {
    if (!activeDraft) return
    setDraft({
      ...activeDraft,
      fields: activeDraft.fields.filter((field) => field.id !== fieldId),
    })
  }

  async function attachImages(files: FileList | null) {
    if (!files || !activeProject) return
    if (!activeEntity) {
      setToast('Selecciona una entidad antes de soltar imágenes en el workspace.')
      return
    }
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) {
      setToast('Solo se admiten archivos de imagen para assets.')
      return
    }

    const assets = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<FieldValue>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                id: uid('asset'),
                key: file.name,
                value: reader.result as string,
              })
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          }),
      ),
    )

    withProjectUpdate(activeProject.id, (project) => ({
      ...project,
      updatedAt: isoNow(),
      entities: project.entities.map((entity) =>
        entity.id !== activeEntity.id
          ? entity
          : {
              ...entity,
              assets: [
                ...assets.map((asset) => ({
                  id: asset.id,
                  name: asset.key,
                  mimeType: 'image/*',
                  dataUrl: asset.value,
                })),
                ...entity.assets,
              ],
              revision: entity.revision + 1,
              updatedAt: isoNow(),
              history: [
                createHistoryEvent('Assets añadidos', `${assets.length} imagen(es) anexadas.`),
                ...entity.history,
              ].slice(0, 20),
            },
      ),
    }))
    setToast(`${assets.length} imagen(es) añadidas al proyecto.`)
  }

  return {
    addField,
    updateField,
    removeField,
    attachImages,
  }
}

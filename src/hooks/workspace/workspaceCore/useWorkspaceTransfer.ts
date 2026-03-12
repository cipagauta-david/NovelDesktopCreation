import { useCallback } from 'react'

import type { Dispatch, SetStateAction } from 'react'
import type { PersistedState, Project } from '../../../types/workspace'
import { downloadProjectAsJson } from '../../../utils/exportImport/exportProject'
import { promptFileImport } from '../../../utils/exportImport/importProject'

type UseWorkspaceTransferArgs = {
  activeProject: Project | undefined
  setData: Dispatch<SetStateAction<PersistedState>>
  setToast: (message: string) => void
}

export function useWorkspaceTransfer({ activeProject, setData, setToast }: UseWorkspaceTransferArgs) {
  const exportActiveProject = useCallback(() => {
    if (!activeProject) return
    downloadProjectAsJson(activeProject)
    setToast(`Proyecto "${activeProject.name}" exportado.`)
  }, [activeProject, setToast])

  const importProject = useCallback(async () => {
    const result = await promptFileImport()
    if (!result.ok) {
      if (result.error !== 'Importación cancelada.') {
        setToast(result.error)
      }
      return
    }
    setData((current) => ({
      ...current,
      projects: [result.project, ...current.projects],
      activeProjectId: result.project.id,
      activeTabId: result.project.tabs[0]?.id ?? '',
      activeEntityId: result.project.entities[0]?.id ?? '',
    }))
    setToast(`Proyecto "${result.project.name}" importado correctamente.`)
  }, [setData, setToast])

  return {
    exportActiveProject,
    importProject,
  }
}

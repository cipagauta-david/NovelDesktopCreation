import { useCallback } from 'react'

import type { Dispatch, SetStateAction } from 'react'
import type { PersistedState, Project } from '../../../types/workspace'
import { addBreadcrumb } from '../../../services/observability'
import { downloadProjectAsJson } from '../../../utils/exportImport/exportProject'
import { promptFileImport } from '../../../utils/exportImport/importProject'
import { createChangeEvent } from '../../../utils/workspace'

type UseWorkspaceTransferArgs = {
  activeProject: Project | undefined
  setData: Dispatch<SetStateAction<PersistedState>>
  setToast: (message: string) => void
}

export function useWorkspaceTransfer({ activeProject, setData, setToast }: UseWorkspaceTransferArgs) {
  const exportActiveProject = useCallback(() => {
    if (!activeProject) return
    addBreadcrumb('Export de proyecto', 'workspace.export', { projectId: activeProject.id })
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
      changeLog: [
        ...current.changeLog,
        createChangeEvent({
          label: 'Proyecto importado',
          details: `Importado ${result.project.name}.`,
          actorType: 'system',
          projectId: result.project.id,
        }),
      ],
    }))
    addBreadcrumb('Import de proyecto', 'workspace.import', { projectId: result.project.id })
    setToast(`Proyecto "${result.project.name}" importado correctamente.`)
  }, [setData, setToast])

  return {
    exportActiveProject,
    importProject,
  }
}

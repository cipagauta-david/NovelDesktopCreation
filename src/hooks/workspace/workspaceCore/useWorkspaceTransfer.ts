import { useCallback } from 'react'

import type { Dispatch, SetStateAction } from 'react'
import type { PersistedState, Project } from '../../../types/workspace'
import { addBreadcrumb } from '../../../services/observability'
import { downloadProjectAsJson } from '../../../utils/exportImport/exportProject'
import { promptFileImport } from '../../../utils/exportImport/importProject'
import { appendCheckpoint, appendCorrelationReport, createChangeEvent, createCheckpoint } from '../../../utils/workspace'
import { finalizeCorrelationIntent, startCorrelationIntent } from '../../../services/correlation'

type UseWorkspaceTransferArgs = {
  activeProject: Project | undefined
  setData: Dispatch<SetStateAction<PersistedState>>
  setToast: (message: string) => void
}

export function useWorkspaceTransfer({ activeProject, setData, setToast }: UseWorkspaceTransferArgs) {
  const exportActiveProject = useCallback(async () => {
    if (!activeProject) return
    const correlationId = startCorrelationIntent('workspace.export')
    addBreadcrumb('Export de proyecto', 'workspace.export', { projectId: activeProject.id })
    await downloadProjectAsJson(activeProject)
    setData((current) => {
      const report = finalizeCorrelationIntent(correlationId, 'ok')
      return report ? appendCorrelationReport(current, report) : current
    })
    setToast(`Proyecto "${activeProject.name}" exportado.`)
  }, [activeProject, setData, setToast])

  const importProject = useCallback(async () => {
    const correlationId = startCorrelationIntent('workspace.import')
    const result = await promptFileImport()
    if (!result.ok) {
      if (result.error !== 'Importación cancelada.') {
        setToast(result.error)
      }
      return
    }
    setData((current) => {
      const next = {
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
            intent: 'workspace.import',
            correlationId,
          }),
        ],
      }
      const withCheckpoint = appendCheckpoint(next, createCheckpoint(next, {
        label: 'Proyecto importado',
        correlationId,
      }))
      const report = finalizeCorrelationIntent(correlationId, 'ok')
      return report ? appendCorrelationReport(withCheckpoint, report) : withCheckpoint
    })
    addBreadcrumb('Import de proyecto', 'workspace.import', { projectId: result.project.id })
    setToast(`Proyecto "${result.project.name}" importado correctamente.`)
  }, [setData, setToast])

  return {
    exportActiveProject,
    importProject,
  }
}

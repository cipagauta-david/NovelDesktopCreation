import { useEffect, useMemo, useRef, useState } from 'react'

type Provider = 'OpenAI' | 'Anthropic' | 'Google Gemini' | 'Local/Ollama'
type WorkspaceView = 'editor' | 'graph'
type EntityStatus = 'active' | 'archived'
type ActorType = 'user' | 'ai' | 'system'

type AppSettings = {
  authorName: string
  provider: Provider
  model: string
  apiKeyHint: string
}

type FieldValue = {
  id: string
  key: string
  value: string
}

type Asset = {
  id: string
  name: string
  mimeType: string
  dataUrl: string
}

type HistoryEvent = {
  id: string
  label: string
  details: string
  timestamp: string
  actorType: ActorType
}

type EntityTemplate = {
  id: string
  name: string
  description: string
  fields: string[]
  defaultContent: string
}

type CollectionTab = {
  id: string
  name: string
  prompt: string
  icon: string
}

type EntityRecord = {
  id: string
  tabId: string
  title: string
  content: string
  templateId: string
  tags: string[]
  aliases: string[]
  fields: FieldValue[]
  assets: Asset[]
  status: EntityStatus
  revision: number
  updatedAt: string
  history: HistoryEvent[]
}

type Project = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  tabs: CollectionTab[]
  entities: EntityRecord[]
  templates: EntityTemplate[]
  history: HistoryEvent[]
}

type PersistedState = {
  settings: AppSettings | null
  projects: Project[]
  activeProjectId: string
  activeTabId: string
  activeEntityId: string
}

type EntityDraft = {
  title: string
  content: string
  templateId: string
  tagsText: string
  aliasesText: string
  fields: FieldValue[]
}

type DraftState = EntityDraft & {
  entityId: string
}

type SuggestionState = {
  start: number
  end: number
  query: string
}

type SearchResult = {
  entityId: string
  tabId: string
  title: string
  snippet: string
  score: number
}

type AiProposal = {
  id: string
  title: string
  summary: string
  entityId: string
  contentAppend: string
  createEntityTitle: string
  createEntityContent: string
  fieldToAdd: FieldValue | null
}

type RefToken = {
  entityId: string
  label: string
  raw: string
}

const STORAGE_KEY = 'ndc-mvp-state-v1'
const providerModels: Record<Provider, string[]> = {
  OpenAI: ['gpt-4.1', 'gpt-4o-mini'],
  Anthropic: ['claude-3-7-sonnet', 'claude-3-5-haiku'],
  'Google Gemini': ['gemini-2.5-pro', 'gemini-2.0-flash'],
  'Local/Ollama': ['llama3.2', 'qwen2.5-coder'],
}

const defaultTabBlueprints: Array<Pick<CollectionTab, 'name' | 'prompt' | 'icon'>> = [
  {
    name: 'Capítulos',
    icon: '📚',
    prompt: 'Redacta escenas con tensión progresiva, continuidad impecable y ritmo cinematográfico.',
  },
  {
    name: 'Personajes',
    icon: '🧍',
    prompt: 'Profundiza en motivaciones, contradicciones internas y evolución emocional.',
  },
  {
    name: 'Escenarios',
    icon: '🏙️',
    prompt: 'Describe espacios con atmósfera, utilidad narrativa y detalles sensoriales concretos.',
  },
  {
    name: 'Historia',
    icon: '🧭',
    prompt: 'Mantén continuidad temporal, causa-efecto y claridad de eventos históricos.',
  },
  {
    name: 'Lógica del mundo',
    icon: '🧪',
    prompt: 'Define reglas consistentes, costes dramáticos y límites verificables del sistema.',
  },
]

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function isoNow(): string {
  return new Date().toISOString()
}

function createHistoryEvent(
  label: string,
  details: string,
  actorType: ActorType = 'user',
): HistoryEvent {
  return {
    id: uid('history'),
    label,
    details,
    actorType,
    timestamp: isoNow(),
  }
}

function parseCommaSeparated(value: string): string[] {
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function draftFromEntity(entity: EntityRecord): EntityDraft {
  return {
    title: entity.title,
    content: entity.content,
    templateId: entity.templateId,
    tagsText: entity.tags.join(', '),
    aliasesText: entity.aliases.join(', '),
    fields: entity.fields.map((field) => ({ ...field })),
  }
}

function draftStateFromEntity(entity: EntityRecord): DraftState {
  return {
    entityId: entity.id,
    ...draftFromEntity(entity),
  }
}

function draftPayload(draft: DraftState): EntityDraft {
  return {
    title: draft.title,
    content: draft.content,
    templateId: draft.templateId,
    tagsText: draft.tagsText,
    aliasesText: draft.aliasesText,
    fields: draft.fields,
  }
}

function getDefaultTemplates(): EntityTemplate[] {
  return [
    {
      id: uid('template'),
      name: 'Personaje núcleo',
      description: 'Ficha breve con deseo, miedo y contradicción.',
      fields: ['Rol narrativo', 'Deseo', 'Miedo', 'Secreto'],
      defaultContent:
        '## Voz\nDescribe cómo suena el personaje en escena.\n\n## Conflicto\n¿Qué pierde si falla?\n\n## Referencias\nConecta esta entidad con lugares, capítulos y reglas usando {{}}.',
    },
    {
      id: uid('template'),
      name: 'Capítulo operativo',
      description: 'Objetivo, obstáculo y giro principal.',
      fields: ['Objetivo', 'Obstáculo', 'Giro', 'POV'],
      defaultContent:
        '## Apertura\nSitúa al lector sin fricción.\n\n## Escalada\nSube presión, coste y claridad de intención.\n\n## Cierre\nDeja una nueva pregunta abierta.',
    },
    {
      id: uid('template'),
      name: 'Escenario evocador',
      description: 'Lugar con atmósfera, función y riesgos.',
      fields: ['Función', 'Clima', 'Riesgo', 'Símbolo'],
      defaultContent:
        '## Atmósfera\nEscribe sensaciones dominantes.\n\n## Utilidad narrativa\n¿Por qué este escenario importa de verdad?\n\n## Relaciones\nAnota conexiones con entidades clave.',
    },
  ]
}

function buildStructuredReference(entityId: string, label: string): string {
  return `{{entity:${entityId}|${label}}}`
}

function getReferenceTokens(content: string): RefToken[] {
  const matches = content.matchAll(/\{\{entity:([^|}]+)\|([^}]+)\}\}/g)
  return Array.from(matches, ([raw, entityId, label]) => ({ raw, entityId, label }))
}

function getPlainSnippet(content: string): string {
  return content
    .replace(/\{\{entity:[^|}]+\|([^}]+)\}\}/g, '$1')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildSeedProject(): Project {
  const templates = getDefaultTemplates()
  const tabs = defaultTabBlueprints.map((tab) => ({
    id: uid('tab'),
    name: tab.name,
    icon: tab.icon,
    prompt: tab.prompt,
  }))

  const tabByName = Object.fromEntries(tabs.map((tab) => [tab.name, tab])) as Record<
    string,
    CollectionTab
  >
  const chapterId = uid('entity')
  const characterId = uid('entity')
  const scenarioId = uid('entity')
  const historyId = uid('entity')
  const worldId = uid('entity')
  const now = isoNow()

  const entities: EntityRecord[] = [
    {
      id: chapterId,
      tabId: tabByName['Capítulos'].id,
      title: 'Capítulo 1 — La grieta de ceniza',
      content:
        `## Gancho\nAriadna detecta que el pulso del Velo cambió durante la guardia nocturna.\n\n## Escena clave\nLa alarma nace en ${buildStructuredReference(
          scenarioId,
          'Puerto Ceniza',
        )}, mientras ${buildStructuredReference(characterId, 'Ariadna Vale')} decide romper protocolo.\n\n## Consecuencia\nLa decisión obliga a revisar ${buildStructuredReference(worldId, 'Principio de Resonancia')}.`,
      templateId: templates[1].id,
      tags: ['apertura', 'misterio'],
      aliases: ['La grieta'],
      fields: [
        { id: uid('field'), key: 'Objetivo', value: 'Descubrir el origen del pulso anómalo.' },
        {
          id: uid('field'),
          key: 'Obstáculo',
          value: 'La ciudad prohíbe inspecciones sin sello del consejo.',
        },
      ],
      assets: [],
      status: 'active',
      revision: 3,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Capítulo base sembrado para el MVP.', 'system')],
    },
    {
      id: characterId,
      tabId: tabByName['Personajes'].id,
      title: 'Ariadna Vale',
      content:
        `Inspectora de grietas rituales. Confía más en patrones que en autoridades.\n\nTrabaja entre ${buildStructuredReference(
          scenarioId,
          'Puerto Ceniza',
        )} y los archivos de ${buildStructuredReference(historyId, 'La Ruptura del Norte')}.`,
      templateId: templates[0].id,
      tags: ['protagonista', 'inspectora'],
      aliases: ['Ari'],
      fields: [
        { id: uid('field'), key: 'Rol narrativo', value: 'Protagonista analítica' },
        { id: uid('field'), key: 'Deseo', value: 'Evitar una segunda ruptura dimensional.' },
        {
          id: uid('field'),
          key: 'Miedo',
          value: 'Convertirse en la causa del desastre que quiere impedir.',
        },
      ],
      assets: [],
      status: 'active',
      revision: 4,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Personaje inicial listo para edición.', 'system')],
    },
    {
      id: scenarioId,
      tabId: tabByName['Escenarios'].id,
      title: 'Puerto Ceniza',
      content:
        `Ciudad portuaria construida sobre muelles de obsidiana. Cada calle vibra cuando el Velo sufre presión.\n\nSu red de túneles conecta con ${buildStructuredReference(
          historyId,
          'La Ruptura del Norte',
        )}.`,
      templateId: templates[2].id,
      tags: ['ciudad', 'frontera'],
      aliases: ['La boca del humo'],
      fields: [
        { id: uid('field'), key: 'Función', value: 'Punto de entrada al conflicto principal.' },
        { id: uid('field'), key: 'Riesgo', value: 'Aumenta resonancia en tormentas.' },
      ],
      assets: [],
      status: 'active',
      revision: 2,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Escenario inicial preparado.', 'system')],
    },
    {
      id: historyId,
      tabId: tabByName['Historia'].id,
      title: 'La Ruptura del Norte',
      content:
        `Hace quince años, una cadena de sellos colapsó y abrió fisuras que aún condicionan la política del continente.\n\nLos registros apuntan a la primera formulación de ${buildStructuredReference(
          worldId,
          'Principio de Resonancia',
        )}.`,
      templateId: templates[1].id,
      tags: ['evento', 'pasado'],
      aliases: ['La Ruptura'],
      fields: [
        { id: uid('field'), key: 'Impacto', value: 'Redibujó el mapa político y ritual.' },
      ],
      assets: [],
      status: 'active',
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Evento histórico inicial cargado.', 'system')],
    },
    {
      id: worldId,
      tabId: tabByName['Lógica del mundo'].id,
      title: 'Principio de Resonancia',
      content:
        `Toda grieta responde a una emoción dominante sostenida en el tiempo. Si se altera ese patrón, el Velo cambia de forma.\n\nAplicación directa en ${buildStructuredReference(
          chapterId,
          'Capítulo 1 — La grieta de ceniza',
        )}.`,
      templateId: templates[2].id,
      tags: ['regla', 'velo'],
      aliases: ['Resonancia'],
      fields: [
        {
          id: uid('field'),
          key: 'Coste',
          value: 'Cada intervención deja eco en quien la ejecuta.',
        },
      ],
      assets: [],
      status: 'active',
      revision: 2,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Regla del mundo inicial cargada.', 'system')],
    },
  ]

  return {
    id: uid('project'),
    name: 'Crónicas del Umbral',
    description: 'Proyecto narrativo inicial con tabs, referencias, búsqueda, historial y grafo.',
    createdAt: now,
    updatedAt: now,
    tabs,
    entities,
    templates,
    history: [
      createHistoryEvent(
        'Proyecto creado',
        'Se generó un workspace inicial listo para explorar.',
        'system',
      ),
    ],
  }
}

function getDefaultPersistedState(): PersistedState {
  const project = buildSeedProject()
  const firstTabId = project.tabs[0]?.id ?? ''
  const firstEntityId =
    project.entities.find((entity) => entity.tabId === firstTabId)?.id ?? project.entities[0]?.id ?? ''
  return {
    settings: null,
    projects: [project],
    activeProjectId: project.id,
    activeTabId: firstTabId,
    activeEntityId: firstEntityId,
  }
}

function loadPersistedState(): PersistedState {
  const empty = getDefaultPersistedState()
  const rawState = localStorage.getItem(STORAGE_KEY)
  if (!rawState) {
    return empty
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<PersistedState>
    if (!parsed.projects?.length) {
      return empty
    }

    return {
      settings: parsed.settings ?? null,
      projects: parsed.projects,
      activeProjectId: parsed.activeProjectId ?? parsed.projects[0].id,
      activeTabId:
        parsed.activeTabId ?? parsed.projects[0].tabs[0]?.id ?? getDefaultPersistedState().activeTabId,
      activeEntityId:
        parsed.activeEntityId ??
        parsed.projects[0].entities[0]?.id ??
        getDefaultPersistedState().activeEntityId,
    }
  } catch {
    return empty
  }
}

function scoreEntity(entity: EntityRecord, query: string): number {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) {
    return 0
  }

  const title = entity.title.toLowerCase()
  const aliases = entity.aliases.join(' ').toLowerCase()
  const tags = entity.tags.join(' ').toLowerCase()
  const fields = entity.fields.map((field) => `${field.key} ${field.value}`).join(' ').toLowerCase()
  const content = getPlainSnippet(entity.content).toLowerCase()

  let score = 0
  if (title.includes(normalizedQuery)) score += title.startsWith(normalizedQuery) ? 120 : 90
  if (aliases.includes(normalizedQuery)) score += 70
  if (tags.includes(normalizedQuery)) score += 50
  if (fields.includes(normalizedQuery)) score += 35
  if (content.includes(normalizedQuery)) score += 15
  return score
}

function buildSnippet(entity: EntityRecord, query: string): string {
  const source =
    getPlainSnippet(entity.content) ||
    entity.fields.map((field) => `${field.key}: ${field.value}`).join(' · ')
  if (!query.trim()) {
    return source.slice(0, 140)
  }
  const normalizedQuery = query.toLowerCase()
  const index = source.toLowerCase().indexOf(normalizedQuery)
  if (index === -1) {
    return source.slice(0, 140)
  }
  const start = Math.max(0, index - 42)
  return source.slice(start, start + 160)
}

function formatTimestamp(timestamp: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

function App() {
  const [data, setData] = useState<PersistedState>(() => loadPersistedState())
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('editor')
  const [searchQuery, setSearchQuery] = useState('')
  const [toast, setToast] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDescription, setNewProjectDescription] = useState('')
  const [newTabName, setNewTabName] = useState('')
  const [newEntityTemplateId, setNewEntityTemplateId] = useState('')
  const [draft, setDraft] = useState<DraftState | null>(null)
  const [referenceSuggestion, setReferenceSuggestion] = useState<SuggestionState | null>(null)
  const [pendingProposal, setPendingProposal] = useState<AiProposal | null>(null)
  const [authorNameInput, setAuthorNameInput] = useState('')
  const [providerInput, setProviderInput] = useState<Provider>('OpenAI')
  const [modelInput, setModelInput] = useState(providerModels.OpenAI[0])
  const [apiKeyInput, setApiKeyInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const activeProject = useMemo(
    () => data.projects.find((project) => project.id === data.activeProjectId) ?? data.projects[0],
    [data.activeProjectId, data.projects],
  )
  const activeTab = useMemo(
    () => activeProject?.tabs.find((tab) => tab.id === data.activeTabId) ?? activeProject?.tabs[0] ?? null,
    [activeProject, data.activeTabId],
  )
  const projectEntities = useMemo(() => activeProject?.entities ?? [], [activeProject])
  const activeEntity = useMemo(
    () =>
      projectEntities.find((entity) => entity.id === data.activeEntityId) ??
      projectEntities.find((entity) => entity.tabId === activeTab?.id && entity.status === 'active') ??
      projectEntities[0] ??
      null,
    [activeTab?.id, data.activeEntityId, projectEntities],
  )
  const activeDraft = useMemo(() => {
    if (!activeEntity) {
      return null
    }
    return draft?.entityId === activeEntity.id ? draft : draftStateFromEntity(activeEntity)
  }, [activeEntity, draft])
  const selectedNewEntityTemplateId =
    activeProject?.templates.some((template) => template.id === newEntityTemplateId)
      ? newEntityTemplateId
      : (activeProject?.templates[0]?.id ?? '')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    if (!toast) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  useEffect(() => {
    if (!draft || !activeEntity || !activeProject || draft.entityId !== activeEntity.id) {
      return undefined
    }

    const hasChanges =
      JSON.stringify(draftPayload(draft)) !== JSON.stringify(draftFromEntity(activeEntity))
    if (!hasChanges) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setData((current) => {
        const projects = current.projects.map((project) => {
          if (project.id !== activeProject.id) {
            return project
          }

          const entities = project.entities.map((entity) => {
            if (entity.id !== activeEntity.id) {
              return entity
            }

            const updatedEntity: EntityRecord = {
              ...entity,
              title: draft.title || entity.title,
              content: draft.content,
              templateId: draft.templateId,
              tags: parseCommaSeparated(draft.tagsText),
              aliases: parseCommaSeparated(draft.aliasesText),
              fields: draft.fields,
              revision: entity.revision + 1,
              updatedAt: isoNow(),
            }

            const details = `Revisión ${updatedEntity.revision} guardada para ${updatedEntity.title}.`
            const historyEvent = createHistoryEvent('Edición rápida', details)
            return {
              ...updatedEntity,
              history: [historyEvent, ...entity.history].slice(0, 20),
            }
          })

          const savedEntity = entities.find((entity) => entity.id === activeEntity.id)
          if (!savedEntity) {
            return project
          }

          return {
            ...project,
            updatedAt: isoNow(),
            entities,
            history: [
              createHistoryEvent('Autosave', `Se guardó ${savedEntity.title} automáticamente.`),
              ...project.history,
            ].slice(0, 40),
          }
        })

        return {
          ...current,
          projects,
        }
      })
    }, 700)

    return () => window.clearTimeout(timeoutId)
  }, [activeEntity, activeProject, draft])

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!activeProject || !searchQuery.trim()) {
      return []
    }

    return activeProject.entities
      .filter((entity) => entity.status === 'active')
      .map((entity) => ({
        entityId: entity.id,
        tabId: entity.tabId,
        title: entity.title,
        snippet: buildSnippet(entity, searchQuery),
        score: scoreEntity(entity, searchQuery),
      }))
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 8)
  }, [activeProject, searchQuery])

  const activeTabEntities = useMemo(
    () => projectEntities.filter((entity) => entity.tabId === activeTab?.id && entity.status === 'active'),
    [activeTab?.id, projectEntities],
  )

  const graphModel = useMemo(() => {
    if (!activeProject) {
      return { nodes: [], edges: [] }
    }

    const nodes = activeProject.entities
      .filter((entity) => entity.status === 'active')
      .map((entity, index, all) => {
        const angle = (Math.PI * 2 * index) / Math.max(all.length, 1)
        return {
          id: entity.id,
          title: entity.title,
          x: 260 + Math.cos(angle) * 180,
          y: 220 + Math.sin(angle) * 160,
          tabId: entity.tabId,
        }
      })

    const edges = activeProject.entities.flatMap((entity) =>
      getReferenceTokens(entity.content)
        .filter((token) => activeProject.entities.some((target) => target.id === token.entityId))
        .map((token) => ({ source: entity.id, target: token.entityId })),
    )

    return { nodes, edges }
  }, [activeProject])

  const suggestionOptions = useMemo(() => {
    if (!referenceSuggestion || !activeProject) {
      return []
    }
    const normalizedQuery = referenceSuggestion.query.trim().toLowerCase()
    return activeProject.entities
      .filter((entity) => entity.status === 'active')
      .filter((entity) =>
        !normalizedQuery
          ? true
          : entity.title.toLowerCase().includes(normalizedQuery) ||
            entity.aliases.some((alias) => alias.toLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 6)
  }, [activeProject, referenceSuggestion])

  const onboardingReady = Boolean(data.settings)

  function selectProject(projectId: string) {
    const project = data.projects.find((entry) => entry.id === projectId)
    if (!project) return
    const tabId = project.tabs[0]?.id ?? ''
    const entityId =
      project.entities.find((entity) => entity.tabId === tabId)?.id ?? project.entities[0]?.id ?? ''
    setData((current) => ({
      ...current,
      activeProjectId: project.id,
      activeTabId: tabId,
      activeEntityId: entityId,
    }))
    setSearchQuery('')
  }

  function selectTab(tabId: string) {
    if (!activeProject) return
    const entityId =
      activeProject.entities.find((entity) => entity.tabId === tabId && entity.status === 'active')?.id ??
      activeProject.entities[0]?.id ??
      ''
    setData((current) => ({
      ...current,
      activeTabId: tabId,
      activeEntityId: entityId,
    }))
  }

  function selectEntity(entityId: string, tabId?: string) {
    setData((current) => ({
      ...current,
      activeEntityId: entityId,
      activeTabId: tabId ?? current.activeTabId,
    }))
    setWorkspaceView('editor')
  }

  function handleOnboardingSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const apiKeyHint = apiKeyInput ? `••••${apiKeyInput.slice(-4)}` : 'Demo local sin clave persistida'
    setData((current) => ({
      ...current,
      settings: {
        authorName: authorNameInput || 'Autora/Autor principal',
        provider: providerInput,
        model: modelInput,
        apiKeyHint,
      },
    }))
    setToast('Workspace configurado. La demo ya está lista para crear.')
  }

  function createProject() {
    const projectName = newProjectName.trim()
    if (!projectName) return

    const baseProject = buildSeedProject()
    const project: Project = {
      ...baseProject,
      id: uid('project'),
      name: projectName,
      description: newProjectDescription.trim() || 'Nuevo proyecto narrativo local-first.',
      history: [createHistoryEvent('Proyecto creado', `Se creó ${projectName}.`)],
    }

    setData((current) => ({
      ...current,
      projects: [project, ...current.projects],
      activeProjectId: project.id,
      activeTabId: project.tabs[0]?.id ?? '',
      activeEntityId: project.entities[0]?.id ?? '',
    }))
    setNewProjectName('')
    setNewProjectDescription('')
    setToast(`Proyecto ${projectName} listo.`)
  }

  function createTab() {
    if (!activeProject || !newTabName.trim()) return
    const newTab: CollectionTab = {
      id: uid('tab'),
      name: newTabName.trim(),
      icon: '✨',
      prompt: 'Especializa el comportamiento de IA para esta colección.',
    }

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              updatedAt: isoNow(),
              tabs: [...project.tabs, newTab],
              history: [
                createHistoryEvent('Tab creada', `${newTab.name} ya forma parte del proyecto.`),
                ...project.history,
              ].slice(0, 40),
            },
      ),
      activeTabId: newTab.id,
      activeEntityId: '',
    }))
    setNewTabName('')
    setToast(`Tab ${newTab.name} creada.`)
  }

  function moveActiveTab(direction: -1 | 1) {
    if (!activeProject || !activeTab) return
    const index = activeProject.tabs.findIndex((tab) => tab.id === activeTab.id)
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= activeProject.tabs.length) return

    const tabs = [...activeProject.tabs]
    const [tab] = tabs.splice(index, 1)
    tabs.splice(targetIndex, 0, tab)

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              tabs,
              updatedAt: isoNow(),
              history: [
                createHistoryEvent('Tabs reordenadas', `${activeTab.name} cambió de posición.`),
                ...project.history,
              ].slice(0, 40),
            },
      ),
    }))
  }

  function renameActiveTab(name: string) {
    if (!activeProject || !activeTab || !name.trim()) return
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              tabs: project.tabs.map((tab) =>
                tab.id === activeTab.id ? { ...tab, name: name.trim() } : tab,
              ),
              updatedAt: isoNow(),
            },
      ),
    }))
  }

  function deleteActiveTab() {
    if (!activeProject || !activeTab || activeProject.tabs.length === 1) return
    const remainingTabs = activeProject.tabs.filter((tab) => tab.id !== activeTab.id)
    const remainingEntities = activeProject.entities.filter((entity) => entity.tabId !== activeTab.id)
    const nextTab = remainingTabs[0]
    const nextEntity = remainingEntities.find((entity) => entity.tabId === nextTab.id) ?? remainingEntities[0]

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              tabs: remainingTabs,
              entities: remainingEntities,
              updatedAt: isoNow(),
              history: [
                createHistoryEvent(
                  'Tab eliminada',
                  `${activeTab.name} y sus entidades asociadas fueron retiradas.`,
                ),
                ...project.history,
              ].slice(0, 40),
            },
      ),
      activeTabId: nextTab.id,
      activeEntityId: nextEntity?.id ?? '',
    }))
  }

  function updateTabPrompt(prompt: string) {
    if (!activeProject || !activeTab) return
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              tabs: project.tabs.map((tab) => (tab.id === activeTab.id ? { ...tab, prompt } : tab)),
            },
      ),
    }))
  }

  function createEntity() {
    if (!activeProject || !activeTab) return
    const template =
      activeProject.templates.find((entry) => entry.id === selectedNewEntityTemplateId) ??
      activeProject.templates[0]
    const now = isoNow()
    const newEntity: EntityRecord = {
      id: uid('entity'),
      tabId: activeTab.id,
      title: `Nueva entidad en ${activeTab.name}`,
      content: template?.defaultContent ?? 'Describe esta entidad y enlaza conocimiento con {{}}.',
      templateId: template?.id ?? '',
      tags: [],
      aliases: [],
      fields: (template?.fields ?? ['Resumen']).map((fieldName) => ({
        id: uid('field'),
        key: fieldName,
        value: '',
      })),
      assets: [],
      status: 'active',
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', `Entidad creada en ${activeTab.name}.`)],
    }

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              entities: [newEntity, ...project.entities],
              updatedAt: now,
              history: [
                createHistoryEvent('Entidad creada', `${newEntity.title} lista para edición.`),
                ...project.history,
              ].slice(0, 40),
            },
      ),
      activeEntityId: newEntity.id,
    }))
    setToast('Entidad lista para editar.')
  }

  function duplicateActiveEntity() {
    if (!activeProject || !activeEntity) return
    const now = isoNow()
    const duplicated: EntityRecord = {
      ...activeEntity,
      id: uid('entity'),
      title: `${activeEntity.title} (copia)`,
      fields: activeEntity.fields.map((field) => ({ ...field, id: uid('field') })),
      assets: activeEntity.assets.map((asset) => ({ ...asset, id: uid('asset') })),
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Duplicado', `Se duplicó desde ${activeEntity.title}.`)],
    }

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              entities: [duplicated, ...project.entities],
              updatedAt: now,
              history: [
                createHistoryEvent('Entidad duplicada', `${duplicated.title} creada desde un original.`),
                ...project.history,
              ].slice(0, 40),
            },
      ),
      activeEntityId: duplicated.id,
    }))
  }

  function archiveActiveEntity() {
    if (!activeProject || !activeEntity) return
    const nextEntity = activeTabEntities.find((entity) => entity.id !== activeEntity.id)
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              entities: project.entities.map((entity) =>
                entity.id !== activeEntity.id
                  ? entity
                  : {
                      ...entity,
                      status: 'archived',
                      revision: entity.revision + 1,
                      updatedAt: isoNow(),
                      history: [
                        createHistoryEvent('Archivado', `${entity.title} pasó a estado archivado.`),
                        ...entity.history,
                      ].slice(0, 20),
                    },
              ),
              updatedAt: isoNow(),
            },
      ),
      activeEntityId: nextEntity?.id ?? '',
    }))
  }

  function deleteActiveEntity() {
    if (!activeProject || !activeEntity) return
    const remainingEntities = activeProject.entities.filter((entity) => entity.id !== activeEntity.id)
    const nextEntity = remainingEntities.find(
      (entity) => entity.tabId === activeTab?.id && entity.status === 'active',
    )
    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              entities: project.entities.filter((entity) => entity.id !== activeEntity.id),
              updatedAt: isoNow(),
              history: [
                createHistoryEvent('Entidad eliminada', `${activeEntity.title} fue eliminada.`),
                ...project.history,
              ].slice(0, 40),
            },
      ),
      activeEntityId: nextEntity?.id ?? '',
    }))
  }

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
    if (!files || !activeProject || !activeEntity) return
    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'))
    if (!imageFiles.length) return

    const assets = await Promise.all(
      imageFiles.map(
        (file) =>
          new Promise<Asset>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              resolve({
                id: uid('asset'),
                name: file.name,
                mimeType: file.type,
                dataUrl: String(reader.result),
              })
            }
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(file)
          }),
      ),
    )

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              updatedAt: isoNow(),
              entities: project.entities.map((entity) =>
                entity.id !== activeEntity.id
                  ? entity
                  : {
                      ...entity,
                      assets: [...assets, ...entity.assets],
                      revision: entity.revision + 1,
                      updatedAt: isoNow(),
                      history: [
                        createHistoryEvent('Assets añadidos', `${assets.length} imagen(es) anexadas.`),
                        ...entity.history,
                      ].slice(0, 20),
                    },
              ),
            },
      ),
    }))
    setToast(`${assets.length} imagen(es) añadidas al proyecto.`)
  }

  function insertReference(entity: EntityRecord) {
    if (!activeDraft || !textareaRef.current || !referenceSuggestion) return
    const replacement = buildStructuredReference(entity.id, entity.title)
    const content = activeDraft.content
    const nextContent = `${content.slice(0, referenceSuggestion.start)}${replacement}${content.slice(referenceSuggestion.end)}`
    setDraft({ ...activeDraft, content: nextContent })
    setReferenceSuggestion(null)

    requestAnimationFrame(() => {
      const nextPosition = referenceSuggestion.start + replacement.length
      textareaRef.current?.focus()
      if (textareaRef.current) {
        textareaRef.current.selectionStart = nextPosition
        textareaRef.current.selectionEnd = nextPosition
      }
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

  function saveCurrentAsTemplate() {
    if (!activeProject || !activeDraft || !activeEntity) return
    const template: EntityTemplate = {
      id: uid('template'),
      name: `${activeDraft.title || activeEntity.title} — template`,
      description: 'Generado desde una entidad real del workspace.',
      fields: activeDraft.fields.map((field) => field.key || 'Campo'),
      defaultContent: activeDraft.content,
    }

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) =>
        project.id !== activeProject.id
          ? project
          : {
              ...project,
              templates: [template, ...project.templates],
              updatedAt: isoNow(),
              history: [
                createHistoryEvent('Template guardado', `${template.name} listo para reutilizar.`),
                ...project.history,
              ].slice(0, 40),
            },
      ),
    }))
    setToast('Template guardado y listo para nuevas entidades.')
  }

  function generateAiProposal() {
    if (!activeEntity || !activeTab) return
    const missingField = activeEntity.fields.some((field) => field.key === 'Pregunta dramática')
      ? null
      : { id: uid('field'), key: 'Pregunta dramática', value: '¿Qué verdad teme descubrir?' }
    const proposal: AiProposal = {
      id: uid('proposal'),
      title: `Propuesta contextual para ${activeEntity.title}`,
      summary:
        'La IA sugiere reforzar claridad dramática, continuidad y una nota derivada preparada para confirmación humana.',
      entityId: activeEntity.id,
      contentAppend:
        `\n\n## Sugerencia IA\n- Aumenta la fricción en el siguiente beat.\n- Conecta el conflicto con el prompt de la tab: "${activeTab.prompt}".\n- Refuerza una referencia cruzada que haga visible el costo narrativo.`,
      createEntityTitle: `${activeEntity.title} — Nota de continuidad`,
      createEntityContent:
        `Resumen operativo derivado desde ${buildStructuredReference(
          activeEntity.id,
          activeEntity.title,
        )}.\n\n- Riesgo narrativo inmediato\n- Pregunta pendiente\n- Próxima escena candidata`,
      fieldToAdd: missingField,
    }
    setPendingProposal(proposal)
  }

  function confirmAiProposal() {
    if (!pendingProposal || !activeProject || !activeTab) return
    const now = isoNow()
    const followUpEntity: EntityRecord = {
      id: uid('entity'),
      tabId: activeTab.id,
      title: pendingProposal.createEntityTitle,
      content: pendingProposal.createEntityContent,
      templateId: activeProject.templates[1]?.id ?? activeProject.templates[0]?.id ?? '',
      tags: ['ia', 'continuidad'],
      aliases: [],
      fields: [],
      assets: [],
      status: 'active',
      revision: 1,
      updatedAt: now,
      history: [
        createHistoryEvent(
          'Creación IA confirmada',
          'Nota derivada desde propuesta contextual.',
          'ai',
        ),
      ],
    }

    setData((current) => ({
      ...current,
      projects: current.projects.map((project) => {
        if (project.id !== activeProject.id) {
          return project
        }

        const entities = project.entities.map((entity) => {
          if (entity.id !== pendingProposal.entityId) {
            return entity
          }
          return {
            ...entity,
            content: `${entity.content}${pendingProposal.contentAppend}`,
            fields: pendingProposal.fieldToAdd ? [...entity.fields, pendingProposal.fieldToAdd] : entity.fields,
            revision: entity.revision + 1,
            updatedAt: now,
            history: [
              createHistoryEvent('Propuesta IA aplicada', 'Se confirmó una mejora contextual.', 'ai'),
              ...entity.history,
            ].slice(0, 20),
          }
        })

        return {
          ...project,
          updatedAt: now,
          entities: [followUpEntity, ...entities],
          history: [
            createHistoryEvent(
              'IA confirmada',
              `Se aplicó una propuesta sobre ${followUpEntity.title}.`,
              'ai',
            ),
            ...project.history,
          ].slice(0, 40),
        }
      }),
      activeEntityId: pendingProposal.entityId,
    }))

    setPendingProposal(null)
    setToast('Propuesta IA confirmada y aplicada con trazabilidad.')
  }

  function clearWorkspace() {
    localStorage.removeItem(STORAGE_KEY)
    const nextState = getDefaultPersistedState()
    setData(nextState)
    setSearchQuery('')
    setPendingProposal(null)
    setToast('Workspace reiniciado con un proyecto base limpio.')
  }

  if (!onboardingReady) {
    return (
      <main className="onboarding-shell">
        <section className="hero-panel">
          <div>
            <span className="eyebrow">NovelDesktopCreation · MVP local-first</span>
            <h1>Onboarding sin fricción para arrancar un workspace narrativo serio.</h1>
            <p>
              Configura proveedor, modelo y un hint seguro de tu API key. La demo no persiste la
              clave real en el navegador: mantiene solamente una huella visual para que la UX se
              sienta lista para desktop sin regalar secretos a localStorage.
            </p>
          </div>
          <ul className="feature-grid">
            <li>Tabs vivas con prompts contextuales</li>
            <li>Entidades editables con fields, historial e imágenes</li>
            <li>Referencias {'{{}}'} con preview y Ctrl + click</li>
            <li>Búsqueda priorizada y primera vista de grafo</li>
          </ul>
        </section>

        <form className="onboarding-card" onSubmit={handleOnboardingSubmit}>
          <h2>Deja el sistema listo en menos de un minuto</h2>

          <label>
            Perfil creativo
            <input
              value={authorNameInput}
              onChange={(event) => setAuthorNameInput(event.target.value)}
              placeholder="Ej. David · thriller cósmico"
            />
          </label>

          <div className="onboarding-grid">
            <label>
              Proveedor
              <select
                value={providerInput}
                onChange={(event) => {
                  const nextProvider = event.target.value as Provider
                  setProviderInput(nextProvider)
                  setModelInput(providerModels[nextProvider][0])
                }}
              >
                {Object.keys(providerModels).map((provider) => (
                  <option key={provider} value={provider}>
                    {provider}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Modelo
              <select value={modelInput} onChange={(event) => setModelInput(event.target.value)}>
                {providerModels[providerInput].map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            API key (solo para mostrar configuración)
            <input
              value={apiKeyInput}
              onChange={(event) => setApiKeyInput(event.target.value)}
              placeholder="pk-live-demo-1234"
              type="password"
            />
          </label>

          <button className="primary-button" type="submit">
            Entrar al workspace MVP
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <span className="eyebrow">NovelDesktopCreation</span>
          <h1>MVP listo para usarse</h1>
          <p>
            {data.settings?.authorName} · {data.settings?.provider} · {data.settings?.model}
          </p>
          <small>Clave configurada: {data.settings?.apiKeyHint}</small>
        </div>

        <section className="sidebar-section">
          <div className="section-header">
            <h2>Proyectos</h2>
            <button type="button" onClick={clearWorkspace}>
              Reiniciar demo
            </button>
          </div>
          <div className="project-list">
            {data.projects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={project.id === activeProject?.id ? 'project-pill active' : 'project-pill'}
                onClick={() => selectProject(project.id)}
              >
                <strong>{project.name}</strong>
                <span>{project.description}</span>
              </button>
            ))}
          </div>
          <div className="stacked-form">
            <input
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="Nuevo proyecto"
            />
            <textarea
              value={newProjectDescription}
              onChange={(event) => setNewProjectDescription(event.target.value)}
              placeholder="Qué tipo de universo vas a construir"
            />
            <button className="primary-button" type="button" onClick={createProject}>
              Crear proyecto
            </button>
          </div>
        </section>

        <section className="sidebar-section">
          <div className="section-header">
            <h2>Templates</h2>
            <button type="button" onClick={saveCurrentAsTemplate}>
              Guardar actual
            </button>
          </div>
          <div className="template-list">
            {activeProject?.templates.map((template) => (
              <article key={template.id} className="template-card">
                <strong>{template.name}</strong>
                <span>{template.description}</span>
                <small>{template.fields.join(' · ')}</small>
              </article>
            ))}
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Proyecto activo</span>
            <h2>{activeProject?.name}</h2>
            <p>{activeProject?.description}</p>
          </div>

          <div className="topbar-actions">
            <label className="search-box">
              <span>Buscar</span>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Título, tags, aliases, fields o contenido"
              />
            </label>
            <div className="segmented-control">
              <button
                type="button"
                className={workspaceView === 'editor' ? 'active' : ''}
                onClick={() => setWorkspaceView('editor')}
              >
                Editor
              </button>
              <button
                type="button"
                className={workspaceView === 'graph' ? 'active' : ''}
                onClick={() => setWorkspaceView('graph')}
              >
                Grafo
              </button>
            </div>
          </div>
        </header>

        {searchResults.length > 0 && (
          <section className="search-results">
            {searchResults.map((result) => (
              <button
                key={result.entityId}
                type="button"
                className="search-result"
                onClick={() => selectEntity(result.entityId, result.tabId)}
              >
                <strong>{result.title}</strong>
                <span>{result.snippet}</span>
                <small>Score {result.score}</small>
              </button>
            ))}
          </section>
        )}

        <section className="tabs-row">
          <div className="tab-strip">
            {activeProject?.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={tab.id === activeTab?.id ? 'tab-pill active' : 'tab-pill'}
                onClick={() => selectTab(tab.id)}
              >
                <span>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>
          <div className="tab-actions">
            <input
              value={newTabName}
              onChange={(event) => setNewTabName(event.target.value)}
              placeholder="Nueva tab personalizada"
            />
            <button type="button" onClick={createTab}>
              Añadir tab
            </button>
            <button type="button" onClick={() => moveActiveTab(-1)}>
              ←
            </button>
            <button type="button" onClick={() => moveActiveTab(1)}>
              →
            </button>
            <button
              type="button"
              onClick={() => {
                const nextName = window.prompt('Renombra la tab activa', activeTab?.name ?? '')
                if (nextName) renameActiveTab(nextName)
              }}
            >
              Renombrar
            </button>
            <button
              type="button"
              onClick={deleteActiveTab}
              disabled={Boolean(activeProject && activeProject.tabs.length === 1)}
            >
              Eliminar
            </button>
          </div>
        </section>

        <section className="content-grid">
          <aside className="entity-pane">
            <div className="section-header">
              <h3>{activeTab?.name}</h3>
              <span>{activeTabEntities.length} entidades</span>
            </div>
            <label className="compact-label">
              Template inicial
              <select
                value={selectedNewEntityTemplateId}
                onChange={(event) => setNewEntityTemplateId(event.target.value)}
              >
                {activeProject?.templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <button className="primary-button" type="button" onClick={createEntity}>
              Nueva entidad
            </button>
            <div className="entity-list">
              {activeTabEntities.map((entity) => (
                <button
                  key={entity.id}
                  type="button"
                  className={entity.id === activeEntity?.id ? 'entity-card active' : 'entity-card'}
                  onClick={() => selectEntity(entity.id, entity.tabId)}
                >
                  <strong>{entity.title}</strong>
                  <span>
                    {entity.fields.map((field) => field.key).slice(0, 3).join(' · ') || 'Sin fields aún'}
                  </span>
                  <small>rev {entity.revision}</small>
                </button>
              ))}
            </div>
          </aside>

          <div className="editor-pane">
            {workspaceView === 'graph' ? (
              <section className="graph-panel">
                <div className="section-header">
                  <div>
                    <h3>Vista de grafo</h3>
                    <p>Nodos por entidad y enlaces derivados desde referencias estructuradas.</p>
                  </div>
                  <small>{graphModel.nodes.length} nodos</small>
                </div>
                <svg viewBox="0 0 520 440" role="img" aria-label="Grafo narrativo inicial">
                  {graphModel.edges.map((edge) => {
                    const source = graphModel.nodes.find((node) => node.id === edge.source)
                    const target = graphModel.nodes.find((node) => node.id === edge.target)
                    if (!source || !target) return null
                    return (
                      <line
                        key={`${edge.source}-${edge.target}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="rgba(148, 163, 184, 0.45)"
                        strokeWidth="2"
                      />
                    )
                  })}
                  {graphModel.nodes.map((node) => (
                    <g key={node.id} onClick={() => selectEntity(node.id, node.tabId)} className="graph-node">
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={node.id === activeEntity?.id ? 36 : 30}
                        fill={node.id === activeEntity?.id ? '#8b5cf6' : '#1e293b'}
                        stroke="#c4b5fd"
                        strokeWidth="2"
                      />
                      <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle">
                        {node.title.slice(0, 12)}
                      </text>
                    </g>
                  ))}
                </svg>
              </section>
            ) : activeEntity && activeDraft ? (
              <section className="editor-panel">
                <div className="editor-header">
                  <div>
                    <span className="eyebrow">Entidad activa</span>
                    <h3>{activeEntity.title}</h3>
                    <p>
                      Revision {activeEntity.revision} · {formatTimestamp(activeEntity.updatedAt)}
                    </p>
                  </div>
                  <div className="editor-actions">
                    <button type="button" onClick={duplicateActiveEntity}>
                      Duplicar
                    </button>
                    <button type="button" onClick={archiveActiveEntity}>
                      Archivar
                    </button>
                    <button type="button" onClick={deleteActiveEntity}>
                      Eliminar
                    </button>
                    <button className="primary-button" type="button" onClick={generateAiProposal}>
                      IA propone siguiente paso
                    </button>
                  </div>
                </div>

                <div className="editor-form-grid">
                  <label>
                    Título
                    <input
                      value={activeDraft.title}
                      onChange={(event) => setDraft({ ...activeDraft, title: event.target.value })}
                    />
                  </label>
                  <label>
                    Template
                    <select
                      value={activeDraft.templateId}
                      onChange={(event) =>
                        setDraft({ ...activeDraft, templateId: event.target.value })
                      }
                    >
                      {activeProject?.templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Tags
                    <input
                      value={activeDraft.tagsText}
                      onChange={(event) =>
                        setDraft({ ...activeDraft, tagsText: event.target.value })
                      }
                      placeholder="misterio, política, magia"
                    />
                  </label>
                  <label>
                    Aliases
                    <input
                      value={activeDraft.aliasesText}
                      onChange={(event) =>
                        setDraft({ ...activeDraft, aliasesText: event.target.value })
                      }
                      placeholder="sobrenombres, títulos, abreviaturas"
                    />
                  </label>
                </div>

                <div className="dual-column">
                  <div className="document-editor">
                    <div className="section-header">
                      <h4>Documento editable</h4>
                      <small>Escribe {'{{}}'} para enlazar entidades</small>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={activeDraft.content}
                      onChange={(event) =>
                        handleEditorChange(event.target.value, event.target.selectionEnd)
                      }
                      placeholder="Escribe aquí la entidad. Usa {{}} para referencias cruzadas."
                    />
                    {referenceSuggestion && suggestionOptions.length > 0 && (
                      <div className="suggestions-popover">
                        {suggestionOptions.map((entity) => (
                          <button key={entity.id} type="button" onClick={() => insertReference(entity)}>
                            <strong>{entity.title}</strong>
                            <span>{entity.aliases.join(', ') || 'Sin aliases'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    <div
                      className="asset-dropzone"
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault()
                        void attachImages(event.dataTransfer.files)
                      }}
                    >
                      <span>Arrastra imágenes aquí o</span>
                      <label className="inline-upload">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(event) => {
                            void attachImages(event.target.files)
                            event.target.value = ''
                          }}
                        />
                        súbelas desde disco
                      </label>
                    </div>
                  </div>

                  <div className="reference-preview-panel">
                    <div className="section-header">
                      <h4>Preview contextual</h4>
                      <small>Hover muestra contexto; Ctrl + click navega</small>
                    </div>
                    <div className="rendered-document">
                      {activeDraft.content
                        .split(/(\{\{entity:[^|}]+\|[^}]+\}\})/g)
                        .map((chunk, index) => {
                        const token = getReferenceTokens(chunk)[0]
                        if (!token) {
                          return (
                            <span key={`${chunk}-${index}`} className="plain-chunk">
                              {chunk}
                            </span>
                          )
                        }
                        const referencedEntity = activeProject?.entities.find(
                          (entity) => entity.id === token.entityId,
                        )
                        return (
                          <span key={token.raw} className="reference-chip-wrapper">
                            <button
                              type="button"
                              className="reference-chip"
                              onClick={(event) => navigateFromReference(token.entityId, event.ctrlKey)}
                            >
                              {token.label}
                            </button>
                            {referencedEntity && (
                              <div className="reference-tooltip">
                                <strong>{referencedEntity.title}</strong>
                                <p>{buildSnippet(referencedEntity, referencedEntity.title)}</p>
                                <small>{referencedEntity.fields.map((field) => field.key).join(' · ')}</small>
                              </div>
                            )}
                          </span>
                        )
                      })}
                    </div>

                    <div className="fields-panel">
                      <div className="section-header">
                        <h4>Fields tipados</h4>
                        <button type="button" onClick={addField}>
                          Añadir field
                        </button>
                      </div>
                      {activeDraft.fields.map((field) => (
                        <div key={field.id} className="field-row">
                          <input
                            value={field.key}
                            onChange={(event) => updateField(field.id, 'key', event.target.value)}
                            placeholder="Nombre del field"
                          />
                          <input
                            value={field.value}
                            onChange={(event) => updateField(field.id, 'value', event.target.value)}
                            placeholder="Valor"
                          />
                          <button type="button" onClick={() => removeField(field.id)}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <section className="assets-panel">
                  <div className="section-header">
                    <h4>Assets visuales</h4>
                    <span>{activeEntity.assets.length} imágenes</span>
                  </div>
                  <div className="asset-grid">
                    {activeEntity.assets.map((asset) => (
                      <figure key={asset.id} className="asset-card">
                        <img src={asset.dataUrl} alt={asset.name} />
                        <figcaption>{asset.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                </section>
              </section>
            ) : (
              <section className="empty-state">
                <h3>Selecciona o crea una entidad</h3>
                <p>La tab activa aún no tiene contenido vivo. Crea una entidad para empezar.</p>
              </section>
            )}
          </div>

          <aside className="inspector-pane">
            <section className="inspector-card">
              <div className="section-header">
                <h3>Prompt por tab</h3>
                <small>
                  {activeTab?.icon} {activeTab?.name}
                </small>
              </div>
              <textarea
                value={activeTab?.prompt ?? ''}
                onChange={(event) => updateTabPrompt(event.target.value)}
              />
            </section>

            {pendingProposal && (
              <section className="proposal-card">
                <span className="eyebrow">Acción IA pendiente de confirmación</span>
                <h3>{pendingProposal.title}</h3>
                <p>{pendingProposal.summary}</p>
                <ul>
                  <li>Append editorial listo para aplicar</li>
                  <li>Nueva nota derivada con continuidad</li>
                  <li>
                    {pendingProposal.fieldToAdd
                      ? `Nuevo field: ${pendingProposal.fieldToAdd.key}`
                      : 'No requiere field extra'}
                  </li>
                </ul>
                <div className="proposal-actions">
                  <button className="primary-button" type="button" onClick={confirmAiProposal}>
                    Confirmar y aplicar
                  </button>
                  <button type="button" onClick={() => setPendingProposal(null)}>
                    Descartar
                  </button>
                </div>
              </section>
            )}

            <section className="inspector-card">
              <div className="section-header">
                <h3>Historial visible</h3>
                <small>{activeEntity?.history.length ?? 0} eventos</small>
              </div>
              <div className="history-list">
                {activeEntity?.history.map((event) => (
                  <article key={event.id} className="history-item">
                    <strong>{event.label}</strong>
                    <p>{event.details}</p>
                    <small>
                      {event.actorType} · {formatTimestamp(event.timestamp)}
                    </small>
                  </article>
                ))}
              </div>
            </section>

            <section className="inspector-card">
              <div className="section-header">
                <h3>Actividad del proyecto</h3>
                <small>{activeProject?.history.length ?? 0} eventos</small>
              </div>
              <div className="history-list compact">
                {activeProject?.history.slice(0, 10).map((event) => (
                  <article key={event.id} className="history-item">
                    <strong>{event.label}</strong>
                    <small>{formatTimestamp(event.timestamp)}</small>
                  </article>
                ))}
              </div>
            </section>
          </aside>
        </section>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </main>
  )
}

export default App

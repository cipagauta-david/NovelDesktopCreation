export type Provider =
  | 'OpenAI'
  | 'Anthropic'
  | 'Google Gemini'
  | 'OpenRouter'
  | 'Local/Ollama'

export type WorkspaceView = 'editor' | 'graph'
export type EntityStatus = 'active' | 'archived'
export type ActorType = 'user' | 'ai' | 'system'
export type PanelKey = 'sidebar' | 'entities' | 'inspector'

export type AppSettings = {
  authorName: string
  provider: Provider
  model: string
  apiKeyHint: string
}

export type OnboardingPayload = {
  authorName: string
  provider: Provider
  model: string
  apiKey: string
}

export type FieldValue = {
  id: string
  key: string
  value: string
}

export type Asset = {
  id: string
  name: string
  mimeType: string
  dataUrl: string
}

export type HistoryEvent = {
  id: string
  label: string
  details: string
  timestamp: string
  actorType: ActorType
}

export type ChangeEvent = {
  id: string
  correlationId?: string
  intent?: string
  timestamp: string
  actorType: ActorType
  label: string
  details: string
  projectId?: string
  tabId?: string
  entityId?: string
  source: 'legacy-history' | 'mutation'
}

export type DomainRelation = {
  id: string
  sourceEntityId: string
  targetEntityId: string
  relationType: string
  label?: string
  createdAt: string
  updatedAt: string
}

export type EntityTemplate = {
  id: string
  name: string
  description: string
  fields: string[]
  defaultContent: string
}

export type CollectionTab = {
  id: string
  name: string
  prompt: string
  icon: string
}

export type EntityRecord = {
  id: string
  tabId: string
  title: string
  content: string
  textCrdtState?: string
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

export type Project = {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  tabs: CollectionTab[]
  entities: EntityRecord[]
  relations?: DomainRelation[]
  templates: EntityTemplate[]
  history: HistoryEvent[]
}

export type StateCheckpoint = {
  id: string
  correlationId?: string
  createdAt: string
  label: string
  state: PersistedState
}

export type SyncRemoteConfig = {
  endpoint: string
  workspaceId: string
  authTokenHint: string
  contractVersion?: SyncContractVersion
  authMode?: 'bearer'
}

export type SyncQueueStats = {
  pending: number
  retries: number
  poisoned: number
  conflictsResolved: number
  lastError?: string
  lastSyncedAt?: string
}

export type SyncContractVersion = '2026-03-sync-v2'

export type SyncOperationType =
  | 'workspace.settings'
  | 'workspace.pointer'
  | 'project.upsert'
  | 'project.delete'
  | 'entity.upsert'
  | 'entity.delete'
  | 'relation.upsert'
  | 'relation.delete'

export type SyncOperation = {
  id: string
  correlationId?: string
  changeEventId: string
  timestamp: string
  type: SyncOperationType
  projectId?: string
  entityId?: string
  payload: unknown
}

export type CorrelationReport = {
  correlationId: string
  intent: string
  startedAt: string
  finishedAt?: string
  status: 'ok' | 'error'
  events: Array<{
    timestamp: string
    stage: string
    detail: string
  }>
}

export type PersistedState = {
  settings: AppSettings | null
  projects: Project[]
  activeProjectId: string
  activeTabId: string
  activeEntityId: string
  changeLog: ChangeEvent[]
  graphLayouts?: PersistedGraphLayouts
  llmTraces?: LlmTraceEntry[]
  checkpoints?: StateCheckpoint[]
  syncRemoteConfig?: SyncRemoteConfig
  syncStats?: SyncQueueStats
  correlationReports?: CorrelationReport[]
}

export type EntityDraft = {
  title: string
  content: string
  templateId: string
  tagsText: string
  aliasesText: string
  fields: FieldValue[]
}

export type DraftState = EntityDraft & {
  entityId: string
}

export type SuggestionState = {
  start: number
  end: number
  query: string
}

export type SearchResult = {
  entityId: string
  tabId: string
  title: string
  snippet: string
  score: number
}

export type AiProposal = {
  id: string
  title: string
  summary: string
  entityId: string
  contentAppend: string
  createEntityTitle: string
  createEntityContent: string
  fieldToAdd: FieldValue | null
}

export type RefToken = {
  entityId: string
  label: string
  raw: string
}

export type GraphNode = {
  id: string
  title: string
  x: number
  y: number
  tabId: string
}

export type GraphEdge = {
  source: string
  target: string
}

export type GraphModel = {
  nodes: GraphNode[]
  edges: GraphEdge[]
}

export type PanelVisibility = Record<PanelKey, boolean>

// ── Streaming & AI traceability ─────────────────────────────
export type LlmErrorCategory =
  | 'auth'
  | 'rate-limit'
  | 'network'
  | 'server'
  | 'timeout'
  | 'contract'
  | 'cancelled'
  | 'unknown'

export type LlmStreamStatus =
  | 'idle'
  | 'streaming'
  | 'done'
  | 'error'
  | 'cancelled'

export type LlmTraceEntry = {
  id: string
  correlationId?: string
  timestamp: string
  provider: Provider
  model: string
  promptSnippet: string
  responseSnippet: string
  durationMs: number
  firstTokenMs?: number
  tokenEstimate: number
  status: 'ok' | 'error' | 'fallback' | 'cancelled'
  errorDetail?: string
}

// ── Graph layout persistence ────────────────────────────────
export type GraphLayoutMap = Record<string, { x: number; y: number }>

// ── Import / Export ─────────────────────────────────────────
export type ExportedProject = {
  version: number
  exportedAt: string
  checksum: string
  checksumAlgorithm: 'SHA-256'
  project: Project
}

// ── Extended PersistedState ─────────────────────────────────
export type PersistedGraphLayouts = Record<string, GraphLayoutMap>

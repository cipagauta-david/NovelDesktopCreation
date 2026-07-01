const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs/promises')
const path = require('path')

let DatabaseSync
try {
  ;({ DatabaseSync } = require('node:sqlite'))
} catch {
  console.log('[Desktop] node:sqlite not available, SQLite disabled')
  DatabaseSync = null
}

let lancedb = null
try {
  lancedb = require('@lancedb/lancedb')
} catch (e) {
  console.log('[Desktop] @lancedb/lancedb not available', e)
}

let pipeline = null
let env = null
try {
  const transformers = require('@xenova/transformers')
  pipeline = transformers.pipeline
  env = transformers.env
  env.allowLocalModels = false
  env.useBrowserCache = false
} catch (e) {
  console.log('[Desktop] @xenova/transformers not available', e)
}

const APP_STATE_PATH = path.join(app.getPath('userData'), 'workspace-state.json')
const APP_STATE_DB_PATH = path.join(app.getPath('userData'), 'workspace-state.db')
const VECTOR_DB_PATH = path.join(app.getPath('userData'), 'workspace-vectors.lance')
const APP_STATE_KEY = 'latest'
const DB_SCHEMA_VERSION = 1

console.log('[Desktop] UserData path:', app.getPath('userData'))
console.log('[Desktop] SQLite DB path:', APP_STATE_DB_PATH)
console.log('[Desktop] LanceDB path:', VECTOR_DB_PATH)

let stateDb = null

let extractorPromise = null
function getExtractor() {
  if (!pipeline) return null
  if (!extractorPromise) {
    console.log('[Desktop] Loading Xenova embedding model...')
    extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    })
  }
  return extractorPromise
}

async function getEmbedding(text) {
  const empty = new Array(384).fill(0)
  if (!text) return empty
  const extractor = await getExtractor()
  if (!extractor) return empty
  try {
    const output = await extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  } catch (err) {
    console.error('[Desktop] Embeddings generation failed', err)
    return empty
  }
}

let lanceConnection = null
async function getLanceDb() {
  if (!lancedb) return null
  if (!lanceConnection) {
    lanceConnection = await lancedb.connect(VECTOR_DB_PATH)
  }
  return lanceConnection
}


async function ensureUserDataDir() {
  const userDataPath = app.getPath('userData')
  console.log('[Desktop] Ensuring userData dir:', userDataPath)
  await fs.mkdir(userDataPath, { recursive: true })
}

function runDbTransaction(db, callback) {
  db.exec('BEGIN IMMEDIATE')
  try {
    callback()
    db.exec('COMMIT')
  } catch (error) {
    try {
      db.exec('ROLLBACK')
    } catch {
      // ignore rollback failures
    }
    throw error
  }
}

function bootstrapStateSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schema_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_snapshots (
      snapshot_key TEXT PRIMARY KEY,
      schema_version INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS workspace_kv (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS project_tabs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      prompt TEXT NOT NULL,
      icon TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_project_tabs_project_id ON project_tabs (project_id);

    CREATE TABLE IF NOT EXISTS entity_templates (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      fields_json TEXT NOT NULL,
      default_content TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entity_templates_project_id ON entity_templates (project_id);

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      tab_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      text_crdt_state TEXT,
      template_id TEXT NOT NULL,
      status TEXT NOT NULL,
      revision INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      aliases_json TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entities_project_id ON entities (project_id);
    CREATE INDEX IF NOT EXISTS idx_entities_project_tab_status ON entities (project_id, tab_id, status);
    CREATE INDEX IF NOT EXISTS idx_entities_updated_at ON entities (updated_at);

    CREATE TABLE IF NOT EXISTS entity_fields (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      field_key TEXT NOT NULL,
      field_value TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entity_fields_entity_id ON entity_fields (entity_id);

    CREATE TABLE IF NOT EXISTS entity_assets (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      data_url TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entity_assets_entity_id ON entity_assets (entity_id);

    CREATE TABLE IF NOT EXISTS entity_history (
      id TEXT PRIMARY KEY,
      entity_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      label TEXT NOT NULL,
      details TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_entity_history_entity_id ON entity_history (entity_id);
    CREATE INDEX IF NOT EXISTS idx_entity_history_timestamp ON entity_history (timestamp);

    CREATE TABLE IF NOT EXISTS domain_relations (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      source_entity_id TEXT NOT NULL,
      target_entity_id TEXT NOT NULL,
      relation_type TEXT NOT NULL,
      label TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_domain_relations_project_id ON domain_relations (project_id);
    CREATE INDEX IF NOT EXISTS idx_domain_relations_source_target ON domain_relations (source_entity_id, target_entity_id);

    CREATE TABLE IF NOT EXISTS project_history (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      label TEXT NOT NULL,
      details TEXT NOT NULL,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_project_history_project_id ON project_history (project_id);
    CREATE INDEX IF NOT EXISTS idx_project_history_timestamp ON project_history (timestamp);

    CREATE TABLE IF NOT EXISTS change_events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      actor_type TEXT NOT NULL,
      label TEXT NOT NULL,
      details TEXT NOT NULL,
      source TEXT NOT NULL,
      correlation_id TEXT,
      intent TEXT,
      project_id TEXT,
      tab_id TEXT,
      entity_id TEXT,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_change_events_timestamp ON change_events (timestamp);
    CREATE INDEX IF NOT EXISTS idx_change_events_correlation ON change_events (correlation_id);

    CREATE TABLE IF NOT EXISTS graph_layout_positions (
      project_id TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      x REAL NOT NULL,
      y REAL NOT NULL,
      PRIMARY KEY (project_id, entity_id)
    );
    CREATE INDEX IF NOT EXISTS idx_graph_layout_positions_project_id ON graph_layout_positions (project_id);

    CREATE TABLE IF NOT EXISTS llm_traces (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      correlation_id TEXT,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      prompt_snippet TEXT NOT NULL,
      response_snippet TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      first_token_ms INTEGER,
      token_estimate INTEGER NOT NULL,
      status TEXT NOT NULL,
      error_detail TEXT,
      data_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_llm_traces_timestamp ON llm_traces (timestamp);
    CREATE INDEX IF NOT EXISTS idx_llm_traces_correlation ON llm_traces (correlation_id);

    CREATE TABLE IF NOT EXISTS correlation_reports (
      correlation_id TEXT PRIMARY KEY,
      intent TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      events_json TEXT NOT NULL,
      data_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      enqueued_at INTEGER NOT NULL,
      next_attempt_at INTEGER NOT NULL,
      poisoned_at INTEGER,
      item_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sync_queue_next_attempt_at ON sync_queue (next_attempt_at);

    CREATE TABLE IF NOT EXISTS sync_state (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `)

  const upsertMeta = db.prepare('INSERT INTO schema_meta (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
  upsertMeta.run('schema_version', String(DB_SCHEMA_VERSION), Date.now())
}

function upsertWorkspaceKv(db, key, value, nowMs) {
  const stmt = db.prepare('INSERT INTO workspace_kv (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at')
  stmt.run(key, JSON.stringify(value), nowMs)
}

function replaceDerivedTablesFromState(db, state, nowMs) {
  const clearTables = [
    'projects',
    'project_tabs',
    'entity_templates',
    'entities',
    'entity_fields',
    'entity_assets',
    'entity_history',
    'domain_relations',
    'project_history',
    'change_events',
    'graph_layout_positions',
    'llm_traces',
    'correlation_reports',
  ]

  for (const table of clearTables) {
    db.exec(`DELETE FROM ${table}`)
  }

  const insertProject = db.prepare('INSERT INTO projects (id, name, description, created_at, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?)')
  const insertProjectTab = db.prepare('INSERT INTO project_tabs (id, project_id, position, name, prompt, icon, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertTemplate = db.prepare('INSERT INTO entity_templates (id, project_id, name, description, fields_json, default_content, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertEntity = db.prepare('INSERT INTO entities (id, project_id, tab_id, title, content, text_crdt_state, template_id, status, revision, updated_at, tags_json, aliases_json, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertField = db.prepare('INSERT INTO entity_fields (id, entity_id, field_key, field_value, data_json) VALUES (?, ?, ?, ?, ?)')
  const insertAsset = db.prepare('INSERT INTO entity_assets (id, entity_id, name, mime_type, data_url, data_json) VALUES (?, ?, ?, ?, ?, ?)')
  const insertEntityHistory = db.prepare('INSERT INTO entity_history (id, entity_id, timestamp, actor_type, label, details, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertRelation = db.prepare('INSERT INTO domain_relations (id, project_id, source_entity_id, target_entity_id, relation_type, label, created_at, updated_at, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertProjectHistory = db.prepare('INSERT INTO project_history (id, project_id, timestamp, actor_type, label, details, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertChangeEvent = db.prepare('INSERT INTO change_events (id, timestamp, actor_type, label, details, source, correlation_id, intent, project_id, tab_id, entity_id, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertGraph = db.prepare('INSERT INTO graph_layout_positions (project_id, entity_id, x, y) VALUES (?, ?, ?, ?)')
  const insertLlmTrace = db.prepare('INSERT INTO llm_traces (id, timestamp, correlation_id, provider, model, prompt_snippet, response_snippet, duration_ms, first_token_ms, token_estimate, status, error_detail, data_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertCorrelation = db.prepare('INSERT INTO correlation_reports (correlation_id, intent, started_at, finished_at, status, events_json, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)')

  for (const project of state.projects ?? []) {
    insertProject.run(project.id, project.name, project.description, project.createdAt, project.updatedAt, JSON.stringify(project))

    project.tabs.forEach((tab, index) => {
      insertProjectTab.run(tab.id, project.id, index, tab.name, tab.prompt, tab.icon, JSON.stringify(tab))
    })

    project.templates.forEach((template) => {
      insertTemplate.run(
        template.id,
        project.id,
        template.name,
        template.description,
        JSON.stringify(template.fields),
        template.defaultContent,
        JSON.stringify(template),
      )
    })

    project.entities.forEach((entity) => {
      insertEntity.run(
        entity.id,
        project.id,
        entity.tabId,
        entity.title,
        entity.content,
        entity.textCrdtState ?? null,
        entity.templateId,
        entity.status,
        entity.revision,
        entity.updatedAt,
        JSON.stringify(entity.tags ?? []),
        JSON.stringify(entity.aliases ?? []),
        JSON.stringify(entity),
      )

      ;(entity.fields ?? []).forEach((field) => {
        insertField.run(field.id, entity.id, field.key, field.value, JSON.stringify(field))
      })

      ;(entity.assets ?? []).forEach((asset) => {
        insertAsset.run(asset.id, entity.id, asset.name, asset.mimeType, asset.dataUrl, JSON.stringify(asset))
      })

      ;(entity.history ?? []).forEach((historyEvent) => {
        insertEntityHistory.run(
          historyEvent.id,
          entity.id,
          historyEvent.timestamp,
          historyEvent.actorType,
          historyEvent.label,
          historyEvent.details,
          JSON.stringify(historyEvent),
        )
      })

    })

    ;(project.relations ?? []).forEach((relation) => {
      insertRelation.run(
        relation.id,
        project.id,
        relation.sourceEntityId,
        relation.targetEntityId,
        relation.relationType,
        relation.label ?? null,
        relation.createdAt,
        relation.updatedAt,
        JSON.stringify(relation),
      )
    })

    project.history.forEach((historyEvent) => {
      insertProjectHistory.run(
        historyEvent.id,
        project.id,
        historyEvent.timestamp,
        historyEvent.actorType,
        historyEvent.label,
        historyEvent.details,
        JSON.stringify(historyEvent),
      )
    })
  }

  ;(state.changeLog ?? []).forEach((changeEvent) => {
    insertChangeEvent.run(
      changeEvent.id,
      changeEvent.timestamp,
      changeEvent.actorType,
      changeEvent.label,
      changeEvent.details,
      changeEvent.source,
      changeEvent.correlationId ?? null,
      changeEvent.intent ?? null,
      changeEvent.projectId ?? null,
      changeEvent.tabId ?? null,
      changeEvent.entityId ?? null,
      JSON.stringify(changeEvent),
    )
  })

  const graphLayouts = state.graphLayouts ?? {}
  for (const [projectId, layout] of Object.entries(graphLayouts)) {
    for (const [entityId, position] of Object.entries(layout ?? {})) {
      insertGraph.run(projectId, entityId, position.x, position.y)
    }
  }

  ;(state.llmTraces ?? []).forEach((trace) => {
    insertLlmTrace.run(
      trace.id,
      trace.timestamp,
      trace.correlationId ?? null,
      trace.provider,
      trace.model,
      trace.promptSnippet,
      trace.responseSnippet,
      trace.durationMs,
      trace.firstTokenMs ?? null,
      trace.tokenEstimate,
      trace.status,
      trace.errorDetail ?? null,
      JSON.stringify(trace),
    )
  })

  ;(state.correlationReports ?? []).forEach((report) => {
    insertCorrelation.run(
      report.correlationId,
      report.intent,
      report.startedAt,
      report.finishedAt ?? null,
      report.status,
      JSON.stringify(report.events ?? []),
      JSON.stringify(report),
    )
  })

  upsertWorkspaceKv(db, 'settings', state.settings ?? null, nowMs)
  upsertWorkspaceKv(
    db,
    'active_pointer',
    {
      activeProjectId: state.activeProjectId,
      activeTabId: state.activeTabId,
      activeEntityId: state.activeEntityId,
    },
    nowMs,
  )
  upsertWorkspaceKv(db, 'sync_remote_config', state.syncRemoteConfig ?? null, nowMs)
  upsertWorkspaceKv(db, 'sync_stats', state.syncStats ?? null, nowMs)
}

function buildFtsEntityRecord(projectId, entity) {
  if (!entity || entity.status !== 'active') {
    return null
  }
  return {
    entityId: entity.id,
    projectId,
    tabId: entity.tabId ?? '',
    title: entity.title ?? '',
    aliases: Array.isArray(entity.aliases) ? entity.aliases.join(' ') : '',
    tags: Array.isArray(entity.tags) ? entity.tags.join(' ') : '',
    content: entity.content ?? '',
  }
}

function flattenFtsEntitiesFromState(state) {
  const map = new Map()
  for (const project of state?.projects ?? []) {
    for (const entity of project.entities ?? []) {
      const record = buildFtsEntityRecord(project.id, entity)
      if (record) {
        map.set(record.entityId, record)
      }
    }
  }
  return map
}

function isSameFtsPayload(a, b) {
  return (
    a.projectId === b.projectId
    && a.title === b.title
    && a.aliases === b.aliases
    && a.tags === b.tags
    && a.content === b.content
  )
}

async function syncEntityLanceDb(previousState, nextState) {
  const previousMap = flattenFtsEntitiesFromState(previousState)
  const nextMap = flattenFtsEntitiesFromState(nextState)

  const toDelete = []
  for (const [entityId] of previousMap) {
    if (!nextMap.has(entityId)) {
      toDelete.push(entityId)
    }
  }

  const toUpsert = []
  for (const [entityId, nextRecord] of nextMap) {
    const prevRecord = previousMap.get(entityId)
    if (prevRecord && isSameFtsPayload(prevRecord, nextRecord)) {
      continue
    }
    toUpsert.push(nextRecord)
  }

  if (toDelete.length === 0 && toUpsert.length === 0) return

  let table = await getLanceTable()
  if (!table && toUpsert.length > 0) {
    console.log('[Desktop] Creating LanceDB table with', toUpsert.length, 'records')
    const dataWithVectors = []
    for (const record of toUpsert) {
       const text = [record.title, record.aliases, record.tags, record.content].join(' ')
       const vector = await getEmbedding(text)
       dataWithVectors.push({ ...record, vector })
    }
    const db = await getLanceDb()
    if (db) await db.createTable('entities', dataWithVectors)
    return
  }
  
  if (!table) return

  if (toDelete.length > 0) {
    const condition = `entityId IN (${toDelete.map(id => `'${id}'`).join(', ')})`
    await table.delete(condition)
  }

  if (toUpsert.length > 0) {
    const dataWithVectors = []
    for (const record of toUpsert) {
       const text = [record.title, record.aliases, record.tags, record.content].join(' ')
       const vector = await getEmbedding(text)
       dataWithVectors.push({ ...record, vector })
       await table.delete(`entityId = '${record.entityId}'`)
    }
    await table.add(dataWithVectors)
  }
}

async function getLanceTable() {
  const db = await getLanceDb()
  if (!db) return null
  const tableNames = await db.tableNames()
  if (tableNames.includes('entities')) {
    return await db.openTable('entities')
  }
  return null
}

async function persistStateToDb(db, state) {
  console.log('[Desktop] persistStateToDb - projects:', state?.projects?.length)
  const nowMs = Date.now()
  const stateJson = JSON.stringify(state)
  const previousState = loadStateFromDb(db)
  const upsertAppState = db.prepare('INSERT INTO app_state (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at')
  const upsertSnapshot = db.prepare('INSERT INTO workspace_snapshots (snapshot_key, schema_version, state_json, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(snapshot_key) DO UPDATE SET schema_version = excluded.schema_version, state_json = excluded.state_json, updated_at = excluded.updated_at')

  runDbTransaction(db, () => {
    upsertAppState.run(APP_STATE_KEY, stateJson, nowMs)
    upsertSnapshot.run(APP_STATE_KEY, DB_SCHEMA_VERSION, stateJson, nowMs)
    replaceDerivedTablesFromState(db, state, nowMs)
  })
  
  try {
    await syncEntityLanceDb(previousState, state)
  } catch(err) {
    console.error('[Desktop] LanceDB sync failed:', err)
  }

  console.log('[Desktop] persistStateToDb complete - stateJson size:', stateJson.length)
}

function loadStateFromDb(db) {
  console.log('[Desktop] loadStateFromDb - checking workspace_snapshots')
  const snapshotStmt = db.prepare('SELECT state_json FROM workspace_snapshots WHERE snapshot_key = ? LIMIT 1')
  const snapshotRow = snapshotStmt.get(APP_STATE_KEY)
  if (snapshotRow && typeof snapshotRow.state_json === 'string') {
    console.log('[Desktop] Found state in workspace_snapshots, size:', snapshotRow.state_json.length)
    try {
      return JSON.parse(snapshotRow.state_json)
    } catch {
      console.log('[Desktop] Failed to parse snapshot JSON')
      return null
    }
  }

  console.log('[Desktop] No snapshot, checking app_state')
  const appStateStmt = db.prepare('SELECT value FROM app_state WHERE key = ? LIMIT 1')
  const appStateRow = appStateStmt.get(APP_STATE_KEY)
  if (appStateRow && typeof appStateRow.value === 'string') {
    console.log('[Desktop] Found state in app_state, size:', appStateRow.value.length)
    try {
      return JSON.parse(appStateRow.value)
    } catch {
      console.log('[Desktop] Failed to parse app_state JSON')
      return null
    }
  }

  console.log('[Desktop] No state found in database')
  return null
}

function clearStateInDb(db) {
  runDbTransaction(db, () => {
    db.prepare('DELETE FROM app_state WHERE key = ?').run(APP_STATE_KEY)
    db.prepare('DELETE FROM workspace_snapshots WHERE snapshot_key = ?').run(APP_STATE_KEY)
    db.exec('DELETE FROM workspace_kv')
    db.exec('DELETE FROM projects')
    db.exec('DELETE FROM project_tabs')
    db.exec('DELETE FROM entity_templates')
    db.exec('DELETE FROM entities')
    db.exec('DELETE FROM entity_fields')
    db.exec('DELETE FROM entity_assets')
    db.exec('DELETE FROM entity_history')
    db.exec('DELETE FROM domain_relations')
    db.exec('DELETE FROM project_history')
    db.exec('DELETE FROM change_events')
    db.exec('DELETE FROM graph_layout_positions')
    db.exec('DELETE FROM llm_traces')
    db.exec('DELETE FROM correlation_reports')
    db.exec('DELETE FROM sync_queue')
    db.exec('DELETE FROM sync_state')
  })
}

function buildFtsQuery(input) {
  const normalized = typeof input === 'string' ? input.trim().toLowerCase() : ''
  if (!normalized) {
    return ''
  }
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}_-]/gu, '').trim())
    .filter(Boolean)
    .slice(0, 8)

  if (tokens.length === 0) {
    return ''
  }

  return tokens.map((token) => `${token}*`).join(' AND ')
}

async function queryDesktopFts(payload) {
  const projectId = typeof payload?.projectId === 'string' ? payload.projectId.trim() : ''
  const query = typeof payload?.query === 'string' ? payload.query.trim() : ''
  const limitInput = Number(payload?.limit)
  const limit = Number.isFinite(limitInput) ? Math.max(1, Math.min(50, Math.floor(limitInput))) : 12

  if (!projectId || !query) {
    return []
  }

  const table = await getLanceTable()
  if (!table) return []

  const vector = await getEmbedding(query)
  try {
    const results = await table.search(vector)
      .filter(`projectId = '${projectId}'`)
      .limit(limit)
      .execute()

    return results.map(row => {
      const distance = typeof row._distance === 'number' ? row._distance : 0
      const score = 1000 / (1 + distance)
      
      let snippet = row.content ? row.content.slice(0, 160) : row.title
      if (snippet && snippet.length === 160) snippet += '…'

      return {
        entityId: row.entityId,
        tabId: row.tabId ?? '',
        title: row.title,
        snippet: snippet || row.title,
        score,
      }
    })
  } catch (err) {
    console.error('[Desktop] Vector search failed:', err)
    return []
  }
}

function parseIsoToEpochMs(value) {
  if (typeof value !== 'string') {
    return Date.now()
  }
  const ms = new Date(value).getTime()
  return Number.isFinite(ms) ? ms : Date.now()
}

function readSyncQueueFromDb(db) {
  const rows = db.prepare('SELECT item_json FROM sync_queue ORDER BY enqueued_at ASC').all()
  const queue = []
  for (const row of rows) {
    if (!row || typeof row.item_json !== 'string') {
      continue
    }
    try {
      const parsed = JSON.parse(row.item_json)
      if (parsed && typeof parsed.id === 'string') {
        queue.push(parsed)
      }
    } catch {
      // ignore malformed queue records
    }
  }
  return queue
}

function writeSyncQueueToDb(db, queue) {
  const insert = db.prepare('INSERT INTO sync_queue (id, enqueued_at, next_attempt_at, poisoned_at, item_json) VALUES (?, ?, ?, ?, ?)')

  runDbTransaction(db, () => {
    db.exec('DELETE FROM sync_queue')
    for (const item of queue ?? []) {
      insert.run(
        item.id,
        parseIsoToEpochMs(item.enqueuedAt),
        parseIsoToEpochMs(item.nextAttemptAt),
        item.poisonedAt ? parseIsoToEpochMs(item.poisonedAt) : null,
        JSON.stringify(item),
      )
    }
  })
}

function readSyncLastStateFromDb(db) {
  const row = db.prepare('SELECT value_json FROM sync_state WHERE key = ? LIMIT 1').get('last_state')
  if (!row || typeof row.value_json !== 'string') {
    return null
  }
  try {
    return JSON.parse(row.value_json)
  } catch {
    return null
  }
}

function writeSyncLastStateToDb(db, state) {
  const nowMs = Date.now()
  const stmt = db.prepare('INSERT INTO sync_state (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at')
  stmt.run('last_state', JSON.stringify(state), nowMs)
}

function clearSyncPersistenceInDb(db) {
  runDbTransaction(db, () => {
    db.exec('DELETE FROM sync_queue')
    db.prepare('DELETE FROM sync_state WHERE key = ?').run('last_state')
  })
}

function getStateDb() {
  if (!DatabaseSync) {
    console.log('[Desktop] DatabaseSync not available, returning null')
    return null
  }
  if (stateDb) {
    console.log('[Desktop] Returning cached database instance')
    return stateDb
  }
  console.log('[Desktop] Creating new SQLite database at:', APP_STATE_DB_PATH)
  try {
    const db = new DatabaseSync(APP_STATE_DB_PATH)
    console.log('[Desktop] Database created, bootstrapping schema...')
    bootstrapStateSchema(db)
    stateDb = db
    console.log('[Desktop] Database ready')
    return db
  } catch (error) {
    console.error('[Desktop] Failed to create database:', error)
    return null
  }
}

async function migrateLegacyJsonStateToDb() {
  const db = getStateDb()
  if (!db) {
    return
  }

  const hasStateStmt = db.prepare('SELECT 1 AS exists_flag FROM workspace_snapshots WHERE snapshot_key = ? LIMIT 1')
  const existing = hasStateStmt.get(APP_STATE_KEY)
  if (existing) {
    return
  }

  const legacyState = await loadStateFallbackJson()
  if (!legacyState) {
    return
  }

  persistStateToDb(db, legacyState)
}

async function saveStateFallbackJson(state) {
  await fs.writeFile(APP_STATE_PATH, JSON.stringify(state), 'utf8')
}

async function loadStateFallbackJson() {
  try {
    const content = await fs.readFile(APP_STATE_PATH, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

async function clearStateFallbackJson() {
  try {
    await fs.rm(APP_STATE_PATH, { force: true })
  } catch {
    // ignore
  }
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1100,
    minHeight: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (!app.isPackaged) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools({ mode: 'detach' })
    return
  }

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

ipcMain.handle('novel:fs:save-file', async (_event, payload) => {
  const response = await dialog.showSaveDialog({
    defaultPath: payload.filename,
    filters: [{ name: 'JSON', extensions: ['json'] }, { name: 'Text', extensions: ['txt', 'md'] }, { name: 'All', extensions: ['*'] }],
  })
  if (response.canceled || !response.filePath) {
    return false
  }
  await fs.writeFile(response.filePath, payload.content, 'utf8')
  return true
})

ipcMain.handle('novel:fs:pick-text-file', async (_event, payload) => {
  const response = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: 'Import', extensions: ['json', 'txt', 'md'] }],
  })
  if (response.canceled || response.filePaths.length === 0) {
    return null
  }
  const filePath = response.filePaths[0]
  const content = await fs.readFile(filePath, 'utf8')
  return content
})

ipcMain.handle('novel:state:init', async () => {
  console.log('[Desktop IPC] novel:state:init')
  await ensureUserDataDir()
  const db = getStateDb()
  if (db) {
    console.log('[Desktop IPC] SQLite database initialized')
  } else {
    console.log('[Desktop IPC] SQLite not available, will use JSON fallback')
  }
  await migrateLegacyJsonStateToDb()
  return true
})
ipcMain.handle('novel:state:save', async (_event, state) => {
  console.log('[Desktop IPC] novel:state:save - projects:', state?.projects?.length)
  await ensureUserDataDir()
  const db = getStateDb()
  if (db) {
    try {
      await persistStateToDb(db, state)
      console.log('[Desktop IPC] State persisted to SQLite')
      return true
    } catch (error) {
      console.error('[Desktop IPC] SQLite persist failed:', error)
    }
  }

  console.log('[Desktop IPC] Falling back to JSON file')
  await saveStateFallbackJson(state)
  return true
})
ipcMain.handle('novel:state:load', async () => {
  console.log('[Desktop IPC] novel:state:load')
  await ensureUserDataDir()
  const db = getStateDb()
  if (db) {
    try {
      const state = loadStateFromDb(db)
      console.log('[Desktop IPC] State loaded from SQLite, projects:', state?.projects?.length)
      return state
    } catch (error) {
      console.error('[Desktop IPC] SQLite load failed:', error)
    }
  }

  console.log('[Desktop IPC] Falling back to JSON file')
  return loadStateFallbackJson()
})
ipcMain.handle('novel:state:clear', async () => {
  await ensureUserDataDir()
  const db = getStateDb()
  if (db) {
    clearStateInDb(db)
    return true
  }

  await clearStateFallbackJson()
  return true
})

ipcMain.handle('novel:sync:init', async () => {
  await ensureUserDataDir()
  getStateDb()
  return true
})

ipcMain.handle('novel:sync:read-queue', async () => {
  await ensureUserDataDir()
  const db = getStateDb()
  if (!db) {
    return []
  }
  return readSyncQueueFromDb(db)
})

ipcMain.handle('novel:sync:write-queue', async (_event, queue) => {
  await ensureUserDataDir()
  const db = getStateDb()
  if (!db) {
    return false
  }
  writeSyncQueueToDb(db, Array.isArray(queue) ? queue : [])
  return true
})

ipcMain.handle('novel:sync:read-last-state', async () => {
  await ensureUserDataDir()
  const db = getStateDb()
  if (!db) {
    return null
  }
  return readSyncLastStateFromDb(db)
})

ipcMain.handle('novel:sync:write-last-state', async (_event, state) => {
  await ensureUserDataDir()
  const db = getStateDb()
  if (!db) {
    return false
  }
  writeSyncLastStateToDb(db, state)
  return true
})

ipcMain.handle('novel:sync:clear', async () => {
  await ensureUserDataDir()
  const db = getStateDb()
  if (!db) {
    return false
  }
  clearSyncPersistenceInDb(db)
  return true
})

ipcMain.handle('novel:search:fts', async (_event, payload) => {
  await ensureUserDataDir()
  try {
    return await queryDesktopFts(payload)
  } catch (error) {
    console.warn('[Desktop FTS] Query failed', error)
    return []
  }
})

app.whenReady().then(() => {
  ensureUserDataDir()
    .then(() => {
      getStateDb()
    })
    .catch(() => {
      // ignore startup init errors
    })

  createMainWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (stateDb) {
    try {
      stateDb.close()
    } catch {
      // ignore
    }
    stateDb = null
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

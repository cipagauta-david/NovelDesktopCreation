type TextCrdtOp = {
  id: string
  actorId: string
  counter: number
  timestamp: string
  type: 'insert' | 'delete'
  index: number
  text?: string
  length?: number
}

type TextCrdtDoc = {
  version: 1
  actorId: string
  counter: number
  ops: TextCrdtOp[]
}

function parseDoc(raw: string | undefined, actorId: string): TextCrdtDoc {
  if (!raw) {
    return { version: 1, actorId, counter: 0, ops: [] }
  }

  try {
    const parsed = JSON.parse(raw) as TextCrdtDoc
    if (parsed.version === 1 && Array.isArray(parsed.ops)) {
      return parsed
    }
  } catch {
    // ignore malformed persisted docs
  }

  return { version: 1, actorId, counter: 0, ops: [] }
}

function applyOp(content: string, op: TextCrdtOp): string {
  const safeIndex = Math.max(0, Math.min(content.length, op.index))

  if (op.type === 'insert') {
    const text = op.text ?? ''
    return `${content.slice(0, safeIndex)}${text}${content.slice(safeIndex)}`
  }

  const length = Math.max(0, op.length ?? 0)
  return `${content.slice(0, safeIndex)}${content.slice(Math.min(content.length, safeIndex + length))}`
}

function diffToOps(previous: string, next: string, actorId: string, startCounter: number, timestamp: string): { ops: TextCrdtOp[]; counter: number } {
  if (previous === next) {
    return { ops: [], counter: startCounter }
  }

  let prefix = 0
  while (prefix < previous.length && prefix < next.length && previous[prefix] === next[prefix]) {
    prefix += 1
  }

  let prevSuffix = previous.length
  let nextSuffix = next.length
  while (prevSuffix > prefix && nextSuffix > prefix && previous[prevSuffix - 1] === next[nextSuffix - 1]) {
    prevSuffix -= 1
    nextSuffix -= 1
  }

  const removedLength = prevSuffix - prefix
  const inserted = next.slice(prefix, nextSuffix)
  const ops: TextCrdtOp[] = []
  let counter = startCounter

  if (removedLength > 0) {
    counter += 1
    ops.push({
      id: `${actorId}:${counter}:d`,
      actorId,
      counter,
      timestamp,
      type: 'delete',
      index: prefix,
      length: removedLength,
    })
  }

  if (inserted.length > 0) {
    counter += 1
    ops.push({
      id: `${actorId}:${counter}:i`,
      actorId,
      counter,
      timestamp,
      type: 'insert',
      index: prefix,
      text: inserted,
    })
  }

  return { ops, counter }
}

function normalizeOps(ops: TextCrdtOp[]): TextCrdtOp[] {
  return [...ops].sort((a, b) => {
    const ts = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    if (ts !== 0) return ts
    const actor = a.actorId.localeCompare(b.actorId)
    if (actor !== 0) return actor
    return a.counter - b.counter
  })
}

export function buildNextTextCrdtState(params: {
  actorId: string
  previousText: string
  nextText: string
  previousState?: string
  timestamp: string
}): string | undefined {
  const doc = parseDoc(params.previousState, params.actorId)
  const diff = diffToOps(params.previousText, params.nextText, params.actorId, doc.counter, params.timestamp)
  if (diff.ops.length === 0 && !params.previousState) {
    return undefined
  }

  return JSON.stringify({
    version: 1,
    actorId: doc.actorId,
    counter: diff.counter,
    ops: [...doc.ops, ...diff.ops],
  } satisfies TextCrdtDoc)
}

export function mergeTextFromCrdt(params: {
  localText: string
  remoteText: string
  localState?: string
  remoteState?: string
  actorId: string
}): { text: string; state?: string } {
  const localDoc = parseDoc(params.localState, params.actorId)
  const remoteDoc = parseDoc(params.remoteState, params.actorId)

  const mergedMap = new Map<string, TextCrdtOp>()
  for (const op of [...localDoc.ops, ...remoteDoc.ops]) {
    if (!mergedMap.has(op.id)) {
      mergedMap.set(op.id, op)
    }
  }

  const mergedOps = normalizeOps(Array.from(mergedMap.values()))
  if (mergedOps.length === 0) {
    return {
      text: params.remoteText.length >= params.localText.length ? params.remoteText : params.localText,
      state: undefined,
    }
  }

  let materialized = ''
  for (const op of mergedOps) {
    materialized = applyOp(materialized, op)
  }

  const fallback = params.remoteText.length >= params.localText.length ? params.remoteText : params.localText
  const resolvedText = materialized.length > 0 ? materialized : fallback

  return {
    text: resolvedText,
    state: JSON.stringify({
      version: 1,
      actorId: params.actorId,
      counter: Math.max(localDoc.counter, remoteDoc.counter),
      ops: mergedOps,
    } satisfies TextCrdtDoc),
  }
}

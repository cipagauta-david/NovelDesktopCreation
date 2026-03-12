import type { EntityRecord } from '../../types/workspace'

import type { FtsSearchResult, IndexEntry } from './types'
import { normalizeRawContent, tokenFrequency, tokenize } from './tokenize'

const K1 = 1.2
const B = 0.75
const TITLE_BOOST = 5.0
const ALIAS_BOOST = 3.5
const TAG_BOOST = 2.5
const FIELD_BOOST = 1.5

export class SearchIndex {
  private entries = new Map<string, IndexEntry>()
  private invertedIndex = new Map<string, Set<string>>()
  private avgDocLength = 0

  buildFromEntities(entities: EntityRecord[]): void {
    this.entries.clear()
    this.invertedIndex.clear()

    let totalTokens = 0

    for (const entity of entities) {
      if (entity.status !== 'active') continue

      const entry = this.buildEntry(entity)
      this.entries.set(entity.id, entry)

      const totalEntryTokens = entry.fieldTokens.size + entry.contentTokens.size
      totalTokens += totalEntryTokens

      for (const token of entry.fieldTokens.keys()) {
        this.addToInverted(token, entity.id)
      }
      for (const token of entry.contentTokens.keys()) {
        this.addToInverted(token, entity.id)
      }
    }

    this.avgDocLength = this.entries.size > 0 ? totalTokens / this.entries.size : 1
  }

  upsertEntity(entity: EntityRecord): void {
    this.removeEntity(entity.id)

    if (entity.status !== 'active') return

    const entry = this.buildEntry(entity)
    this.entries.set(entity.id, entry)

    for (const token of entry.fieldTokens.keys()) {
      this.addToInverted(token, entity.id)
    }
    for (const token of entry.contentTokens.keys()) {
      this.addToInverted(token, entity.id)
    }

    this.recalcAvgLength()
  }

  removeEntity(entityId: string): void {
    const existing = this.entries.get(entityId)
    if (!existing) return

    for (const token of existing.fieldTokens.keys()) {
      this.invertedIndex.get(token)?.delete(entityId)
    }
    for (const token of existing.contentTokens.keys()) {
      this.invertedIndex.get(token)?.delete(entityId)
    }
    this.entries.delete(entityId)
    this.recalcAvgLength()
  }

  search(query: string, maxResults = 12): FtsSearchResult[] {
    const queryTokens = tokenize(query)
    if (queryTokens.length === 0) return []

    const candidateIds = new Set<string>()
    for (const qt of queryTokens) {
      const exact = this.invertedIndex.get(qt)
      if (exact) {
        for (const id of exact) candidateIds.add(id)
      }
      for (const [token, ids] of this.invertedIndex) {
        if (token.startsWith(qt) && token !== qt) {
          for (const id of ids) candidateIds.add(id)
        }
      }
    }

    if (candidateIds.size === 0) return []

    const results: FtsSearchResult[] = []
    const N = this.entries.size

    for (const entityId of candidateIds) {
      const entry = this.entries.get(entityId)
      if (!entry) continue

      let score = 0
      const docLength = entry.fieldTokens.size + entry.contentTokens.size

      for (const qt of queryTokens) {
        const df = this.getDocFrequency(qt)
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)

        const titleFreq = this.getTokenFreq(entry.fieldTokens, qt)
        if (titleFreq > 0) {
          const tf = (titleFreq * (K1 + 1)) / (titleFreq + K1 * (1 - B + (B * docLength) / this.avgDocLength))
          score += idf * tf * TITLE_BOOST
        }

        const contentFreq = this.getTokenFreq(entry.contentTokens, qt)
        if (contentFreq > 0) {
          const tf = (contentFreq * (K1 + 1)) / (contentFreq + K1 * (1 - B + (B * docLength) / this.avgDocLength))
          score += idf * tf
        }
      }

      if (score > 0) {
        results.push({
          entityId,
          tabId: entry.tabId,
          title: entry.title,
          snippet: this.buildSnippet(entry, queryTokens),
          score,
        })
      }
    }

    results.sort((a, b) => b.score - a.score)
    return results.slice(0, maxResults)
  }

  private buildEntry(entity: EntityRecord): IndexEntry {
    const titleTokens = tokenize(entity.title)
    const aliasTokens = entity.aliases.flatMap((a) => tokenize(a))
    const tagTokens = entity.tags.flatMap((t) => tokenize(t))
    const fieldValueTokens = entity.fields.flatMap((f) => [...tokenize(f.key), ...tokenize(f.value)])
    const contentTokens = tokenize(entity.content)

    const fieldFreq = tokenFrequency([...titleTokens, ...aliasTokens])
    for (const [token, freq] of tokenFrequency(aliasTokens)) {
      fieldFreq.set(token, (fieldFreq.get(token) ?? 0) + freq * (ALIAS_BOOST / TITLE_BOOST))
    }
    for (const [token, freq] of tokenFrequency(tagTokens)) {
      fieldFreq.set(token, (fieldFreq.get(token) ?? 0) + freq * (TAG_BOOST / TITLE_BOOST))
    }

    const contentFreq = tokenFrequency([...contentTokens, ...fieldValueTokens])
    for (const [token, freq] of tokenFrequency(fieldValueTokens)) {
      contentFreq.set(token, (contentFreq.get(token) ?? 0) + freq * FIELD_BOOST)
    }

    return {
      entityId: entity.id,
      tabId: entity.tabId,
      title: entity.title,
      fieldTokens: fieldFreq,
      contentTokens: contentFreq,
      rawContent: normalizeRawContent(entity.content),
      revision: entity.revision,
    }
  }

  private addToInverted(token: string, entityId: string): void {
    let set = this.invertedIndex.get(token)
    if (!set) {
      set = new Set()
      this.invertedIndex.set(token, set)
    }
    set.add(entityId)
  }

  private getDocFrequency(queryToken: string): number {
    let count = 0
    const exact = this.invertedIndex.get(queryToken)
    if (exact) count += exact.size
    for (const [token, ids] of this.invertedIndex) {
      if (token.startsWith(queryToken) && token !== queryToken) {
        count += ids.size
      }
    }
    return count
  }

  private getTokenFreq(freqMap: Map<string, number>, queryToken: string): number {
    let total = freqMap.get(queryToken) ?? 0
    for (const [token, freq] of freqMap) {
      if (token.startsWith(queryToken) && token !== queryToken) {
        total += freq * 0.6
      }
    }
    return total
  }

  private recalcAvgLength(): void {
    if (this.entries.size === 0) {
      this.avgDocLength = 1
      return
    }
    let total = 0
    for (const entry of this.entries.values()) {
      total += entry.fieldTokens.size + entry.contentTokens.size
    }
    this.avgDocLength = total / this.entries.size
  }

  private buildSnippet(entry: IndexEntry, queryTokens: string[]): string {
    const raw = entry.rawContent
    if (!raw) return entry.title

    const lower = raw.toLowerCase()
    let bestIndex = -1

    for (const qt of queryTokens) {
      const idx = lower.indexOf(qt)
      if (idx !== -1) {
        bestIndex = idx
        break
      }
    }

    if (bestIndex === -1) return raw.slice(0, 160)

    const start = Math.max(0, bestIndex - 50)
    const end = Math.min(raw.length, start + 200)
    const snippet = raw.slice(start, end)

    return (start > 0 ? '…' : '') + snippet + (end < raw.length ? '…' : '')
  }

  get indexedCount(): number {
    return this.entries.size
  }
}

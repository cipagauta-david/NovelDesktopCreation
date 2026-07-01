import { pipeline, env, type FeatureExtractionPipeline } from '@xenova/transformers'
import type { EntityRecord } from '../../types/workspace'
import type { FtsSearchResult } from './types'

// Configure transformers for browser
env.allowLocalModels = false
env.useBrowserCache = true

// Helper for cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
}

export type VectorIndexEntry = {
  entityId: string
  tabId: string
  title: string
  rawContent: string
  vector: number[]
}

export class SearchIndex {
  private entries = new Map<string, VectorIndexEntry>()
  private extractorPromise: Promise<FeatureExtractionPipeline> | null = null

  private getExtractor() {
    if (!this.extractorPromise) {
      console.log('[SearchIndex] Loading Xenova embedding model in browser...')
      this.extractorPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
        quantized: true,
      }) as Promise<FeatureExtractionPipeline>
    }
    return this.extractorPromise
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!text.trim()) return new Array(384).fill(0)
    try {
      const extractor = await this.getExtractor()
      const output = await extractor(text, { pooling: 'mean', normalize: true })
      return Array.from(output.data) as number[]
    } catch (e) {
      console.error('[SearchIndex] Embedding generation failed', e)
      return new Array(384).fill(0)
    }
  }

  async buildFromEntities(entities: EntityRecord[]): Promise<void> {
    this.entries.clear()
    const valid = entities.filter(e => e.status === 'active')
    
    // In a real scenario we'd batch, but here we process sequentially
    for (const entity of valid) {
      await this.upsertEntity(entity)
    }
  }

  async upsertEntity(entity: EntityRecord): Promise<void> {
    this.removeEntity(entity.id)
    if (entity.status !== 'active') return

    const text = [
      entity.title,
      ...(entity.aliases || []),
      ...(entity.tags || []),
      entity.content
    ].join(' ')

    const vector = await this.getEmbedding(text)

    this.entries.set(entity.id, {
      entityId: entity.id,
      tabId: entity.tabId,
      title: entity.title,
      rawContent: entity.content,
      vector,
    })
  }

  removeEntity(entityId: string): void {
    this.entries.delete(entityId)
  }

  async search(query: string, maxResults = 12): Promise<FtsSearchResult[]> {
    if (!query.trim() || this.entries.size === 0) return []

    const queryVector = await this.getEmbedding(query)
    
    const results: { entry: VectorIndexEntry; score: number }[] = []
    
    for (const entry of this.entries.values()) {
      const score = cosineSimilarity(queryVector, entry.vector)
      if (score > 0.2) { // Minimal threshold
        results.push({ entry, score })
      }
    }

    results.sort((a, b) => b.score - a.score)
    
    return results.slice(0, maxResults).map(({ entry, score }) => {
      let snippet = entry.rawContent ? entry.rawContent.slice(0, 160) : entry.title
      if (snippet && snippet.length === 160) snippet += '…'
      return {
        entityId: entry.entityId,
        tabId: entry.tabId,
        title: entry.title,
        snippet: snippet || entry.title,
        score: score * 1000
      }
    })
  }

  get indexedCount(): number {
    return this.entries.size
  }
}

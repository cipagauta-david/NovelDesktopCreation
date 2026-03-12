export type FtsSearchResult = {
  entityId: string
  tabId: string
  title: string
  snippet: string
  score: number
}

export type IndexEntry = {
  entityId: string
  tabId: string
  title: string
  fieldTokens: Map<string, number>
  contentTokens: Map<string, number>
  rawContent: string
  revision: number
}

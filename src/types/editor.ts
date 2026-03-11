export type MarkdownEditorHandle = {
  focus: () => void
  setSelection: (from: number, to: number) => void
  getSelectionEnd: () => number | null
}

export type EditorMode = 'live' | 'split' | 'source'

export type RenderDocumentOptions = {
  activeBlockRange?: { start: number; end: number } | null
  showRawActiveBlock?: boolean
}

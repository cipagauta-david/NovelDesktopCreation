export type MarkdownEditorHandle = {
  focus: () => void
  setSelection: (from: number, to: number) => void
  getSelectionEnd: () => number | null
}

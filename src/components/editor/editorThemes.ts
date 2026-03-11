import { EditorView } from '@codemirror/view'
import type { EditorMode } from '../../types/editor'

export const editorModes: Array<{ id: EditorMode; label: string; description: string }> = [
  { id: 'split', label: 'Dividida', description: 'Markdown y previsualización lado a lado' },
  { id: 'source', label: 'Source', description: 'Texto markdown sin formato' },
  { id: 'live', label: 'Live Preview', description: 'Sintaxis visible solo en el bloque activo' },
]

export const editorBasicSetup = {
  lineNumbers: false,
  highlightActiveLineGutter: false,
  foldGutter: false,
  highlightActiveLine: false,
  highlightSelectionMatches: false,
  autocompletion: false,
  searchKeymap: false,
  foldKeymap: false,
  completionKeymap: false,
  lintKeymap: false,
}

export const baseEditorTheme = EditorView.theme(
  {
    '&': {
      backgroundColor: 'transparent',
      color: '#dbe6f5',
      fontFamily: 'inherit',
      fontSize: '1.05rem',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'inherit',
      lineHeight: '1.6',
    },
    '.cm-content, .cm-gutter': {
      minHeight: '420px',
      padding: '1rem 1.1rem',
    },
    '.cm-content': {
      caretColor: '#f8fafc',
    },
    '.cm-line': {
      padding: '0',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    },
    '.cm-activeLine, .cm-gutterElement': {
      backgroundColor: 'transparent',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.22) !important',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: '#f8fafc',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(59, 130, 246, 0.22)',
    },
    '.cm-panels': {
      backgroundColor: 'rgba(10, 16, 28, 0.98)',
      color: '#dbe6f5',
    },
  },
  { dark: true },
)

export const liveOverlayTheme = EditorView.theme(
  {
    '&': {
      position: 'absolute',
      inset: '0',
      zIndex: '2',
    },
    '.cm-content': {
      color: 'transparent',
      caretColor: '#f8fafc',
    },
    '.cm-line': {
      color: 'transparent',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'rgba(59, 130, 246, 0.22) !important',
    },
  },
  { dark: true },
)

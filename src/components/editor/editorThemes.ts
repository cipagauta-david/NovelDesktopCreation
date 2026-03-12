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
      padding: '1.25rem 1.3rem',
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
    '.cm-format-token': {
      color: 'rgba(125, 211, 252, 0.58)',
      fontWeight: '700',
    },
    '.cm-source-heading-1, .cm-live-heading-1': {
      color: '#f8fafc',
      fontSize: 'clamp(2rem, 2.6vw, 2.8rem)',
      lineHeight: '1.06',
      fontWeight: '700',
      letterSpacing: '-0.03em',
    },
    '.cm-source-heading-2, .cm-live-heading-2': {
      color: '#e2ebff',
      fontSize: 'clamp(1.34rem, 1.8vw, 1.72rem)',
      lineHeight: '1.14',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    '.cm-source-heading-3, .cm-live-heading-3': {
      color: '#d8e7ff',
      fontSize: '1.1rem',
      lineHeight: '1.22',
      fontWeight: '650',
    },
    '.cm-live-list-item': {
      color: '#dbe6f5',
    },
    '.cm-live-bullet': {
      color: '#7dd3fc',
      paddingRight: '0.12rem',
    },
    '.cm-entity-pill': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.38rem',
      margin: '0 0.06rem',
      padding: '0.16rem 0.58rem',
      borderRadius: '999px',
      background: 'rgba(59, 130, 246, 0.16)',
      boxShadow: 'inset 0 0 0 1px rgba(96, 165, 250, 0.18)',
      color: '#bfdbfe',
      lineHeight: '1.1',
      verticalAlign: 'baseline',
    },
    '.cm-entity-pill-icon': {
      color: '#7dd3fc',
      fontSize: '0.72rem',
    },
    '.cm-ghost-text': {
      color: 'rgba(148, 163, 184, 0.42)',
      pointerEvents: 'none',
      whiteSpace: 'pre',
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

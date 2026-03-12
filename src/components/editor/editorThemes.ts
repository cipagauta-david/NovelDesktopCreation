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
      color: 'var(--text-body)',
      fontFamily: 'var(--font-serif)',
      fontSize: 'var(--editor-font-size, 1.12rem)',
      transition: 'color var(--motion-base)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--font-serif)',
      lineHeight: '1.72',
    },
    '.cm-content, .cm-gutter': {
      minHeight: '420px',
      padding: 'var(--editor-padding, 1.25rem 1.3rem)',
    },
    '.cm-content': {
      caretColor: 'var(--color-primary)',
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
      backgroundColor: 'var(--color-primary-dim) !important',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'var(--color-primary)',
    },
    '&.cm-focused .cm-selectionBackground, ::selection': {
      backgroundColor: 'var(--color-primary-dim)',
    },
    '.cm-panels': {
      backgroundColor: 'var(--surface-glass)',
      color: 'var(--text-body)',
    },
    '.cm-format-token': {
      color: 'var(--text-ghost)',
      fontWeight: '700',
    },
    '.cm-source-heading-1, .cm-live-heading-1': {
      color: 'var(--text-heading)',
      fontFamily: 'var(--font-serif)',
      fontSize: 'clamp(2.1rem, 2.8vw, 2.95rem)',
      lineHeight: '1.08',
      fontWeight: '700',
      letterSpacing: '-0.03em',
    },
    '.cm-source-heading-2, .cm-live-heading-2': {
      color: 'var(--text-heading)',
      fontFamily: 'var(--font-serif)',
      fontSize: 'clamp(1.34rem, 1.8vw, 1.72rem)',
      lineHeight: '1.2',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    '.cm-source-heading-3, .cm-live-heading-3': {
      color: 'var(--text-heading)',
      fontFamily: 'var(--font-serif)',
      fontSize: '1.1rem',
      lineHeight: '1.28',
      fontWeight: '650',
    },
    '.cm-live-list-item': {
      color: 'var(--text-body)',
    },
    '.cm-live-bullet': {
      color: 'var(--color-primary)',
      paddingRight: '0.12rem',
    },
    '.cm-entity-pill': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.38rem',
      margin: '0 0.06rem',
      padding: '0.16rem 0.58rem',
      borderRadius: '24px',
      background: 'var(--color-primary-dim)',
      boxShadow: 'inset 0 0 0 1px var(--border-active)',
      color: 'var(--color-primary-hover)',
      lineHeight: '1.1',
      verticalAlign: 'baseline',
      transition: 'box-shadow var(--motion-fast), background var(--motion-fast)',
    },
    '.cm-entity-pill.is-neural-glow': {
       animation: 'neural-pulse 2s infinite ease-in-out',
       boxShadow: '0 0 12px var(--color-primary-glow)',
       borderColor: 'var(--color-primary)',
    },
    '.cm-entity-pill-icon': {
      color: 'inherit',
      fontSize: '0.72rem',
    },
    '.cm-ghost-text': {
      color: 'var(--text-ghost)',
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
      caretColor: 'var(--color-primary)',
    },
    '.cm-line': {
      color: 'transparent',
    },
    '.cm-selectionBackground': {
      backgroundColor: 'var(--color-primary-dim) !important',
    },
  },
  { dark: true },
)

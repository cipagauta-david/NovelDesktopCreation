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
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-editor)',
      fontSize: 'var(--editor-font-size, 1.05rem)',
      transition: 'color var(--motion-base)',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-scroller': {
      overflow: 'auto',
      fontFamily: 'var(--font-editor)',
      lineHeight: '1.82',
    },
    '.cm-content, .cm-gutter': {
      minHeight: '420px',
      padding: 'var(--editor-padding, 1.5rem 1.5rem)',
    },
    '.cm-content': {
      caretColor: 'var(--color-primary)',
      maxWidth: 'min(var(--editor-readable-width, 68ch), 100% - 1rem)',
      margin: '0 auto',
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
      fontFamily: 'var(--font-editor)',
      fontSize: 'clamp(1.75rem, 1.4rem + 1.8vw, 2.5rem)',
      lineHeight: '1.2',
      fontWeight: '700',
      letterSpacing: '-0.03em',
    },
    '.cm-source-heading-2, .cm-live-heading-2': {
      color: 'var(--text-heading)',
      fontFamily: 'var(--font-editor)',
      fontSize: 'clamp(1.3rem, 1.15rem + 0.8vw, 1.75rem)',
      lineHeight: '1.3',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    '.cm-source-heading-3, .cm-live-heading-3': {
      color: 'var(--text-heading)',
      fontFamily: 'var(--font-editor)',
      fontSize: 'clamp(1.1rem, 1rem + 0.3vw, 1.28rem)',
      lineHeight: '1.35',
      fontWeight: '650',
    },
    '.cm-live-list-item': {
      color: 'var(--text-body)',
    },
    '.cm-live-bullet': {
      color: 'var(--color-secondary)',
      paddingRight: '0.12rem',
    },
    '.cm-entity-pill': {
      position: 'relative',
      display: 'inline-block',
      margin: '0 0.04rem',
      padding: '0 0.08rem 0.22rem 0.08rem',
      borderRadius: '0',
      background: 'linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--entity-pill-accent, var(--reference-accent, var(--color-primary))) 28%, transparent) 14%, color-mix(in srgb, var(--entity-pill-accent, var(--reference-accent, var(--color-primary))) 28%, transparent) 86%, transparent 100%)',
      backgroundSize: '100% 0.34em',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: '0 92%',
      boxShadow: 'none',
      color: 'var(--entity-pill-accent, var(--reference-accent, var(--text-body)))',
      lineHeight: '1.25',
      whiteSpace: 'nowrap',
      verticalAlign: 'middle',
      opacity: '0.96',
      textDecoration: 'none',
      transition: 'background-size var(--motion-fast), color var(--motion-fast), opacity var(--motion-fast)',
    },
    '.cm-entity-pill.is-neural-glow': {
       animation: 'neural-pulse 2s infinite ease-in-out',
       boxShadow: '0 0 12px var(--color-primary-glow)',
       borderColor: 'var(--color-primary)',
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

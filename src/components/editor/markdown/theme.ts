import { EditorView } from '@codemirror/view'

export const editorTheme = EditorView.theme(
  {
    '&': {
      borderRadius: '0',
      border: '0',
      background: 'transparent',
      fontFamily: 'var(--font-editor)',
      fontSize: '1.125rem',
      lineHeight: '1.7',
      color: 'var(--text-primary)',
    },
    '&.cm-focused': {
      outline: 'none',
      borderColor: 'transparent',
      boxShadow: 'none',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-editor)',
      minHeight: '420px',
      lineHeight: '1.7',
    },
    '.cm-content, .cm-gutter': {
      minHeight: '420px',
    },
    '.cm-content': {
      padding: '2rem 4rem',
      maxWidth: '800px',
      margin: '0 auto',
      caretColor: 'var(--text-primary)',
      fontFamily: 'var(--font-editor)',
    },
    '.cm-line': {
      padding: 0,
      wordBreak: 'break-word',
    },
    '.cm-placeholder': {
      color: 'var(--text-secondary)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--accent-primary) 24%, transparent)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--text-primary)',
    },
    '.entity-reference': {
      backgroundColor: 'color-mix(in srgb, var(--accent-primary) 14%, var(--bg-surface-raised))',
      color: 'var(--text-primary)',
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontFamily: 'var(--font-ui)',
      fontSize: '0.85em',
      fontWeight: '500',
      border: '1px solid color-mix(in srgb, var(--accent-primary) 20%, var(--border-subtle))',
      transition: 'background 0.2s ease',
      cursor: 'pointer',
    },
    '.entity-reference:hover': {
      backgroundColor: 'color-mix(in srgb, var(--accent-primary) 22%, var(--bg-surface-raised))',
      color: 'var(--text-primary)',
    },
    '.cm-inline-pill': {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.34rem',
      margin: '0 0.08rem',
      padding: '0.14rem 0.5rem',
      borderRadius: '999px',
      lineHeight: '1.1',
      verticalAlign: 'baseline',
      background: 'color-mix(in srgb, var(--accent-primary) 14%, var(--bg-surface-raised))',
      color: 'var(--text-primary)',
      boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--accent-primary) 18%, var(--border-subtle))',
    },
    '.cm-source-heading-1, .cm-source-heading-2, .cm-source-heading-3, .cm-live-heading-1, .cm-live-heading-2, .cm-live-heading-3': {
      color: 'var(--text-primary)',
      fontWeight: '700',
    },
  },
  { dark: false },
)

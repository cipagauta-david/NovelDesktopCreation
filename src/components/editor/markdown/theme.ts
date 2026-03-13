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
      color: 'var(--text-muted)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'color-mix(in srgb, var(--accent-primary) 24%, transparent)',
    },
    '.cm-cursor': {
      borderLeftColor: 'var(--text-primary)',
    },
    '.entity-reference': {
      backgroundColor: 'var(--entity-bg)',
      color: 'var(--entity-text)',
      padding: '0.15rem 0.5rem',
      borderRadius: '4px',
      fontFamily: 'var(--font-ui)',
      fontSize: '0.85em',
      fontWeight: '500',
      transition: 'background 0.2s ease',
      cursor: 'pointer',
    },
    '.entity-reference:hover': {
      backgroundColor: 'var(--accent-primary)',
      color: 'var(--bg-surface)',
    },
  },
  { dark: true },
)

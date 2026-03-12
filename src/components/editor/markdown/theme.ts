import { EditorView } from '@codemirror/view'

export const editorTheme = EditorView.theme(
  {
    '&': {
      borderRadius: '22px',
      border: '1px solid rgba(148, 163, 184, 0.14)',
      background: 'rgba(3, 8, 17, 0.78)',
      fontSize: '1.05rem',
    },
    '&.cm-focused': {
      outline: 'none',
      borderColor: 'rgba(125, 211, 252, 0.28)',
      boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.08)',
    },
    '.cm-scroller': {
      fontFamily: 'inherit',
      minHeight: '420px',
      lineHeight: '1.6',
    },
    '.cm-content, .cm-gutter': {
      minHeight: '420px',
    },
    '.cm-content': {
      padding: '1rem 1.1rem',
      caretColor: '#f8fafc',
    },
    '.cm-line': {
      padding: 0,
      wordBreak: 'break-word',
    },
    '.cm-placeholder': {
      color: 'rgba(148, 163, 184, 0.5)',
    },
    '.cm-selectionBackground, ::selection': {
      backgroundColor: 'rgba(59, 130, 246, 0.24)',
    },
    '.cm-cursor': {
      borderLeftColor: '#f8fafc',
    },
  },
  { dark: true },
)

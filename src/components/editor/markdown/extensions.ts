import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

import { livePreviewExtension, sourceModeExtension } from './decorations'
import { editorTheme } from './theme'

export function buildMarkdownExtensions(mode: 'source' | 'live'): Extension[] {
  const baseExtensions: Extension[] = [EditorView.lineWrapping, markdown(), editorTheme, sourceModeExtension]

  if (mode === 'live') {
    baseExtensions.push(livePreviewExtension)
  }

  return baseExtensions
}

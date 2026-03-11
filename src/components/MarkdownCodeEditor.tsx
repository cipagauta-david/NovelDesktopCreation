import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'

import CodeMirror, { type ReactCodeMirrorRef, type ViewUpdate } from '@uiw/react-codemirror'
import { EditorSelection, type Extension } from '@codemirror/state'
import { markdown } from '@codemirror/lang-markdown'
import { oneDark } from '@codemirror/theme-one-dark'
import {
  Decoration,
  EditorView,
  MatchDecorator,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
} from '@codemirror/view'

import type { MarkdownEditorHandle } from '../types/editor'

type MarkdownCodeEditorProps = {
  value: string
  mode: 'source' | 'live'
  placeholder: string
  ariaLabel: string
  onChange: (value: string, selectionEnd: number | null) => void
}

const REFERENCE_PATTERN = /\{\{entity:[^|}]+\|([^}]+)\}\}/g

class ReferenceWidget extends WidgetType {
  constructor(private readonly label: string) {
    super()
  }

  override eq(other: ReferenceWidget) {
    return other.label === this.label
  }

  override toDOM() {
    const element = document.createElement('span')
    element.className = 'cm-inline-pill'
    element.textContent = this.label
    element.setAttribute('aria-hidden', 'true')
    return element
  }
}

class BulletWidget extends WidgetType {
  override eq() {
    return true
  }

  override toDOM() {
    const element = document.createElement('span')
    element.className = 'cm-live-bullet'
    element.textContent = '•'
    element.setAttribute('aria-hidden', 'true')
    return element
  }
}

function selectionTouchesRange(view: EditorView, from: number, to: number) {
  const selection = view.state.selection.main
  return selection.from <= to && selection.to >= from
}

function buildLiveDecorations(view: EditorView): DecorationSet {
  const decorations = []
  const activeLineNumber = view.state.doc.lineAt(view.state.selection.main.head).number

  for (const visibleRange of view.visibleRanges) {
    const startLine = view.state.doc.lineAt(visibleRange.from).number
    const endLine = view.state.doc.lineAt(visibleRange.to).number

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      const line = view.state.doc.line(lineNumber)
      if (line.number === activeLineNumber) {
        continue
      }

      const headingMatch = /^(\s*)(#{1,6})\s+/.exec(line.text)
      if (headingMatch) {
        const markerFrom = line.from + headingMatch[1].length
        const markerTo = markerFrom + headingMatch[2].length + 1

        if (!selectionTouchesRange(view, markerFrom, markerTo)) {
          decorations.push(Decoration.replace({}).range(markerFrom, markerTo))
        }

        decorations.push(
          Decoration.line({
            attributes: { class: `cm-live-line cm-live-heading-${headingMatch[2].length}` },
          }).range(line.from),
        )
      }

      const listMatch = /^(\s*)([-*])\s+/.exec(line.text)
      if (listMatch) {
        const markerFrom = line.from + listMatch[1].length
        const markerTo = markerFrom + listMatch[2].length + 1

        if (!selectionTouchesRange(view, markerFrom, markerTo)) {
          decorations.push(Decoration.replace({ widget: new BulletWidget() }).range(markerFrom, markerTo))
        }

        decorations.push(
          Decoration.line({
            attributes: { class: 'cm-live-line cm-live-list-item' },
          }).range(line.from),
        )
      }

      const lineOffset = line.from
      REFERENCE_PATTERN.lastIndex = 0
      let match = REFERENCE_PATTERN.exec(line.text)
      while (match) {
        const tokenFrom = lineOffset + match.index
        const tokenTo = tokenFrom + match[0].length

        if (!selectionTouchesRange(view, tokenFrom, tokenTo)) {
          decorations.push(
            Decoration.replace({ widget: new ReferenceWidget(match[1]) }).range(tokenFrom, tokenTo),
          )
        }

        match = REFERENCE_PATTERN.exec(line.text)
      }
    }
  }

  return Decoration.set(decorations, true)
}

const livePreviewExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildLiveDecorations(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildLiveDecorations(update.view)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)

const hiddenSyntaxMatcher = new MatchDecorator({
  regexp: /^(#{1,6}\s+|[-*]\s+)/gm,
  decoration: Decoration.mark({ class: 'cm-format-token' }),
})

const sourceModeExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = hiddenSyntaxMatcher.createDeco(view)
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = hiddenSyntaxMatcher.updateDeco(update, this.decorations)
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
)

const editorTheme = EditorView.theme(
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

export const MarkdownCodeEditor = forwardRef<MarkdownEditorHandle, MarkdownCodeEditorProps>(
  function MarkdownCodeEditor({ value, mode, placeholder, ariaLabel, onChange }, ref) {
    const editorRef = useRef<ReactCodeMirrorRef | null>(null)

    useImperativeHandle(ref, () => ({
      focus() {
        editorRef.current?.view?.focus()
      },
      setSelection(from: number, to: number) {
        const view = editorRef.current?.view
        if (!view) {
          return
        }

        view.dispatch({
          selection: EditorSelection.range(from, to),
          scrollIntoView: true,
        })
      },
      getSelectionEnd() {
        return editorRef.current?.view?.state.selection.main.head ?? null
      },
    }))

    const extensions = useMemo<Extension[]>(() => {
      const baseExtensions: Extension[] = [EditorView.lineWrapping, markdown(), editorTheme, sourceModeExtension]

      if (mode === 'live') {
        baseExtensions.push(livePreviewExtension)
      }

      return baseExtensions
    }, [mode])

    return (
      <div className={mode === 'live' ? 'code-editor-shell live-preview-mode' : 'code-editor-shell source-mode'}>
        <CodeMirror
          ref={editorRef}
          value={value}
          theme={oneDark}
          basicSetup={{
            lineNumbers: false,
            foldGutter: false,
            highlightActiveLineGutter: false,
            highlightActiveLine: mode === 'source',
          }}
          placeholder={placeholder}
          extensions={extensions}
          className="markdown-codemirror"
          aria-label={ariaLabel}
          onChange={(nextValue, viewUpdate) => {
            onChange(nextValue, viewUpdate.state.selection.main.head)
          }}
        />
      </div>
    )
  },
)

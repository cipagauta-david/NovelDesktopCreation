import { Decoration, EditorView, MatchDecorator, ViewPlugin, type DecorationSet } from '@codemirror/view'
import type { ViewUpdate } from '@uiw/react-codemirror'

import { REFERENCE_PATTERN } from './constants'
import { BulletWidget, ReferenceWidget } from './widgets'

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
          decorations.push(Decoration.replace({ widget: new ReferenceWidget(match[1]) }).range(tokenFrom, tokenTo))
        }

        match = REFERENCE_PATTERN.exec(line.text)
      }
    }
  }

  return Decoration.set(decorations, true)
}

export const livePreviewExtension = ViewPlugin.fromClass(
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

export const sourceModeExtension = ViewPlugin.fromClass(
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

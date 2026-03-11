import { EditorSelection, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  keymap,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'

const REFERENCE_PATTERN = /\{\{entity:([^|}]+)\|([^}]+)\}\}/g

class ReferenceWidget extends WidgetType {
  constructor(
    private entityId: string,
    private label: string,
  ) {
    super()
  }

  override eq(other: ReferenceWidget) {
    return other.entityId === this.entityId && other.label === this.label
  }

  override toDOM() {
    const element = document.createElement('span')
    element.className = 'cm-entity-pill'
    element.dataset.entityId = this.entityId
    element.setAttribute('aria-hidden', 'true')
    element.setAttribute('title', `Entidad: ${this.label}\nCtrl+Click para abrir entidad`) // Tooltip básico nativo

    const icon = document.createElement('span')
    icon.className = 'cm-entity-pill-icon'
    icon.textContent = '✦'

    const text = document.createElement('span')
    text.textContent = this.label

    element.append(icon, text)
    return element
  }

  override ignoreEvent() {
    return false
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

class GhostTextWidget extends WidgetType {
  constructor(text: string) {
    super()
    Object.assign(this, { text })
  }

  private getText() {
    return (this as unknown as { text: string }).text
  }

  override eq(other: GhostTextWidget) {
    return (other as unknown as { text: string }).text === this.getText()
  }

  override toDOM() {
    const element = document.createElement('span')
    element.className = 'cm-ghost-text'
    element.textContent = this.getText()
    element.setAttribute('aria-hidden', 'true')
    return element
  }
}

export type GhostTextProvider = (view: EditorView) => string
export type EntityHoverPayload = {
  entityId: string
  label: string
  rect: DOMRect
}

type LiveEditorInteractions = {
  onEntityInteract?: (entityId: string) => void
  onEntityHover?: (payload: EntityHoverPayload) => void
  onEntityHoverEnd?: () => void
}

function selectionTouchesRange(view: EditorView, from: number, to: number) {
  const selection = view.state.selection.main
  return selection.from <= to && selection.to >= from
}

function buildSourceDecorations(view: EditorView): DecorationSet {
  const decorations = []

  for (const visibleRange of view.visibleRanges) {
    const startLine = view.state.doc.lineAt(visibleRange.from).number
    const endLine = view.state.doc.lineAt(visibleRange.to).number

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      const line = view.state.doc.line(lineNumber)
      const headingMatch = /^(\s*)(#{1,6})\s+/.exec(line.text)
      if (!headingMatch) {
        continue
      }

      const markerFrom = line.from + headingMatch[1].length
      const markerTo = markerFrom + headingMatch[2].length + 1
      decorations.push(Decoration.mark({ class: 'cm-format-token' }).range(markerFrom, markerTo))
      decorations.push(
        Decoration.line({
          attributes: { class: `cm-source-heading-${headingMatch[2].length}` },
        }).range(line.from),
      )
    }
  }

  return Decoration.set(decorations, true)
}

function buildLiveDecorations(view: EditorView): DecorationSet {
  const decorations = []

  for (const visibleRange of view.visibleRanges) {
    const startLine = view.state.doc.lineAt(visibleRange.from).number
    const endLine = view.state.doc.lineAt(visibleRange.to).number

    for (let lineNumber = startLine; lineNumber <= endLine; lineNumber += 1) {
      const line = view.state.doc.line(lineNumber)
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
          Decoration.line({ attributes: { class: 'cm-live-line cm-live-list-item' } }).range(line.from),
        )
      }

      REFERENCE_PATTERN.lastIndex = 0
      let match = REFERENCE_PATTERN.exec(line.text)
      while (match) {
        const tokenFrom = line.from + match.index
        const tokenTo = tokenFrom + match[0].length
        if (!selectionTouchesRange(view, tokenFrom, tokenTo)) {
          decorations.push(
            Decoration.replace({ widget: new ReferenceWidget(match[1], match[2]) }).range(tokenFrom, tokenTo),
          )
        }
        match = REFERENCE_PATTERN.exec(line.text)
      }
    }
  }

  return Decoration.set(decorations, true)
}

function createDynamicPlugin(builder: (view: EditorView) => DecorationSet) {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet

      constructor(view: EditorView) {
        this.decorations = builder(view)
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = builder(update.view)
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  )
}

export function createSourceEditorExtensions(): Extension[] {
  return [createDynamicPlugin(buildSourceDecorations)]
}

function getEntityPillFromTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Node)) {
    return null
  }
  const anchor = target instanceof HTMLElement ? target : target.parentElement
  return (anchor?.closest('.cm-entity-pill') as HTMLElement | null) ?? null
}

export function createLiveEditorExtensions(interactions: LiveEditorInteractions = {}): Extension[] {
  const { onEntityInteract, onEntityHover, onEntityHoverEnd } = interactions

  return [
    createDynamicPlugin(buildLiveDecorations),
    EditorView.domEventHandlers({
      click(event) {
        if (event.button !== 0 || (!event.ctrlKey && !event.metaKey)) {
          return false
        }

        const pill = getEntityPillFromTarget(event.target)
        if (pill && pill.dataset.entityId) {
          event.preventDefault()
          interactions.onEntityInteract?.(pill.dataset.entityId)
          return true
        }
        return false
      },
      mousemove(event) {
        const pill = getEntityPillFromTarget(event.target)
        if (!pill || !pill.dataset.entityId) {
          onEntityHoverEnd?.()
          return false
        }

        onEntityHover?.({
          entityId: pill.dataset.entityId,
          label: pill.textContent?.trim() ?? '',
          rect: pill.getBoundingClientRect(),
        })
        return false
      },
      mouseleave() {
        onEntityHoverEnd?.()
        return false
      },
    }),
    EditorView.theme({
      '.cm-entity-pill': {
        cursor: 'pointer',
        transition: 'all 0.1s ease',
      },
      '.cm-entity-pill:hover': {
        outline: '1px solid var(--accent-light, #a0a0a0)',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }
    })
  ]
}

export function createGhostTextExtensions(getGhostText: GhostTextProvider): Extension[] {
  return [
    createDynamicPlugin((view) => {
      const selection = view.state.selection.main
      const suggestion = selection.empty ? getGhostText(view) : ''
      if (!suggestion) {
        return Decoration.none
      }
      return Decoration.set([
        Decoration.widget({ widget: new GhostTextWidget(suggestion), side: 1 }).range(selection.head),
      ])
    }),
    keymap.of([
      {
        key: 'Tab',
        run(view) {
          const suggestion = getGhostText(view)
          if (!suggestion) {
            return false
          }

          const { head } = view.state.selection.main
          view.dispatch({
            changes: { from: head, to: head, insert: suggestion },
            selection: EditorSelection.cursor(head + suggestion.length),
          })
          return true
        },
      },
    ]),
  ]
}

export function createNarrativeGhostTextProvider(entityTitle: string): GhostTextProvider {
  const subject = entityTitle.trim().split(/\s+/)[0] ?? 'la escena'

  return (view) => {
    const selection = view.state.selection.main
    if (!selection.empty) {
      return ''
    }

    const line = view.state.doc.lineAt(selection.head)
    const beforeCursor = line.text.slice(0, selection.head - line.from)
    const trimmed = beforeCursor.trim()

    if (!trimmed || trimmed.endsWith('}}') || /\{\{[^}]*$/.test(beforeCursor)) {
      return ''
    }

    if (selection.head !== line.to) {
      return ''
    }

    if (/^[-*]\s+.{0,18}$/u.test(trimmed)) {
      return 'con una consecuencia visible'
    }

    if (/[.!?…:]$/u.test(trimmed)) {
      return '\n\n## Siguiente título'
    }

    if (trimmed.length < 28 || /^[#-]/.test(trimmed)) {
      return ''
    }

    return `, mientras ${subject.toLowerCase()} siente cómo cambia el equilibrio.`
  }
}
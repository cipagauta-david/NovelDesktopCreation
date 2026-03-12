import { WidgetType } from '@codemirror/view'

export class ReferenceWidget extends WidgetType {
  private readonly label: string

  constructor(label: string) {
    super()
    this.label = label
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

export class BulletWidget extends WidgetType {
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

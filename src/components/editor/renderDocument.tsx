import { type ReactNode } from 'react'
import type { RenderDocumentOptions } from '../../types/editor'
import { getReferenceTokens } from '../../utils/references'

export const REFERENCE_TOKEN_PATTERN = /(\{\{entity:[^|}]+\|[^}]+\}\})/g

export function renderInlineContent(text: string) {
  return text.split(REFERENCE_TOKEN_PATTERN).map((chunk, index) => {
    const token = getReferenceTokens(chunk)[0]
    if (!token) {
      return <span key={`${chunk}-${index}`}>{chunk}</span>
    }

    return (
      <span
        key={`${token.raw}-${index}`}
        className="editor-inline-pill"
        contentEditable={false}
        spellCheck={false}
      >
        <span className="editor-inline-pill-icon" aria-hidden="true">
          ✦
        </span>
        <span>{token.label}</span>
      </span>
    )
  })
}

export function renderDocument(content: string, options: RenderDocumentOptions = {}): ReactNode {
  const { activeBlockRange = null, showRawActiveBlock = false } = options

  if (!content) {
    return <span className="editor-placeholder">Escribe aquí la entidad. Usa {'{{}}'} para referencias cruzadas.</span>
  }

  return content.split('\n').map((line, index) => {
    const trimmed = line.trim()
    const renderRawLine =
      showRawActiveBlock &&
      activeBlockRange != null &&
      index >= activeBlockRange.start &&
      index <= activeBlockRange.end

    if (renderRawLine) {
      return (
        <div key={`line-${index}`} className="doc-block doc-active-raw-line">
          <span>{line || '\u200b'}</span>
        </div>
      )
    }

    if (!trimmed) {
      return <div key={`blank-${index}`} className="doc-blank" aria-hidden="true" />
    }

    if (trimmed.startsWith('### ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-heading doc-heading-3">
          {renderInlineContent(line.replace(/^\s*###\s+/, ''))}
        </div>
      )
    }

    if (trimmed.startsWith('## ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-heading doc-heading-2">
          {renderInlineContent(line.replace(/^\s*##\s+/, ''))}
        </div>
      )
    }

    if (trimmed.startsWith('# ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-heading doc-heading-1">
          {renderInlineContent(line.replace(/^\s*#\s+/, ''))}
        </div>
      )
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      return (
        <div key={`line-${index}`} className="doc-block doc-list-item">
          <span className="doc-list-bullet">•</span>
          <span>{renderInlineContent(line.replace(/^\s*[-*]\s+/, ''))}</span>
        </div>
      )
    }

    return (
      <div key={`line-${index}`} className="doc-block doc-paragraph">
        {renderInlineContent(line)}
      </div>
    )
  })
}

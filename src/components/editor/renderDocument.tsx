import { type ReactNode } from 'react'
import type { RenderDocumentOptions } from '../../types/editor'
import { getReferenceTokens } from '../../utils/references'
import { SketchVariable } from './SketchVariable'
import '../../styles/editor/renderDocument.css';



export const REFERENCE_TOKEN_PATTERN = /(\{\{entity:[^|}]+\|[^}]+\}\})/g

const RAW_REFERENCE_PATTERN = /^\{\{entity:([^|}]+)\|([^}]+)\}\}$/

export function renderInlineContent(text: string) {
  // V0ID_NOTE: index is sufficient as key — this array is derived from a deterministic split
  // and never reordered. Using the full chunk string as a key wastes string comparison budget.
  return text.split(REFERENCE_TOKEN_PATTERN).map((chunk, index) => {
    const token = getReferenceTokens(chunk)[0]
    if (!token) {
      return <span key={index}>{chunk}</span>
    }

    return <SketchVariable key={index} token={token} />
  })
}

function renderRawInlineContent(line: string) {
  return line.split(REFERENCE_TOKEN_PATTERN).map((chunk, index) => {
    const tokenMatch = RAW_REFERENCE_PATTERN.exec(chunk)
    if (!tokenMatch) {
      return <span key={index}>{chunk}</span>
    }

    const [, entityId, label] = tokenMatch
    return (
      <span key={index} className="doc-entity-token" contentEditable={false} spellCheck={false}>
        <span className="doc-entity-prefix">{'{{entity:'}</span>
        <span className="doc-entity-id">{entityId}</span>
        <span className="doc-entity-separator">|</span>
        <span className="doc-entity-label">{label}</span>
        <span className="doc-entity-suffix">{'}}'}</span>
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
          <span>{line ? renderRawInlineContent(line) : '\u200b'}</span>
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

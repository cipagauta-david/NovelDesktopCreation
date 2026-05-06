import { memo, type CSSProperties } from 'react'
import type { CollectionTab, EntityRecord, EntityTemplate } from '../../../types/workspace'
import { resolveCollectionColor } from '../../../utils/collectionColors'
import { getStableNumber } from '../../../utils/stableVisual'
import { formatTimestamp } from '../../../utils/workspace'
import { renderDocument } from '../renderDocument'
import '../../../styles/editor/panel/EntityHover.css';



type HoverPosition = {
  left: number
  top: number
}

type EntityHoverProps = {
  position: HoverPosition | null
  entity: EntityRecord | null
  templates: EntityTemplate[]
  collections: CollectionTab[]
  allEntities: EntityRecord[]
}

const REFERENCE_TOKEN_PATTERN = /\{\{entity:[^|}]+\|[^}]+\}\}/g

function buildTokenSafePreview(content: string, limit: number): string {
  const source = content.trim()
  if (source.length <= limit) {
    return source
  }

  let preview = ''
  let cursor = 0
  let remaining = limit

  for (const match of source.matchAll(REFERENCE_TOKEN_PATTERN)) {
    const token = match[0]
    const matchIndex = match.index ?? 0
    const textBefore = source.slice(cursor, matchIndex)

    if (remaining <= 0) {
      break
    }

    if (textBefore.length > 0) {
      const slice = textBefore.slice(0, remaining)
      preview += slice
      remaining -= slice.length
      if (slice.length < textBefore.length) {
        return `${preview.trimEnd()}…`
      }
    }

    if (remaining <= 0) {
      return `${preview.trimEnd()}…`
    }

    if (token.length <= remaining) {
      preview += token
      remaining -= token.length
    } else {
      // Never append partial entity tokens in hover previews.
      return `${preview.trimEnd()}…`
    }

    cursor = matchIndex + token.length
  }

  if (remaining > 0 && cursor < source.length) {
    const tail = source.slice(cursor, cursor + remaining)
    preview += tail
  }

  return preview.trimEnd().length < source.length ? `${preview.trimEnd()}…` : preview
}

// V0ID_NOTE: memo is critical here — this popover is inside the document section and
// re-renders on every mousemove otherwise, since hoveredReference position updates frequently.
export const EntityHover = memo(function EntityHover({ position, entity, templates, collections, allEntities }: EntityHoverProps) {
  if (!position || !entity) {
    return null
  }

  const previewLimit = 220
  const preview = buildTokenSafePreview(entity.content, previewLimit)
  const moduleCollection = collections.find((collection) => collection.id === entity.tabId)
  const moduleTemplate = templates.find((template) => template.id === entity.templateId)
  const moduleName = moduleCollection?.name ?? moduleTemplate?.name.split(/[\s/]+/)[0] ?? 'Entidad'
  const moduleColor = resolveCollectionColor(moduleCollection?.id ?? entity.tabId, moduleCollection?.color)
  const entityById = new Map(allEntities.map((entry) => [entry.id, entry]))
  const getReferenceAccent = (entityId: string) => {
    const referenceEntity = entityById.get(entityId)
    if (!referenceEntity) {
      return undefined
    }
    const referenceCollection = collections.find((collection) => collection.id === referenceEntity.tabId)
    return resolveCollectionColor(referenceCollection?.id ?? referenceEntity.tabId, referenceCollection?.color)
  }
  const cardTilt = getStableNumber(`hover-card-${entity.id}`, -2.8, 2.8, 2)
  const tapeTilt = getStableNumber(`hover-tape-${entity.id}`, -9, 9, 1)

  return (
    <aside
      className="entity-hover-popover"
      style={{
        ['--hover-x' as string]: `${position.left}px`,
        ['--hover-y' as string]: `${position.top}px`,
        ['--entity-pill-accent' as string]: moduleColor,
        ['--card-rot' as string]: `${cardTilt}deg`,
        ['--tape-tilt' as string]: `${tapeTilt}deg`,
      }}
      aria-live="polite"
    >
      <span className="entity-hover-avatar" aria-hidden="true">◉</span>
      <span className="eyebrow entity-hover-module" style={{ '--module-accent': moduleColor } as CSSProperties}>{moduleName}</span>
      <strong>{entity.title}</strong>
      <div className="entity-hover-preview" aria-label="Vista previa markdown">
        {preview ? renderDocument(preview, { getReferenceAccent }) : <p>Sin contenido descriptivo.</p>}
      </div>
      <div className="entity-hover-meta">
        <span>rev {entity.revision}</span>
        <span>{formatTimestamp(entity.updatedAt)}</span>
      </div>
      {entity.tags.length > 0 && <small>{entity.tags.slice(0, 4).map((tag) => `#${tag}`).join(' ')}</small>}
    </aside>
  )
})

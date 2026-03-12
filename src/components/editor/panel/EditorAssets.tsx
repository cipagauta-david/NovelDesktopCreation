import type { EntityRecord } from '../../../types/workspace'
import { PanelSection } from '../../common/PanelSection'

type EditorAssetsProps = {
  assets: EntityRecord['assets']
}

export function EditorAssets({ assets }: EditorAssetsProps) {
  return (
    <PanelSection title="Assets visuales" meta={`${assets.length} imágenes`} defaultOpen={false}>
      <div className="asset-grid">
        {assets.map((asset) => (
          <figure key={asset.id} className="asset-card">
            <img src={asset.dataUrl} alt={asset.name} />
            <figcaption>{asset.name}</figcaption>
          </figure>
        ))}
        {assets.length === 0 && <div className="empty-mini-state">Todavía no hay imágenes asociadas.</div>}
      </div>
    </PanelSection>
  )
}

import type { EntityRecord } from '../../../types/workspace'
import { EmptyMiniState } from '../../common/EmptyMiniState'
import { PanelSection } from '../../common/PanelSection'
import '../../../styles/editor/panel/EditorAssets.css';



type EditorAssetsProps = {
  assets: EntityRecord['assets']
  onAttachImages: (files: FileList | null) => Promise<void>
}

export function EditorAssets({ assets, onAttachImages }: EditorAssetsProps) {
  return (
    <PanelSection
      title="Assets visuales"
      meta={`${assets.length} imágenes`}
      defaultOpen={false}
      actions={
        <label className="assets-inline-upload" title="Subir imágenes">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              void onAttachImages(event.target.files)
              event.target.value = ''
            }}
          />
          + Imagen
        </label>
      }
    >
      <div className="asset-grid">
        {assets.map((asset) => (
          <figure key={asset.id} className="asset-card">
            <img src={asset.dataUrl} alt={asset.name} />
            <figcaption>{asset.name}</figcaption>
          </figure>
        ))}
        {assets.length === 0 && <EmptyMiniState>Arrastra imágenes sobre el editor para anexarlas.</EmptyMiniState>}
      </div>
    </PanelSection>
  )
}

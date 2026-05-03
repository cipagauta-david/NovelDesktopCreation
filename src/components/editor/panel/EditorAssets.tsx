import { memo, useCallback } from 'react'
import type { EntityRecord } from '../../../types/workspace'
import { EmptyMiniState } from '../../common/EmptyMiniState'
import { SectionCard } from '../../common/SectionCard'
import '../../../styles/editor/panel/EditorAssets.css';



type EditorAssetsProps = {
  assets: EntityRecord['assets']
  onAttachImages: (files: FileList | null) => Promise<void>
}

// V0ID_NOTE: memo + useCallback shield this grid from re-rendering on every parent state
// update. Without it, all base64 img nodes would be diffed on every keystroke in the title.
export const EditorAssets = memo(function EditorAssets({ assets, onAttachImages }: EditorAssetsProps) {
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    void onAttachImages(event.target.files)
    event.target.value = ''
  }, [onAttachImages])
  return (
    <SectionCard
      title="Assets visuales"
      meta={`${assets.length} imágenes`}
      defaultOpen={false}
      actions={
        <label className="assets-inline-upload" title="Subir imágenes">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
          + Imagen
        </label>
      }
    >
      <div className="asset-grid">
        {assets.map((asset) => (
          <figure key={asset.id} className="asset-card">
            <img src={asset.dataUrl} alt={asset.name} loading="lazy" />
            <figcaption>{asset.name}</figcaption>
          </figure>
        ))}
        {assets.length === 0 && <EmptyMiniState>Arrastra imágenes sobre el editor para anexarlas.</EmptyMiniState>}
      </div>
    </SectionCard>
  )
})

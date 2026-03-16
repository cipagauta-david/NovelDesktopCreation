const DEFAULT_COLLECTION_PALETTE = ['#60A5FA', '#FB923C', '#2DD4BF', '#A78BFA', '#F472B6', '#34D399', '#FACC15', '#F87171']

function hashText(value: string) {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export function resolveCollectionColor(collectionId: string, preferredColor?: string) {
  if (preferredColor && /^#([0-9A-Fa-f]{6})$/.test(preferredColor)) {
    return preferredColor
  }

  const paletteIndex = hashText(collectionId) % DEFAULT_COLLECTION_PALETTE.length
  return DEFAULT_COLLECTION_PALETTE[paletteIndex]
}

export function hexToRgba(hexColor: string, alpha: number) {
  const safeHex = resolveCollectionColor('fallback', hexColor).replace('#', '')
  const red = parseInt(safeHex.slice(0, 2), 16)
  const green = parseInt(safeHex.slice(2, 4), 16)
  const blue = parseInt(safeHex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

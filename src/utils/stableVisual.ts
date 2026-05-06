function hashSeed(value: string): number {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }
  return Math.abs(hash)
}

export function getStableNumber(seed: string, min: number, max: number, decimals = 2): number {
  const hash = hashSeed(seed)
  const normalized = (hash % 10000) / 9999
  const raw = min + (max - min) * normalized
  const factor = 10 ** decimals
  return Math.round(raw * factor) / factor
}

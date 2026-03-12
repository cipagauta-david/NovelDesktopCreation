const REFERENCE_TOKEN_PATTERN = /\{\{entity:[^}]*\}\}/g
const NON_WORD_PATTERN = /[^\p{L}\p{N}]+/gu

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(REFERENCE_TOKEN_PATTERN, ' ')
    .replace(NON_WORD_PATTERN, ' ')
    .split(/\s+/)
    .filter((token) => token.length > 1)
}

export function tokenFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1)
  }
  return freq
}

export function normalizeRawContent(content: string): string {
  return content
    .replace(/\{\{entity:[^|}]+\|([^}]+)\}\}/g, '$1')
    .replace(/[#>*_`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

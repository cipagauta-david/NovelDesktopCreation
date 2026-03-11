export function getLineIndex(content: string, cursorPosition: number | null) {
  if (!content || cursorPosition == null || cursorPosition <= 0) {
    return 0
  }

  return content.slice(0, cursorPosition).split('\n').length - 1
}

export function getActiveBlockRange(content: string, cursorPosition: number | null) {
  const lines = content.split('\n')
  const activeLineIndex = getLineIndex(content, cursorPosition)

  if (lines.length === 0) {
    return { start: 0, end: 0 }
  }

  if (!lines[activeLineIndex]?.trim()) {
    return { start: activeLineIndex, end: activeLineIndex }
  }

  let start = activeLineIndex
  let end = activeLineIndex

  while (start > 0 && lines[start - 1]?.trim()) {
    start -= 1
  }

  while (end < lines.length - 1 && lines[end + 1]?.trim()) {
    end += 1
  }

  return { start, end }
}

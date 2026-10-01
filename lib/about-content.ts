/** Plain prose follows the approved three chapters; authored Markdown stays intact. */
export function getAboutSections(bio: string) {
  const normalized = bio.replace(/\r\n?/g, '\n')
  const source = normalized.trim()
  const hasBlocks = /^(?: {0,3}(?:#{1,6}\s|>|[-+*]\s|\d+[.)]\s|`{3,}|~{3,}|\||\[.*\]:|<)| {4}\S|\t\S| {0,3}(?:={3,}|-{3,}|\*{3,}|_{3,})\s*$)/m.test(normalized)
  const paragraphs = source.split(/\n+/).map(text => text.trim()).filter(Boolean)
  if (hasBlocks || paragraphs.length < 5) {
    return { preface: hasBlocks ? normalized.replace(/^\n+|\n+$/g, '') : source, traces: '', encounter: '', preserveParagraphs: !hasBlocks }
  }
  return {
    preface: paragraphs.slice(0, 3).join('\n\n'),
    traces: paragraphs.slice(3, -1).join('\n\n'),
    encounter: paragraphs[paragraphs.length - 1],
    preserveParagraphs: true,
  }
}

export function makeSlug(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
  return base || `post-${Date.now().toString(36)}`
}

export function isValidSlug(slug: string): boolean {
  return /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(slug)
}

export function resourceError(prefix: string, reason: unknown): string {
  const message = reason && typeof reason === 'object' && 'message' in reason
    ? String(reason.message)
    : ''
  return `${prefix}：${message}`
}

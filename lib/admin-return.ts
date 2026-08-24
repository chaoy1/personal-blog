export function safeAdminNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/admin') || value.startsWith('//')) return '/admin'
  return value
}

export type RunOptions = {
  onUnauthorized?: () => void
}

export class AdminActionError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AdminActionError'
  }
}

function errorMessage(payload: unknown) {
  if (typeof payload === 'object' && payload !== null) {
    const { error, message } = payload as { error?: unknown; message?: unknown }
    if (typeof error === 'string') return error
    if (typeof message === 'string') return message
  }

  return '请求失败'
}

export async function runAdminAction<T>(
  request: Promise<Response>,
  options?: RunOptions,
): Promise<T> {
  const response = await request
  const payload = await response.json() as T

  if (response.ok) return payload

  if (response.status === 401) options?.onUnauthorized?.()
  throw new AdminActionError(response.status, errorMessage(payload))
}

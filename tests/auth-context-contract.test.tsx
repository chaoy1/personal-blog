import React from 'react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const profileData = {
  id: 'user-1',
  nickname: '旅人',
  avatar_url: '',
  role: 'owner',
  bio: '',
}

const authState = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'traveler@example.com' },
  fromTables: [] as string[],
}))

vi.mock('@/lib/supabase-browser', () => ({
  supabaseBrowser: () => ({
    auth: {
      getSession: vi.fn(async () => ({ data: { session: { user: authState.user } } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: (table: string) => {
      authState.fromTables.push(table)
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: async () => ({ data: profileData, error: null }),
      }
      return query
    },
  }),
}))

import { AuthProvider, useAuth } from '@/lib/auth-context'

function AuthProbe() {
  const { ready, user, profile, isOwner } = useAuth()
  return (
    <output data-testid="auth-state">
      {JSON.stringify({ ready, user: user?.id ?? null, nickname: profile?.nickname ?? null, isOwner })}
    </output>
  )
}

describe('AuthProvider data boundary', () => {
  afterEach(() => {
    cleanup()
    authState.fromTables.length = 0
  })

  it('loads session/profile only and exposes the auth contract', async () => {
    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByTestId('auth-state')).toHaveTextContent('"ready":true'))
    expect(screen.getByTestId('auth-state')).toHaveTextContent('"user":"user-1"')
    expect(screen.getByTestId('auth-state')).toHaveTextContent('"nickname":"旅人"')
    expect(screen.getByTestId('auth-state')).toHaveTextContent('"isOwner":true')
    expect(authState.fromTables).toEqual(['profiles'])
  })
})

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import type { StoreProfile, StoreUser } from '@/lib/store-types'

export type AuthContextValue = {
  ready: boolean
  error: string
  user: StoreUser | null
  profile: StoreProfile | null
  isOwner: boolean
  signOut: () => Promise<void>
  updateProfile: (patch: { nickname?: string; avatar_url?: string }) => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState<StoreUser | null>(null)
  const [profile, setProfile] = useState<StoreProfile | null>(null)

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const { data } = await supabaseBrowser()
        .from('profiles')
        .select('id, nickname, avatar_url, role, bio')
        .eq('id', uid)
        .maybeSingle()
      setProfile((data as unknown as StoreProfile | null) ?? null)
    } catch {
      setProfile(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    let sub: { subscription: { unsubscribe: () => void } } | null = null

    async function init() {
      try {
        const { data } = await supabaseBrowser().auth.getSession()
        const nextUser = (data.session?.user as StoreUser | undefined) ?? null
        if (cancelled) return
        setUser(nextUser)
        if (nextUser) await loadProfile(nextUser.id)
        if (!cancelled) setReady(true)
      } catch (e) {
        if (!cancelled) {
          setError(errMsg('初始化认证失败', e))
          setReady(true)
        }
      }

      try {
        const result = supabaseBrowser().auth.onAuthStateChange((_event, session) => {
          const nextUser = (session?.user as StoreUser | undefined) ?? null
          setUser(nextUser)
          if (nextUser) loadProfile(nextUser.id).catch(() => {})
          else setProfile(null)
        })
        sub = result.data
      } catch {
        // 认证监听不可用时，初始 session 仍然有效。
      }
    }

    void init()
    return () => {
      cancelled = true
      sub?.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    try {
      await supabaseBrowser().auth.signOut()
    } catch {
      // 即使远端退出失败，也立即清掉本地认证状态。
    }
    setUser(null)
    setProfile(null)
  }, [])

  const updateProfile = useCallback(
    async (patch: { nickname?: string; avatar_url?: string }) => {
      if (!user) return '未登录'
      try {
        const { error: err } = await supabaseBrowser()
          .from('profiles')
          .upsert({ id: user.id, ...patch })
        if (err) return err.message
        await loadProfile(user.id)
        return null
      } catch (e) {
        return errMsg('保存失败', e)
      }
    },
    [user, loadProfile],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      error,
      user,
      profile,
      isOwner: profile?.role === 'owner',
      signOut,
      updateProfile,
    }),
    [ready, error, user, profile, signOut, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 必须在 AuthProvider 内使用')
  return value
}

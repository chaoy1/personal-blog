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
import { useAuth } from '@/lib/auth-context'
import type { AlbumItem, PhotoItem } from '@/lib/store-types'

export type AlbumsContextValue = {
  ready: boolean
  error: string
  albums: AlbumItem[]
  photos: PhotoItem[]
  refreshAlbums: () => Promise<void>
  createAlbum: (title: string, description: string) => Promise<AlbumItem | null>
  updateAlbum: (id: string, patch: { title: string; description: string }) => Promise<string | null>
  deleteAlbum: (id: string) => Promise<string | null>
  deletePhoto: (id: string) => Promise<string | null>
}

export const AlbumsContext = createContext<AlbumsContextValue | null>(null)

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function AlbumsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [albums, setAlbums] = useState<AlbumItem[]>([])
  const [photos, setPhotos] = useState<PhotoItem[]>([])

  const refreshAlbums = useCallback(async () => {
    try {
      const sb = supabaseBrowser()
      const [albumsResult, photosResult] = await Promise.all([
        sb.from('albums').select('*').order('created_at', { ascending: false }),
        sb.from('photos').select('*').order('created_at', { ascending: false }).limit(2000),
      ])
      setAlbums((albumsResult.data ?? []) as unknown as AlbumItem[])
      setPhotos((photosResult.data ?? []) as unknown as PhotoItem[])
    } catch (e) {
      setError(errMsg('读取光影失败', e))
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setError('')
    void refreshAlbums().finally(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [refreshAlbums])

  const createAlbum = useCallback(
    async (title: string, description: string) => {
      if (!user) return null
      try {
        const { data, error: err } = await supabaseBrowser()
          .from('albums')
          .insert({ user_id: user.id, title, description })
          .select('*')
          .single()
        if (err) return null
        await refreshAlbums()
        return (data ?? null) as unknown as AlbumItem | null
      } catch {
        return null
      }
    },
    [user, refreshAlbums],
  )

  const updateAlbum = useCallback(
    async (id: string, patch: { title: string; description: string }) => {
      try {
        const { error: err } = await supabaseBrowser().from('albums').update(patch).eq('id', id)
        if (err) return err.message
        await refreshAlbums()
        return null
      } catch (e) {
        return errMsg('保存失败', e)
      }
    },
    [refreshAlbums],
  )

  const deleteAlbum = useCallback(
    async (id: string) => {
      try {
        const { error: err } = await supabaseBrowser().from('albums').delete().eq('id', id)
        if (err) return err.message
        await refreshAlbums()
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [refreshAlbums],
  )

  const deletePhoto = useCallback(
    async (id: string) => {
      try {
        const { error: err } = await supabaseBrowser().from('photos').delete().eq('id', id)
        if (err) return err.message
        await refreshAlbums()
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [refreshAlbums],
  )

  const value = useMemo<AlbumsContextValue>(
    () => ({ ready, error, albums, photos, refreshAlbums, createAlbum, updateAlbum, deleteAlbum, deletePhoto }),
    [ready, error, albums, photos, refreshAlbums, createAlbum, updateAlbum, deleteAlbum, deletePhoto],
  )

  return <AlbumsContext.Provider value={value}>{children}</AlbumsContext.Provider>
}

export function useAlbums(): AlbumsContextValue {
  const value = useContext(AlbumsContext)
  if (!value) throw new Error('useAlbums 必须在 AlbumsProvider 内使用')
  return value
}

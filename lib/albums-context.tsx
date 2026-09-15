'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { useAuth } from '@/lib/auth-context'
import { loadAlbums } from '@/lib/public-resource-loaders.browser'
import { usePublicResourceCache, useResourceEntry } from '@/lib/public-resource-cache'
import type { AlbumsSnapshot, ServerSnapshot } from '@/lib/public-resource-types'
import type { AlbumItem, PhotoItem } from '@/lib/store-types'

export type AlbumsContextValue = {
  ready: boolean
  hasData: boolean
  isInitialLoading: boolean
  isRefreshing: boolean
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

const EMPTY_SNAPSHOT: AlbumsSnapshot = { albums: [], photos: [] }
const ALBUMS_KEY = 'albums' as const

function errMsg(prefix: string, e: unknown): string {
  const m = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : ''
  return `${prefix}：${m}`
}

export function AlbumsProvider({
  children,
  initialSnapshot,
  initialError = '',
}: {
  children: ReactNode
  initialSnapshot?: ServerSnapshot<AlbumsSnapshot> | null
  initialError?: string
}) {
  const { user } = useAuth()
  const cache = usePublicResourceCache()
  const seededRef = useRef<ServerSnapshot<AlbumsSnapshot> | null>(null)

  if (initialSnapshot && seededRef.current !== initialSnapshot) {
    cache.seed(ALBUMS_KEY, initialSnapshot)
    seededRef.current = initialSnapshot
  }

  const entry = useResourceEntry<AlbumsSnapshot>(ALBUMS_KEY)

  const refreshAlbums = useCallback(async () => {
    await cache.revalidate(ALBUMS_KEY, loadAlbums).catch(() => undefined)
  }, [cache])

  useEffect(() => {
    void cache.preload(ALBUMS_KEY, loadAlbums).catch(() => undefined)
  }, [cache])

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
        const album = (data ?? null) as unknown as AlbumItem | null
        if (album) {
          cache.setData<AlbumsSnapshot>(ALBUMS_KEY, (current) => ({
            ...current,
            albums: [album, ...current.albums.filter((item) => item.id !== album.id)],
          }))
        } else await refreshAlbums()
        return album
      } catch {
        return null
      }
    },
    [user, cache, refreshAlbums],
  )

  const updateAlbum = useCallback(
    async (id: string, patch: { title: string; description: string }) => {
      try {
        const { error: err } = await supabaseBrowser().from('albums').update(patch).eq('id', id)
        if (err) return err.message
        cache.setData<AlbumsSnapshot>(ALBUMS_KEY, (current) => ({
          ...current,
          albums: current.albums.map((album) => album.id === id ? { ...album, ...patch } : album),
        }))
        return null
      } catch (e) {
        return errMsg('保存失败', e)
      }
    },
    [cache],
  )

  const deleteAlbum = useCallback(
    async (id: string) => {
      try {
        const { error: err } = await supabaseBrowser().from('albums').delete().eq('id', id)
        if (err) return err.message
        cache.setData<AlbumsSnapshot>(ALBUMS_KEY, (current) => ({
          albums: current.albums.filter((album) => album.id !== id),
          photos: current.photos.filter((photo) => photo.album_id !== id),
        }))
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [cache],
  )

  const deletePhoto = useCallback(
    async (id: string) => {
      try {
        const { error: err } = await supabaseBrowser().from('photos').delete().eq('id', id)
        if (err) return err.message
        cache.setData<AlbumsSnapshot>(ALBUMS_KEY, (current) => {
          const removed = current.photos.find((photo) => photo.id === id)
          const photos = current.photos.filter((photo) => photo.id !== id)
          return {
            photos,
            albums: current.albums.map((album) => {
              if (!removed || album.id !== removed.album_id || album.cover_url !== removed.url) return album
              return { ...album, cover_url: photos.find((photo) => photo.album_id === album.id)?.url ?? '' }
            }),
          }
        })
        return null
      } catch (e) {
        return errMsg('删除失败', e)
      }
    },
    [cache],
  )

  const data = entry.data ?? EMPTY_SNAPSHOT
  const hasData = entry.data !== null
  const isInitialLoading = !hasData && (entry.status === 'idle' || entry.status === 'loading')
  const isRefreshing = hasData && entry.status === 'loading'
  const error = entry.error || (!hasData ? initialError : '')
  const ready = hasData || (!isInitialLoading && !error)

  const value = useMemo<AlbumsContextValue>(
    () => ({
      ready,
      hasData,
      isInitialLoading,
      isRefreshing,
      error,
      albums: data.albums,
      photos: data.photos,
      refreshAlbums,
      createAlbum,
      updateAlbum,
      deleteAlbum,
      deletePhoto,
    }),
    [ready, hasData, isInitialLoading, isRefreshing, error, data, refreshAlbums, createAlbum, updateAlbum, deleteAlbum, deletePhoto],
  )

  return <AlbumsContext.Provider value={value}>{children}</AlbumsContext.Provider>
}

export function useAlbums(): AlbumsContextValue {
  const value = useContext(AlbumsContext)
  if (!value) throw new Error('useAlbums 必须在 AlbumsProvider 内使用')
  return value
}

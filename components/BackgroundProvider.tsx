'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { isBgName, type BgName } from './paintings'

type BgCtx = {
  bg: BgName
  setBg: (name: BgName) => void
}

const Ctx = createContext<BgCtx>({ bg: 'qianli', setBg: () => {} })

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bg, setBgState] = useState<BgName>('qianli')

  useEffect(() => {
    let saved: BgName = 'qianli'
    try {
      const raw = localStorage.getItem('bg')
      if (isBgName(raw)) saved = raw
    } catch {
      // ignore
    }
    setBgState(saved)
    document.documentElement.dataset.bg = saved
  }, [])

  function setBg(name: BgName) {
    setBgState(name)
    try {
      localStorage.setItem('bg', name)
    } catch {
      // ignore
    }
    document.documentElement.dataset.bg = name
  }

  return <Ctx.Provider value={{ bg, setBg }}>{children}</Ctx.Provider>
}

export function useBackground() {
  return useContext(Ctx)
}

'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

export type BgName = 'qianli' | 'lantern' | 'ink'

type BgCtx = {
  bg: BgName
  setBg: (name: BgName) => void
}

const Ctx = createContext<BgCtx>({ bg: 'qianli', setBg: () => {} })

export function BackgroundProvider({ children }: { children: ReactNode }) {
  const [bg, setBgState] = useState<BgName>('qianli')

  useEffect(() => {
    const saved = localStorage.getItem('bg')
    if (saved === 'qianli' || saved === 'lantern' || saved === 'ink') {
      setBgState(saved)
    }
    document.documentElement.dataset.bg = saved === 'qianli' || saved === 'lantern' || saved === 'ink' ? saved : 'qianli'
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

// 客户端繁简转换工具（只在浏览器中使用，通过动态 import 按需加载 opencc-js）

let s2tPromise: Promise<(s: string) => string> | null = null
let t2sPromise: Promise<(s: string) => string> | null = null
let observer: MutationObserver | null = null
let converting = false

function loadS2T(): Promise<(s: string) => string> {
  if (!s2tPromise) {
    s2tPromise = import('opencc-js/cn2t').then((mod) =>
      mod.Converter({ from: 'cn', to: 't' })
    )
  }
  return s2tPromise
}

function loadT2S(): Promise<(s: string) => string> {
  if (!t2sPromise) {
    t2sPromise = import('opencc-js/t2cn').then((mod) =>
      mod.Converter({ from: 't', to: 'cn' })
    )
  }
  return t2sPromise
}

export function currentLang(): 'zh-Hans' | 'zh-Hant' {
  return typeof document !== 'undefined' &&
    document.documentElement.dataset.lang === 'zh-Hant'
    ? 'zh-Hant'
    : 'zh-Hans'
}

const TEXT_ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const

function convertTree(convert: (s: string) => string): void {
  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent
      if (text) node.textContent = convert(text)
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return
    const el = node as Element
    for (const attr of TEXT_ATTRS) {
      const value = el.getAttribute(attr)
      if (value) el.setAttribute(attr, convert(value))
    }
    node.childNodes.forEach(walk)
  }
  walk(document.body)
  if (document.title) document.title = convert(document.title)
}

function startObserver(): void {
  if (observer) return
  observer = new MutationObserver(() => {
    if (converting || currentLang() !== 'zh-Hant') return
    converting = true
    requestAnimationFrame(() => {
      loadS2T()
        .then((s2t) => {
          if (currentLang() === 'zh-Hant') convertTree(s2t)
        })
        .finally(() => {
          converting = false
        })
    })
  })
  observer.observe(document.body, { childList: true, subtree: true, characterData: true })
}

export async function setLanguage(lang: 'zh-Hans' | 'zh-Hant'): Promise<void> {
  document.documentElement.dataset.lang = lang
  try {
    localStorage.setItem('lang', lang)
  } catch {
    // 忽略隐私模式等异常
  }
  if (lang === 'zh-Hant') {
    const s2t = await loadS2T()
    convertTree(s2t)
  } else {
    const t2s = await loadT2S()
    convertTree(t2s)
  }
  startObserver()
}

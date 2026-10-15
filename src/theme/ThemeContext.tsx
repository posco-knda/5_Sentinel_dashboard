import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { THEME_KEY, ThemeContext, type ThemeMode } from './theme'

const QUERY = '(prefers-color-scheme: dark)'
const systemDark = () => (typeof window.matchMedia === 'function' ? window.matchMedia(QUERY).matches : true)

function loadMode(): ThemeMode {
  try {
    const s = localStorage.getItem(THEME_KEY)
    if (s === 'light' || s === 'dark' || s === 'system') return s
  } catch {
    /* 저장소를 못 읽는 환경에서는 시스템 설정을 따른다 */
  }
  return 'system'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(loadMode)
  const [sysDark, setSysDark] = useState(systemDark)

  // 시스템 설정이 바뀌면(예: 해가 지면서 자동 다크) 'system' 모드가 바로 따라간다
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(QUERY)
    const on = () => setSysDark(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const theme = mode === 'system' ? (sysDark ? 'dark' : 'light') : mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try {
      localStorage.setItem(THEME_KEY, m)
    } catch {
      /* 저장이 막힌 환경에서는 이번 세션에만 적용한다 */
    }
  }, [])

  const value = useMemo(() => ({ mode, theme, setMode }), [mode, theme, setMode])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

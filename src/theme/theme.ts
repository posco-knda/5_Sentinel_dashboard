import { createContext, useContext } from 'react'

/** 화면 색상 모드. 'system'이면 운영체제·브라우저의 라이트/다크 설정을 따른다 */
export type ThemeMode = 'light' | 'dark' | 'system'
/** 실제로 적용되는 색상 */
export type Theme = 'light' | 'dark'

export const THEME_KEY = 'pdm-theme'

export interface ThemeContextValue {
  mode: ThemeMode
  /** 지금 화면에 적용된 색상 (mode가 system이면 시스템 설정에 따라 정해짐) */
  theme: Theme
  setMode: (mode: ThemeMode) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}

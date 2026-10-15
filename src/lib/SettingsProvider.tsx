import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, SettingsContext, sanitize, type Settings } from './settings'

const KEY = 'sentinel-settings-v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return sanitize(raw ? JSON.parse(raw) : null)
  } catch {
    return DEFAULT_SETTINGS
  }
}

function save(s: Settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    /* 저장이 막힌 환경(시크릿 모드 등)에서는 이번 세션에만 적용한다 */
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = sanitize({ ...prev, ...patch })
      save(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    save(DEFAULT_SETTINGS)
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset])
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

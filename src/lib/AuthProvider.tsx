import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ACCOUNTS } from './accounts'
import { AuthContext, type User } from './auth'

// 로그인은 탭마다 따로 — 같은 브라우저에서 탭 두 개에 다른 계정으로 들어가 결재 흐름을 볼 수 있다
const KEY = 'sentinel-session-v1'

const toUser = (id: string | null): User | null => {
  const a = ACCOUNTS.find((x) => x.id === id)
  return a ? { id: a.id, name: a.name, role: a.role } : null
}

function load(): User | null {
  try {
    return toUser(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(load)

  const login = useCallback((id: string, password: string) => {
    const a = ACCOUNTS.find((x) => x.id === id.trim().toLowerCase() && x.password === password)
    if (!a) return false
    try {
      sessionStorage.setItem(KEY, a.id)
    } catch {
      /* 저장이 막힌 환경에서는 이 탭이 열려 있는 동안만 유지된다 */
    }
    setUser(toUser(a.id))
    return true
  }, [])

  const logout = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      /* 무시 */
    }
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

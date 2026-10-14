import { createContext, useContext } from 'react'

/** 정비 담당자(1차 검토·결재 요청)와 운영 책임자(2차 검증·승인/반려) */
export type Role = 'planner' | 'manager'

export interface User {
  id: string
  name: string
  role: Role
}

export const ROLE_LABEL: Record<Role, string> = { planner: '정비 담당자', manager: '운영 책임자' }

export interface AuthContextValue {
  user: User | null
  /** 맞으면 true. 틀리면 false (어느 쪽이 틀렸는지는 알려 주지 않는다) */
  login: (id: string, password: string) => boolean
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

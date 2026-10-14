import type { Role } from './auth'

export interface Account {
  id: string
  password: string
  name: string
  role: Role
}

/**
 * 시연용 계정. 서버가 없는 시연 환경이라 브라우저에서 확인하는 가짜 로그인이며 보안 기능이 아니다.
 * 실제 서비스에서는 서버에서 암호화한 비밀번호로 인증하고 이 파일은 사라진다.
 */
export const ACCOUNTS: Account[] = [
  { id: 'planner', password: 'sentinel-plan', name: '김정비', role: 'planner' },
  { id: 'manager', password: 'sentinel-ops', name: '박운영', role: 'manager' },
]

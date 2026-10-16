import { useAuth } from '../lib/auth'
import { ManagerHome } from './home/ManagerHome'
import { PlannerHome } from './home/PlannerHome'

/** 현황 — 로그인한 역할에 따라 첫 화면이 다르다: 정비 담당자는 오늘의 업무, 운영 책임자는 결재와 전체 흐름 */
export function Overview() {
  const { user } = useAuth()
  return user?.role === 'manager' ? <ManagerHome /> : <PlannerHome />
}

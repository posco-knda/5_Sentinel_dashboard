import { createContext, useContext } from 'react'

/** 엔진별 정비 처리 상태: 미확인 → 확인 → 정비 예정(날짜) → 완료 */
export type PlanStatus = 'new' | 'ack' | 'scheduled' | 'done'

export interface PlanItem {
  status: PlanStatus
  /** 정비 예정일 (YYYY-MM-DD), status가 scheduled일 때 */
  date?: string
  updated: number
}

export const STATUS_LABEL: Record<PlanStatus, string> = {
  new: '미확인',
  ack: '확인',
  scheduled: '정비 예정',
  done: '완료',
}
export const STATUS_ORDER: PlanStatus[] = ['new', 'ack', 'scheduled', 'done']

export interface PlanContextValue {
  items: Record<number, PlanItem>
  get: (unit: number) => PlanItem
  set: (unit: number, patch: Partial<Pick<PlanItem, 'status' | 'date'>>) => void
  clearAll: () => void
}

export const PlanContext = createContext<PlanContextValue | null>(null)

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}

/** 오늘 날짜(로컬)를 YYYY-MM-DD로 */
export function todayStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

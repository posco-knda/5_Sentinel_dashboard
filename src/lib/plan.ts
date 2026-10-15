import { createContext, useContext } from 'react'
import type { Role } from './auth'

/**
 * 엔진 하나의 정비 처리 상태.
 * AI 권고(new) → 담당자 검토(review) → 결재 요청(submitted) → 운영 책임자 승인(scheduled) 또는 반려(rejected) → 정비 완료(done)
 */
export type PlanStatus = 'new' | 'review' | 'submitted' | 'rejected' | 'scheduled' | 'done'
export type PlanAction = 'review' | 'unreview' | 'submit' | 'withdraw' | 'approve' | 'reject' | 'complete'

export interface PlanEvent {
  at: number
  /** 처리한 사람 이름 */
  by: string
  role: Role
  action: PlanAction
  note?: string
  /** 결재 요청의 희망 정비일, 승인의 확정 정비일 */
  date?: string
}

export interface PlanItem {
  status: PlanStatus
  /** 정비 일정 (결재 대기 중에는 희망일, 승인 뒤에는 확정일) */
  date?: string
  updated: number
  history: PlanEvent[]
}

export const STATUS_LABEL: Record<PlanStatus, string> = {
  new: '검토 필요',
  review: '검토 중',
  submitted: '결재 대기',
  rejected: '반려',
  scheduled: '정비 예정',
  done: '완료',
}
export const STATUS_ORDER: PlanStatus[] = ['new', 'review', 'submitted', 'rejected', 'scheduled', 'done']
export const STATUS_COLOR: Record<PlanStatus, string> = {
  new: 'var(--text-muted)',
  review: 'var(--status-warning)',
  submitted: 'var(--accent)',
  rejected: 'var(--status-critical)',
  scheduled: 'var(--status-good)',
  done: 'color-mix(in oklab, var(--status-good) 45%, var(--surface-2))',
}

export const ACTION_LABEL: Record<PlanAction, string> = {
  review: '검토 시작',
  unreview: '검토 취소',
  submit: '결재 요청',
  withdraw: '요청 회수',
  approve: '승인',
  reject: '반려',
  complete: '정비 완료',
}
/** 어느 역할만 할 수 있는가 — 담당자는 올리고, 책임자만 승인·반려한다 */
export const ACTION_ROLE: Record<PlanAction, Role> = { review: 'planner', unreview: 'planner', submit: 'planner', withdraw: 'planner', approve: 'manager', reject: 'manager', complete: 'planner' }
export const ACTION_FROM: Record<PlanAction, PlanStatus[]> = {
  review: ['new'],
  unreview: ['review'],
  submit: ['new', 'review', 'rejected'],
  withdraw: ['submitted'],
  approve: ['submitted'],
  reject: ['submitted'],
  complete: ['scheduled'],
}
export const ACTION_TO: Record<PlanAction, PlanStatus> = { review: 'review', unreview: 'new', submit: 'submitted', withdraw: 'review', approve: 'scheduled', reject: 'rejected', complete: 'done' }

export const canAct = (role: Role | undefined, action: PlanAction, status: PlanStatus) => role === ACTION_ROLE[action] && ACTION_FROM[action].includes(status)

export interface ActResult {
  ok: boolean
  error?: string
}
export interface ActPayload {
  note?: string
  date?: string
}

export interface PlanContextValue {
  items: Record<number, PlanItem>
  get: (unit: number) => PlanItem
  /** 현재 로그인한 사람의 권한으로 상태를 바꾼다. 권한이 없거나 순서가 맞지 않으면 거부한다. */
  act: (unit: number, action: PlanAction, payload?: ActPayload) => ActResult
  clearAll: () => void
}

export const PlanContext = createContext<PlanContextValue | null>(null)

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext)
  if (!ctx) throw new Error('usePlan must be used within PlanProvider')
  return ctx
}

/** 가장 최근 결재 요청 */
export const lastSubmit = (item: PlanItem): PlanEvent | undefined => [...item.history].reverse().find((e) => e.action === 'submit')
/** 가장 최근 승인·반려 */
export const lastDecision = (item: PlanItem): PlanEvent | undefined => [...item.history].reverse().find((e) => e.action === 'approve' || e.action === 'reject')

/** 오늘 날짜(로컬)를 YYYY-MM-DD로 */
export function todayStr(offsetDays = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

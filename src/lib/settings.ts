import { createContext, useContext } from 'react'

/** 사용자가 바꿀 수 있는 운영 설정 — 모든 화면의 등급·기한 계산이 이 값을 따른다 */
export interface Settings {
  /** 예측 남은 수명이 이 값(cycle) 이하이면 '위험' 알림 */
  dangerN: number
  /** 엔진 하나가 하루에 평균 몇 번 비행하는가 (남은 수명 cycle을 일 단위로 바꿀 때 쓴다) */
  cyclesPerDay: number
  /** 정비 요청부터 부품·인력이 준비되기까지 걸리는 일수 */
  prepDays: number
  /** 결재 요청·승인·반려·정비 완료를 Slack으로 자동 알림 */
  notifyWorkflow: boolean
  /** 엔진이 새로 '즉시 조치'가 되면 Slack으로 자동 알림 */
  notifyUrgent: boolean
}

export const DEFAULT_SETTINGS: Settings = { dangerN: 40, cyclesPerDay: 3, prepDays: 7, notifyWorkflow: true, notifyUrgent: true }
export const LIMITS = {
  dangerN: [30, 50],
  cyclesPerDay: [1, 8],
  prepDays: [0, 30],
} as const

/** '주의' 알림은 예측 남은 수명이 이 값(cycle) 미만일 때 */
export const WARN_N = 80

export interface SettingsContextValue {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}

const clamp = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback
}

export function sanitize(raw: Partial<Record<keyof Settings, unknown>> | null | undefined): Settings {
  return {
    dangerN: clamp(raw?.dangerN, LIMITS.dangerN, DEFAULT_SETTINGS.dangerN),
    cyclesPerDay: clamp(raw?.cyclesPerDay, LIMITS.cyclesPerDay, DEFAULT_SETTINGS.cyclesPerDay),
    prepDays: clamp(raw?.prepDays, LIMITS.prepDays, DEFAULT_SETTINGS.prepDays),
    notifyWorkflow: typeof raw?.notifyWorkflow === 'boolean' ? raw.notifyWorkflow : DEFAULT_SETTINGS.notifyWorkflow,
    notifyUrgent: typeof raw?.notifyUrgent === 'boolean' ? raw.notifyUrgent : DEFAULT_SETTINGS.notifyUrgent,
  }
}

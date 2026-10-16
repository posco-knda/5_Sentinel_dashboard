import { createContext, useContext } from 'react'

/** 사용자가 바꿀 수 있는 운영 설정 — 모든 화면의 등급·기한 계산이 이 값을 따른다 */
export interface Settings {
  /** 예측 남은 수명이 이 값(cycle) 이하이면 '위험' 알림 */
  dangerN: number
  /** 엔진 하나가 하루에 평균 몇 번 비행하는가 (남은 수명 cycle을 일 단위로 바꿀 때 쓴다) */
  cyclesPerDay: number
  /** 정비 요청부터 부품·인력이 준비되기까지 걸리는 일수 */
  prepDays: number
  /** 하루에 정비할 수 있는 엔진 수 (이미 정비 예정이 이만큼이면 그 날은 예약할 수 없다) */
  slotsPerDay: number
  /** 결재 요청·승인·반려·정비 완료를 Slack으로 자동 알림 */
  notifyWorkflow: boolean
  /** 엔진이 새로 '즉시 조치'가 되면 Slack으로 자동 알림 */
  notifyUrgent: boolean
  /** 비용 기준 프리셋 (값을 직접 고치면 'custom') */
  costPreset: CostPreset
  /** 정비 효과 계산에 쓰는 비용 가정 */
  cost: CostBasis
}

export type CostPreset = 'narrow' | 'wide' | 'custom'

/** 비용 가정 — 모두 억원 단위. 공개 자료의 범위에서 고른 가정값이며 항공사 계약에 따라 다르다 */
export interface CostBasis {
  /** 계획 정비(엔진 입고) 1건 비용 */
  planned: number
  /** 비계획(고장 후) 정비는 계획 정비의 몇 배인가 */
  ratio: number
  /** 항공기 운항 중단 손실 (하루) */
  lossPerDay: number
  /** 비계획 고장 때 운항이 멈추는 일수 */
  downDays: number
  /** 긴급 물류·야간 인력·항공기 재배치 같은 부대 비용 (건당) */
  extra: number
  /** 엔진이 보통 몇 cycle 쓰이는가 — 일찍 교체해서 버려지는 잔여 수명을 값으로 바꿀 때 쓴다 */
  lifeCycles: number
}

export const COST_PRESETS: Record<'narrow' | 'wide', CostBasis> = {
  narrow: { planned: 35, ratio: 1.4, lossPerDay: 1.4, downDays: 2.5, extra: 1.4, lifeCycles: 250 },
  wide: { planned: 84, ratio: 1.4, lossPerDay: 2.1, downDays: 2.5, extra: 1.4, lifeCycles: 250 },
}
export const COST_PRESET_LABEL: Record<CostPreset, string> = { narrow: '협동체 엔진', wide: '광동체 엔진', custom: '직접 입력' }
export const COST_LIMITS: Record<keyof CostBasis, readonly [number, number]> = {
  planned: [1, 300],
  ratio: [1, 3],
  lossPerDay: [0, 10],
  downDays: [0, 14],
  extra: [0, 20],
  lifeCycles: [100, 600],
}

export const DEFAULT_SETTINGS: Settings = { dangerN: 40, cyclesPerDay: 3, prepDays: 7, slotsPerDay: 4, notifyWorkflow: true, notifyUrgent: true, costPreset: 'narrow', cost: COST_PRESETS.narrow }
export const LIMITS = {
  dangerN: [30, 50],
  cyclesPerDay: [1, 8],
  prepDays: [0, 30],
  slotsPerDay: [1, 10],
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

const decimal = (v: unknown, [lo, hi]: readonly [number, number], fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n * 100) / 100)) : fallback
}

function sanitizeCost(raw: unknown): CostBasis {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof CostBasis, unknown>>
  const d = COST_PRESETS.narrow
  return {
    planned: decimal(r.planned, COST_LIMITS.planned, d.planned),
    ratio: decimal(r.ratio, COST_LIMITS.ratio, d.ratio),
    lossPerDay: decimal(r.lossPerDay, COST_LIMITS.lossPerDay, d.lossPerDay),
    downDays: decimal(r.downDays, COST_LIMITS.downDays, d.downDays),
    extra: decimal(r.extra, COST_LIMITS.extra, d.extra),
    lifeCycles: decimal(r.lifeCycles, COST_LIMITS.lifeCycles, d.lifeCycles),
  }
}

export function sanitize(raw: Partial<Record<keyof Settings, unknown>> | null | undefined): Settings {
  return {
    dangerN: clamp(raw?.dangerN, LIMITS.dangerN, DEFAULT_SETTINGS.dangerN),
    cyclesPerDay: clamp(raw?.cyclesPerDay, LIMITS.cyclesPerDay, DEFAULT_SETTINGS.cyclesPerDay),
    prepDays: clamp(raw?.prepDays, LIMITS.prepDays, DEFAULT_SETTINGS.prepDays),
    slotsPerDay: clamp(raw?.slotsPerDay, LIMITS.slotsPerDay, DEFAULT_SETTINGS.slotsPerDay),
    notifyWorkflow: typeof raw?.notifyWorkflow === 'boolean' ? raw.notifyWorkflow : DEFAULT_SETTINGS.notifyWorkflow,
    notifyUrgent: typeof raw?.notifyUrgent === 'boolean' ? raw.notifyUrgent : DEFAULT_SETTINGS.notifyUrgent,
    costPreset: raw?.costPreset === 'wide' || raw?.costPreset === 'custom' ? raw.costPreset : 'narrow',
    cost: sanitizeCost(raw?.cost),
  }
}

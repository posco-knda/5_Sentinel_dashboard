import { fleetPoints } from '../data/detectionLog'
import type { FleetEngine } from './fleet'
import type { PlanItem } from './plan'
import type { CostBasis, Settings } from './settings'

/** 보수적으로 볼 때 비계획 추가 비용을 몇 %만 인정하는가 */
export const CONSERVATIVE = 0.6

/** 예측 오차의 크기(cycle) — 과거 검증에서 예측과 실제의 차이(RMSE). 고장 확률을 계산할 때 쓴다 */
const SIGMA = Math.sqrt(fleetPoints.reduce((s, p) => s + (p.actual - p.pred) ** 2, 0) / fleetPoints.length)

// 표준정규분포 누적확률 (Abramowitz-Stegun 근사)
function phi(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

/** 비계획(고장 후) 정비 1건의 총비용 */
export const unplannedCost = (b: CostBasis) => b.planned * b.ratio + b.downDays * b.lossPerDay + b.extra

/** 고장 난 뒤에 처리하면 계획 정비보다 더 드는 돈 */
export const extraIfUnplanned = (b: CostBasis) => unplannedCost(b) - b.planned

/** 예측 남은 수명이 pred cycle일 때 지금 교체하면 버리게 되는 잔여 수명의 값 */
export const wasteOf = (pred: number, b: CostBasis) => Math.min(1, pred / b.lifeCycles) * b.planned

/** 고장 날 때까지 운용했다면 대비, 계획대로 정비해서 얻는 순이득 */
export const gainOf = (pred: number, b: CostBasis, factor = 1) => extraIfUnplanned(b) * factor - wasteOf(pred, b)

/** days일 안에 고장 날 확률 (예측 남은 수명 pred cycle, 하루 cpd회 비행) */
export const pFail = (pred: number, days: number, cpd: number) => phi((days * cpd - pred) / SIGMA)

export interface DoneRow {
  unit: number
  at: number | null
  pred: number
  avoided: number
  waste: number
  gain: number
}

export interface Horizon {
  days: number
  n: number
  /** 방치하면 이 기간 안에 날 고장으로 추가로 드는 비용의 기댓값 */
  neglect: number
  /** 계획대로 처리할 때 일찍 교체해서 버리는 잔여 수명의 값 */
  waste: number
  /** 계획대로 처리하면 얻는 순이득 = neglect − waste (기준 / 보수) */
  gain: number
  gainLow: number
}

export interface EffectSummary {
  done: DoneRow[]
  doneGain: number
  doneGainLow: number
  pending: { n: number; gain: number }
  neglected: { n: number; exposure: number }
  horizons: Horizon[]
}

const HORIZONS = [30, 60, 90]

/** 처리 기록과 예측으로 '지금까지 얻은 효과'와 '앞으로의 전망'을 계산한다. 모두 추정값이다. */
export function summarize(fleet: FleetEngine[], items: Record<number, PlanItem>, s: Settings): EffectSummary {
  const b = s.cost
  const extra = extraIfUnplanned(b)
  const done: DoneRow[] = []
  let pendingN = 0
  let pendingGain = 0
  let neglectN = 0
  let neglectExp = 0
  for (const e of fleet) {
    const it = items[e.unit]
    const st = it?.status ?? 'new'
    if (st === 'done') {
      const at = [...(it?.history ?? [])].reverse().find((h) => h.action === 'complete')?.at ?? it?.updated ?? null
      done.push({ unit: e.unit, at, pred: e.pred, avoided: extra, waste: wasteOf(e.pred, b), gain: gainOf(e.pred, b) })
    } else if (st === 'scheduled' || st === 'submitted') {
      pendingN++
      pendingGain += gainOf(e.pred, b)
    } else if (e.urgency === 'now') {
      neglectN++
      neglectExp += pFail(e.pred, 30, s.cyclesPerDay) * extra
    }
  }
  done.sort((a, c) => (c.at ?? 0) - (a.at ?? 0))
  const open = fleet.filter((e) => (items[e.unit]?.status ?? 'new') !== 'done')
  const horizons = HORIZONS.map((days): Horizon => {
    const set = open.filter((e) => e.daysLeft <= days)
    const neglect = set.reduce((n, e) => n + pFail(e.pred, days, s.cyclesPerDay) * extra, 0)
    const waste = set.reduce((n, e) => n + wasteOf(e.pred, b), 0)
    return { days, n: set.length, neglect, waste, gain: neglect - waste, gainLow: neglect * CONSERVATIVE - waste }
  })
  return {
    done,
    doneGain: done.reduce((n, r) => n + r.gain, 0),
    doneGainLow: done.reduce((n, r) => n + gainOf(r.pred, b, CONSERVATIVE), 0),
    pending: { n: pendingN, gain: pendingGain },
    neglected: { n: neglectN, exposure: neglectExp },
    horizons,
  }
}

/** 억원 단위 금액을 읽기 쉬운 문자열로 */
export const eok = (v: number) => `${Math.round(v * 10) / 10 >= 1000 ? Math.round(v).toLocaleString() : (Math.round(v * 10) / 10).toLocaleString()}억원`

import { fleetPoints } from '../data/detectionLog.ts'
import type { Curve } from './curves.ts'
import type { CostBasis } from './settings.ts'

/** 비계획(고장 후) 정비 1건의 총비용 — cost.ts의 unplannedCost와 같은 식 */
const unplannedCost = (b: CostBasis) => b.planned * b.ratio + b.downDays * b.lossPerDay + b.extra

/** 정비 정책 3가지 — 같은 엔진 묶음을 끝까지(고장 시점까지) 운용했다고 보고 비교한다 */
export type PolicyId = 'reactive' | 'periodic' | 'predictive'

export interface Life {
  unit: number
  /** 마지막 관측 사이클 */
  last: number
  /** 마지막 관측 때 예측한 남은 수명 */
  pred: number
  /** 고장 나는 사이클 = 마지막 관측 사이클 + 실제 남은 수명 */
  fail: number
  /** 사이클별 예측 남은 수명 (1사이클부터) */
  curve: number[]
}

export interface Outcome {
  /** 정비 시점(사이클). 고장 난 엔진이면 고장 시점 */
  at: number
  failed: boolean
  /** 계획 정비로 버린 잔여 수명(cycle). 고장 난 엔진은 0 */
  wasted: number
  cost: number
}

export interface Summary {
  n: number
  failures: number
  /** 계획 정비된 엔진이 평균 몇 cycle을 남기고 교체했는가 */
  avgWasted: number
  cost: number
  /** 엔진 1대당 비용 */
  perEngine: number
}

/** 엔진별 수명 자료: 예측 곡선과 실제 남은 수명(검증용 정답)을 엮는다 */
export function buildLives(curves: Record<number, Curve>): Life[] {
  const out: Life[] = []
  for (const p of fleetPoints) {
    const c = curves[p.unit]
    if (!c || !c.p.length) continue
    const last = c.c[c.c.length - 1]
    out.push({ unit: p.unit, last, pred: p.pred, fail: last + p.actual, curve: c.p })
  }
  return out
}

function settle(life: Life, serviceAt: number, b: CostBasis): Outcome {
  if (serviceAt >= life.fail) return { at: life.fail, failed: true, wasted: 0, cost: unplannedCost(b) }
  const wasted = life.fail - serviceAt
  return { at: serviceAt, failed: false, wasted, cost: b.planned + Math.min(1, wasted / b.lifeCycles) * b.planned }
}

/** 사후 정비: 고장 날 때까지 쓰고 고장 나면 처리한다 */
export const reactive = (life: Life, b: CostBasis): Outcome => settle(life, Infinity, b)

/** 정기 정비: 새 엔진 기준 일정 사이클(interval)에 도달하면 정비한다 (이미 넘겼으면 지금 바로) */
export const periodic = (life: Life, interval: number, b: CostBasis): Outcome => settle(life, Math.max(interval, 1), b)

/**
 * 예측 정비: 예측 남은 수명이 (정비 준비 기간 + 안전 여유) 아래로 내려가는 첫 사이클에 정비를 요청하고,
 * 준비 기간(prep cycle)이 지난 뒤 정비한다. 관측이 끝난 뒤의 시점은 예측이 1사이클에 1씩 줄어든다고 보고 이어 간다.
 */
export function predictive(life: Life, prep: number, safety: number, b: CostBasis): Outcome {
  const trigger = prep + safety
  let req = -1
  for (let i = 0; i < life.curve.length; i++) {
    if (life.curve[i] <= trigger) {
      req = i + 1
      break
    }
  }
  if (req < 0) req = life.last + Math.max(0, life.pred - trigger)
  return settle(life, req + prep, b)
}

export function summarize(outcomes: Outcome[]): Summary {
  const n = outcomes.length
  const planned = outcomes.filter((o) => !o.failed)
  const cost = outcomes.reduce((s, o) => s + o.cost, 0)
  return {
    n,
    failures: outcomes.length - planned.length,
    avgWasted: planned.length ? planned.reduce((s, o) => s + o.wasted, 0) / planned.length : 0,
    cost,
    perEngine: n ? cost / n : 0,
  }
}

export const runReactive = (lives: Life[], b: CostBasis) => summarize(lives.map((l) => reactive(l, b)))
export const runPeriodic = (lives: Life[], interval: number, b: CostBasis) => summarize(lives.map((l) => periodic(l, interval, b)))
export const runPredictive = (lives: Life[], prep: number, safety: number, b: CostBasis) => summarize(lives.map((l) => predictive(l, prep, safety, b)))

/** 비용이 가장 낮은 값을 찾는다 (정기 정비는 주기, 예측 정비는 안전 여유) */
export function sweep(values: number[], run: (v: number) => Summary): { v: number; s: Summary }[] {
  return values.map((v) => ({ v, s: run(v) }))
}
export const best = (rows: { v: number; s: Summary }[]) => rows.reduce((a, r) => (r.s.cost < a.s.cost ? r : a))

import { alertRuns, type FleetEngine } from './fleet'
import type { Curve } from './curves'

export interface AlertEvent {
  unit: number
  kind: 'red' | 'warn'
  /** 경보가 켜진 사이클 */
  cycle: number
  /** 마지막 관측으로부터 몇 cycle 전인가 */
  ago: number
  /** 켜질 당시의 예측 남은 수명 */
  predThen: number
  predNow: number
  transient: number
}

/** 예측 곡선에서 현재 위험·주의 구간에 머무는 알림을 최근 순으로 뽑는다 */
export function buildAlertEvents(fleet: FleetEngine[], curves: Record<number, Curve>, dangerN: number): AlertEvent[] {
  const out: AlertEvent[] = []
  for (const e of fleet) {
    const curve = curves[e.unit]
    if (!curve) continue
    const r = alertRuns(curve, dangerN)
    const at = (since: number) => curve.p[curve.c.indexOf(since)]
    const base = { unit: e.unit, predNow: e.pred, transient: r.transientDanger + r.transientWarn }
    if (r.dangerSince != null) out.push({ ...base, kind: 'red', cycle: r.dangerSince, ago: r.lastCycle - r.dangerSince, predThen: at(r.dangerSince) })
    if (r.warnSince != null) out.push({ ...base, kind: 'warn', cycle: r.warnSince, ago: r.lastCycle - r.warnSince, predThen: at(r.warnSince) })
  }
  return out.sort((a, b) => a.ago - b.ago || (a.kind === 'red' ? -1 : 1))
}

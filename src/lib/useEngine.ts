import { useEffect, useMemo, useState } from 'react'
import { uncertainty, SURVIVAL_X } from '../data/uncertainty'
import type { PartFlow } from '../data/partFlow'
import { buildFacts, type DiagnosisFacts } from './diagnosis'
import { alertRuns, useFleet, type AlertRuns, type FleetEngine } from './fleet'
import { useCurves, type Curve } from './curves'
import { useSettings } from './settings'

let flowAll: Record<number, PartFlow> | null = null
let flowPending: Promise<Record<number, PartFlow>> | null = null

/** 센서별 이탈도(약 370KB)는 엔진 상세·리포트를 열 때 처음 한 번만 불러온다 */
export function loadFlow(): Promise<Record<number, PartFlow>> {
  if (flowAll) return Promise.resolve(flowAll)
  flowPending ??= import('../data/partFlow').then((m) => (flowAll = m.partFlow))
  return flowPending
}

export interface SurvivalPoint {
  cycle: number
  median: number
  lower: number
  upper: number
}

export interface EngineData {
  engine: FleetEngine | null
  curve: Curve | undefined
  runs: AlertRuns | null
  flow: PartFlow | null
  interval: [number, number] | null
  survival: SurvivalPoint[] | null
  facts: DiagnosisFacts | null
  /** 센서 이탈도·예측 곡선이 모두 준비됐는가 */
  ready: boolean
}

/** 엔진 하나의 화면(상세·리포트)이 쓰는 데이터를 한곳에 모은다 */
export function useEngineData(unit: number): EngineData {
  const { settings } = useSettings()
  const fleet = useFleet()
  const curves = useCurves()
  const [flowState, setFlowState] = useState<{ unit: number; flow: PartFlow | null } | null>(null)

  useEffect(() => {
    let alive = true
    loadFlow().then((all) => alive && setFlowState({ unit, flow: all[unit] ?? null }))
    return () => {
      alive = false
    }
  }, [unit])

  const engine = fleet.find((e) => e.unit === unit) ?? null
  const curve = curves?.[unit]
  const flow = flowState?.unit === unit ? flowState.flow : null
  const runs = useMemo(() => (curve ? alertRuns(curve, settings.dangerN) : null), [curve, settings.dangerN])
  const unc = uncertainty[unit]
  const interval = unc ? unc.iv : null
  const survival = useMemo(
    () => (unc ? unc.s.map(([median, lower, upper], i) => ({ cycle: SURVIVAL_X[i], median, lower, upper })) : null),
    [unc],
  )
  const facts = useMemo(() => (engine ? buildFacts({ engine, settings, flow, runs, interval }) : null), [engine, settings, flow, runs, interval])
  return { engine, curve, runs, flow, interval, survival, facts, ready: flowState?.unit === unit && curves != null }
}

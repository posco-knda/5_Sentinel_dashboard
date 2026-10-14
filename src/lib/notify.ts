import { uncertainty } from '../data/uncertainty'
import { callApi, notifyState, type SendState } from './api'
import { buildFacts, toPayload } from './diagnosis'
import { alertRuns, type FleetEngine } from './fleet'
import { loadCurves } from './curves'
import { loadFlow } from './useEngine'
import type { Settings } from './settings'

/** 엔진 하나의 진단 알림을 Slack으로 보낸다 (서버 함수 /api/notify, 없으면 미연결 안내) */
export async function sendEngineAlert(engine: FleetEngine, settings: Settings): Promise<SendState> {
  const [flows, curves] = await Promise.all([loadFlow(), loadCurves()])
  const curve = curves[engine.unit]
  const facts = buildFacts({
    engine,
    settings,
    flow: flows[engine.unit] ?? null,
    runs: curve ? alertRuns(curve, settings.dangerN) : null,
    interval: uncertainty[engine.unit]?.iv ?? null,
  })
  return notifyState(await callApi('/api/notify', { facts: toPayload(facts) }))
}

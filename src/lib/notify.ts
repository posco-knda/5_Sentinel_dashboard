import { uncertainty } from '../data/uncertainty'
import { callApi, notifyState, type ApiResult, type SendState } from './api'
import type { Role } from './auth'
import { pushNotice } from './notice'
import { buildFacts, toPayload } from './diagnosis'
import { alertRuns, deadlineText, type FleetEngine } from './fleet'
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

const WORKFLOW_LABEL = { submit: '결재 요청', approve: '승인', reject: '반려', complete: '정비 완료' } as const
export type WorkflowAction = keyof typeof WORKFLOW_LABEL

/** 결과를 화면 구석에 알린다. 서버 기능이 없는 환경(미연결)에서는 조용히 넘어간다. */
function report(r: ApiResult, okText: string): 'sent' | 'off' | 'failed' {
  if (r.ok) {
    pushNotice(okText)
    return 'sent'
  }
  if (r.status === 503 || r.status === 404) return 'off'
  pushNotice('Slack 알림을 보내지 못했습니다', 'error')
  return 'failed'
}

/** 결재 요청·승인·반려·정비 완료가 일어나면 자동으로 Slack에 알린다 */
export async function announceWorkflow(
  engine: FleetEngine,
  action: WorkflowAction,
  who: { name: string; role: Role },
  extra: { note?: string; date?: string },
): Promise<void> {
  const r = await callApi('/api/notify', {
    kind: 'workflow',
    event: {
      unit: engine.unit,
      action,
      by: who.name,
      role: who.role,
      note: extra.note,
      date: extra.date,
      pred: engine.pred,
      requestText: engine.requestIn <= 0 ? '기한 지남' : deadlineText(engine.requestIn),
      part: engine.topPart?.label,
    },
  })
  report(r, `Slack으로 ${WORKFLOW_LABEL[action]} 알림을 보냈습니다`)
}

/** 새로 즉시 조치가 된 엔진들을 한 건으로 묶어 Slack에 알린다 */
export async function announceUrgent(engines: FleetEngine[]): Promise<'sent' | 'off' | 'failed'> {
  const r = await callApi('/api/notify', {
    kind: 'digest',
    digest: {
      count: engines.length,
      engines: engines.slice(0, 8).map((e) => ({ name: e.name, predCycles: e.pred, requestText: e.requestIn <= 0 ? '기한 지남' : deadlineText(e.requestIn), part: e.topPart?.label ?? '' })),
    },
  })
  return report(r, `Slack으로 신규 즉시 조치 ${engines.length}대 알림을 보냈습니다`)
}

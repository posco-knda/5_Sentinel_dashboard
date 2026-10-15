import { MAX_WEEK, PART_LABEL, WEEK_LABEL, deadlineText, weekBucket, type FleetEngine } from './fleet'
import type { PlanEvent, PlanItem } from './plan'

const DAY = 86400000

export interface WeeklyEvent extends PlanEvent {
  unit: number
}

export interface WeeklyStats {
  /** 집계 구간 (밀리초) */
  since: number
  until: number
  fleet: { total: number; now: number; week: number; month: number; watch: number }
  /** 이 기간에 일어난 결재 처리 건수와 지금 결재를 기다리는 건수 */
  flow: { requested: number; approved: number; rejected: number; completed: number; pending: number }
  /** 앞으로 정비 요청 기한이 오는 주별 엔진 수 (기한 경과 포함) */
  demand: { label: string; n: number }[]
  /** 위험·주의 엔진의 점검 예상 모듈별 엔진 수 */
  modules: { id: string; name: string; n: number }[]
  /** 지금 가장 급한 엔진 */
  top: FleetEngine[]
  /** 이 기간의 결재 이력 (최근 순) */
  events: WeeklyEvent[]
}

/** 현재 정비 상태와 최근 7일 결재 이력으로 주간 리포트에 쓸 숫자를 모은다 */
export function buildWeekly(fleet: FleetEngine[], items: Record<number, PlanItem>, now = Date.now()): WeeklyStats {
  const since = now - 7 * DAY
  const active = fleet.filter((e) => items[e.unit]?.status !== 'done')

  const f = { total: fleet.length, now: 0, week: 0, month: 0, watch: 0 }
  for (const e of active) f[e.urgency]++

  const events: WeeklyEvent[] = []
  for (const [k, item] of Object.entries(items)) for (const ev of item.history) if (ev.at >= since && ev.at <= now) events.push({ ...ev, unit: Number(k) })
  events.sort((a, b) => b.at - a.at)
  const count = (a: PlanEvent['action']) => events.filter((e) => e.action === a).length

  const demand = WEEK_LABEL.slice(0, MAX_WEEK).map((label) => ({ label, n: 0 }))
  for (const e of active) {
    const w = weekBucket(e.requestIn)
    if (w < MAX_WEEK) demand[w].n++
  }

  const m = new Map<string, number>()
  for (const e of active) if (e.level !== 'ok' && e.topPart) m.set(e.topPart.id, (m.get(e.topPart.id) ?? 0) + 1)
  const modules = [...m].map(([id, n]) => ({ id, name: PART_LABEL[id], n })).sort((a, b) => b.n - a.n)

  return {
    since,
    until: now,
    fleet: f,
    flow: {
      requested: count('submit'),
      approved: count('approve'),
      rejected: count('reject'),
      completed: count('complete'),
      pending: Object.values(items).filter((i) => i.status === 'submitted').length,
    },
    demand,
    modules,
    top: active.filter((e) => e.urgency !== 'watch').slice(0, 10),
    events,
  }
}

/** 규칙 기반 요약 — 위 숫자를 문장으로 옮기기만 한다 */
export function weeklySummary(s: WeeklyStats): string[] {
  const out: string[] = []
  const { flow: w, fleet: f } = s
  out.push(`최근 7일 동안 결재 요청 ${w.requested}건, 승인 ${w.approved}건, 반려 ${w.rejected}건, 정비 완료 ${w.completed}건이 처리되었고 현재 ${w.pending}건이 결재를 기다리고 있습니다.`)
  out.push(`지금 즉시 조치가 필요한 엔진은 ${f.now}대, 7일 안에 정비 요청이 필요한 엔진은 ${f.week}대, 이번 달 안에 필요한 엔진은 ${f.month}대입니다(전체 ${f.total}대 중).`)
  const d = s.demand
  if (d.length > 1) out.push(`앞으로 정비 요청 기한이 오는 엔진은 1주 내 ${d[1].n}대, 2주 내 ${d[2]?.n ?? 0}대, 3주 내 ${d[3]?.n ?? 0}대입니다.`)
  if (s.modules.length) out.push(`위험·주의 엔진에서 센서가 가장 크게 변한 모듈(추정)은 ${s.modules.slice(0, 3).map((m) => `${m.name} ${m.n}대`).join(', ')} 순입니다. 부품·인력 준비에 참고하세요.`)
  const t = s.top[0]
  if (t) out.push(`가장 급한 엔진은 ${t.name}로 예측 남은 수명 ${t.pred} cycle, 정비 요청 기한은 ${t.requestIn <= 0 ? '이미 지났습니다' : deadlineText(t.requestIn)}.`)
  return out
}

/** 서버(AI 요약)로 보낼 가벼운 형태 — 숫자와 짧은 문자열만 담는다 */
export function weeklyPayload(s: WeeklyStats) {
  const md = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
  return {
    period: `${md(s.since)} ~ ${md(s.until)}`,
    fleet: s.fleet,
    flow: s.flow,
    demand: s.demand.map((d) => ({ label: d.label, n: d.n })),
    modules: s.modules.map((m) => ({ name: m.name, n: m.n })),
    top: s.top.slice(0, 5).map((e) => ({ name: e.name, pred: e.pred, requestText: e.requestIn <= 0 ? '기한 지남' : deadlineText(e.requestIn), part: e.topPart?.label ?? '' })),
    rejectReasons: s.events.filter((e) => e.action === 'reject' && e.note).slice(0, 5).map((e) => e.note as string),
  }
}

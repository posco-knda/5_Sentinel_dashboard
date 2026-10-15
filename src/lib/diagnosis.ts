import { partMeta } from '../data/partFlowMeta'
import type { PartFlow } from '../data/partFlow'
import { LEVEL, NOTABLE_Z, PART_LABEL, URGENCY, daysText, deadlineText, type AlertRuns, type FleetEngine } from './fleet'
import type { Settings } from './settings'

export { NOTABLE_Z }

const GAS_PATH = ['fan', 'lpc', 'hpc', 'core', 'hpt', 'lpt']
const SENSORS = Object.fromEntries(partMeta.parts.flatMap((p) => p.sensors.map((s) => [s.id, s]))) as Record<
  string,
  { id: string; name: string; unit: string }
>

export interface DiagnosisFacts {
  unit: number
  name: string
  level: FleetEngine['level']
  levelLabel: string
  urgencyLabel: string
  predRul: number
  daysLeft: number
  requestIn: number
  interval: [number, number] | null
  cycles: number | null
  cyclesPerDay: number
  prepDays: number
  /** 위험·주의 구간에 계속 머문 지 몇 cycle째인가 (현장에서 알 수 있는 값) */
  dangerAgo: number | null
  warnAgo: number | null
  transientDanger: number
  transientWarn: number
  topPart: { id: string; label: string; score: number } | null
  topSensors: { id: string; name: string; unit: string; z: number }[]
  parts: { id: string; label: string; score: number }[]
}

/** 엔진 하나의 진단 사실(숫자)을 한곳에 모은다. 리포트·요약·알림이 모두 이 값만 쓴다. */
export function buildFacts(args: {
  engine: FleetEngine
  settings: Settings
  flow: PartFlow | null
  runs: AlertRuns | null
  interval: [number, number] | null
}): DiagnosisFacts {
  const { engine: e, settings: s, flow, runs, interval } = args
  const parts = flow ? GAS_PATH.map((pid) => ({ id: pid, label: PART_LABEL[pid], score: flow.part[pid] })) : []
  const best = parts.length ? parts.reduce((a, b) => (b.score > a.score ? b : a)) : null
  const lastCycle = runs?.lastCycle ?? (flow ? flow.trend[0]?.c.at(-1) ?? null : null)
  const ago = (since: number | null | undefined) => (since != null && runs ? runs.lastCycle - since : null)
  return {
    unit: e.unit,
    name: e.name,
    level: e.level,
    levelLabel: LEVEL[e.level].label,
    urgencyLabel: URGENCY[e.urgency].label,
    predRul: e.pred,
    daysLeft: e.daysLeft,
    requestIn: e.requestIn,
    interval,
    cycles: lastCycle,
    cyclesPerDay: s.cyclesPerDay,
    prepDays: s.prepDays,
    dangerAgo: ago(runs?.dangerSince),
    warnAgo: ago(runs?.warnSince),
    transientDanger: runs?.transientDanger ?? 0,
    transientWarn: runs?.transientWarn ?? 0,
    topPart: best && best.score >= NOTABLE_Z ? best : e.topPart ?? null,
    topSensors: flow ? flow.top.map((id) => ({ ...SENSORS[id], z: flow.z[id] })) : [],
    parts,
  }
}

export function actionText(f: DiagnosisFacts): string {
  const clause = f.topPart ? ` ${f.topPart.label} 계통${f.topSensors[0] ? `(${f.topSensors[0].name.split(' · ')[0]})` : ''}부터 점검할 것을 권고합니다.` : ''
  if (f.requestIn <= 0)
    return `정비 요청 기한이 지났습니다. 다음 정비 슬롯에 바로 배정하고 부품·인력을 준비하세요(준비 ${f.prepDays}일 기준).${clause || ' 특정 모듈에 치우친 변화는 뚜렷하지 않아 전체 점검을 권고합니다.'}`
  if (f.requestIn <= 7) return `${Math.ceil(f.requestIn)}일 안에 정비를 요청하세요.${clause}`
  if (f.requestIn <= 30) return `이번 달 정비 계획에 포함하고 추이를 확인하세요.${clause}`
  return '당장 정비 요청은 필요 없습니다. 정기 모니터링을 유지하세요.'
}

/** 리포트 맨 위에 두는 결론 한 줄 */
export function headline(f: DiagnosisFacts): string {
  const part = f.topPart ? ` · ${f.topPart.label} 점검 권고(추정)` : ''
  if (f.requestIn <= 0) return `${f.name} — 정비 요청 기한이 지났습니다${part}`
  if (f.requestIn <= 30) return `${f.name} — ${deadlineText(f.requestIn)}(${Math.ceil(f.requestIn)}일 안)까지 정비 요청이 필요합니다${part}`
  return `${f.name} — 당장 정비 요청은 필요하지 않습니다. 정기 모니터링을 유지하세요`
}

/** 규칙 기반 요약 — 위 사실을 문장으로 옮기기만 한다(새 숫자를 만들지 않음). */
export function ruleSummary(f: DiagnosisFacts): string[] {
  const out: string[] = []
  out.push(
    `${f.name}: 예측 남은 수명 약 ${f.predRul} cycle(하루 ${f.cyclesPerDay}회 비행 기준 ${daysText(f.daysLeft)}${f.interval ? `, 90% 구간 ${f.interval[0]}~${f.interval[1]} cycle` : ''})로 '${f.levelLabel}' 등급입니다.`,
  )
  const dayAgo = (c: number) => `${c} cycle(${daysText(c / f.cyclesPerDay)}) 전`
  if (f.dangerAgo != null) out.push(`위험 구간에 ${dayAgo(f.dangerAgo)}부터 머물러 있습니다.${f.warnAgo != null ? ` 주의는 ${dayAgo(f.warnAgo)}부터였습니다.` : ''}`)
  else if (f.warnAgo != null) out.push(`주의 구간에 ${dayAgo(f.warnAgo)}부터 머물러 있습니다.`)
  else out.push('경보 구간에 들어간 적이 없습니다.')
  if (f.transientDanger + f.transientWarn > 0) out.push(`중간에 경보가 켜졌다가 꺼진 적이 있습니다(위험 ${f.transientDanger}회·주의 ${f.transientWarn}회).`)

  const s = f.topSensors[0]
  if (s) {
    out.push(
      `초기(처음 ${partMeta.baselineCycles}사이클) 대비 가장 크게 변한 센서는 ${s.name}(평소 흔들림의 ${Math.abs(s.z).toFixed(1)}배 ${s.z >= 0 ? '증가' : '감소'})입니다.` +
        (f.topPart ? ` 변화는 ${f.topPart.label} 계통에 가장 집중되어 있으며, 원인을 판정한 것이 아니라 점검 모듈을 추정한 것입니다.` : ' 특정 모듈에 치우친 변화는 뚜렷하지 않습니다.'),
    )
  }
  out.push(`정비 요청 기한: ${f.requestIn <= 0 ? '이미 지났습니다' : `${deadlineText(f.requestIn)} (${Math.ceil(f.requestIn)}일 뒤)`} — 부품·인력 준비 ${f.prepDays}일 기준.`)
  out.push(`권고: ${actionText(f)}`)
  return out
}

/** 서버(AI 요약·알림)로 보낼 수 있는 가벼운 형태 — 숫자와 짧은 문자열만 담는다 */
export function toPayload(f: DiagnosisFacts) {
  return {
    unit: f.unit,
    name: f.name,
    level: f.level,
    levelLabel: f.levelLabel,
    urgencyLabel: f.urgencyLabel,
    predRul: f.predRul,
    daysText: daysText(f.daysLeft),
    interval: f.interval,
    cycles: f.cycles,
    dangerAgo: f.dangerAgo,
    warnAgo: f.warnAgo,
    transientDanger: f.transientDanger,
    transientWarn: f.transientWarn,
    requestText: f.requestIn <= 0 ? '기한 지남' : deadlineText(f.requestIn),
    topPart: f.topPart?.label ?? null,
    topSensor: f.topSensors[0] ? { name: f.topSensors[0].name, z: f.topSensors[0].z } : null,
    action: actionText(f),
  }
}
export type DiagnosisPayload = ReturnType<typeof toPayload>

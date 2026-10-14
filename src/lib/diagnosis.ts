import { engineDetails, equipmentRanking, riskThresholds } from '../data/mock'
import { fleetPoints, logRows } from '../data/detectionLog'
import { partMeta } from '../data/partFlowMeta'
import type { PartFlow } from '../data/partFlow'

/** 평소 흔들림의 이 배수 미만이면 "뚜렷한 변화 없음"으로 본다 (고장 진단 화면과 같은 기준) */
export const NOTABLE_Z = 2

const GAS_PATH = ['fan', 'lpc', 'hpc', 'core', 'hpt', 'lpt']
const PART_LABEL = Object.fromEntries(partMeta.parts.map((p) => [p.id, p.label])) as Record<string, string>
const SENSORS = Object.fromEntries(partMeta.parts.flatMap((p) => p.sensors.map((s) => [s.id, s]))) as Record<
  string,
  { id: string; name: string; unit: string }
>

export const LEVEL_LABEL = { red: '위험', warn: '주의', ok: '정상' } as const

export interface DiagnosisFacts {
  unit: number
  name: string
  level: 'red' | 'warn' | 'ok'
  levelLabel: '위험' | '주의' | '정상'
  predRul: number
  interval: { median: number; lower: number; upper: number } | null
  cycles: number | null
  health: number | null
  warnSince: number | null
  dangerSince: number | null
  leadWarn: number | null
  leadDanger: number | null
  transientDanger: number
  transientWarn: number
  topPart: { id: string; label: string; score: number } | null
  topSensors: { id: string; name: string; unit: string; z: number }[]
  parts: { id: string; label: string; score: number }[]
}

/** 엔진 하나의 진단 사실(숫자)을 한곳에 모은다. 리포트·요약·알림이 모두 이 값만 쓴다. */
export function buildFacts(unit: number, flow: PartFlow | null): DiagnosisFacts | null {
  const point = fleetPoints.find((p) => p.unit === unit)
  if (!point) return null
  const id = `engine-${unit}`
  const detail = engineDetails[id]
  const log = logRows.find((r) => r.unit === unit)
  const parts = flow ? GAS_PATH.map((pid) => ({ id: pid, label: PART_LABEL[pid], score: flow.part[pid] })) : []
  const best = parts.length ? parts.reduce((a, b) => (b.score > a.score ? b : a)) : null
  return {
    unit,
    name: equipmentRanking.find((e) => e.id === id)?.name ?? `Engine #${unit}`,
    level: point.level,
    levelLabel: LEVEL_LABEL[point.level],
    predRul: point.pred,
    interval: detail?.predictedRulCycle ?? null,
    cycles: detail?.equipmentInfo.operatingCycles ?? log?.lastCycle ?? null,
    health: detail?.health ?? null,
    warnSince: log?.warnSince ?? null,
    dangerSince: log?.dangerSince ?? null,
    leadWarn: log && log.warnSince != null ? log.trueEnd + (log.lastCycle - log.warnSince) : null,
    leadDanger: log?.leadDanger ?? null,
    transientDanger: log?.transientDanger ?? 0,
    transientWarn: log?.transientWarn ?? 0,
    topPart: best && best.score >= NOTABLE_Z ? best : null,
    topSensors: flow ? flow.top.map((s) => ({ ...SENSORS[s], z: flow.z[s] })) : [],
    parts,
  }
}

export function actionText(f: DiagnosisFacts): string {
  const clause = f.topPart ? `${f.topPart.label} 계통(${f.topSensors[0]?.name.split(' · ')[0]})` : null
  if (f.level === 'red')
    return `다음 정비 슬롯에 배정하고 부품·인력을 준비합니다(준비 최소 7일, 논문 운영 조건 가정).${clause ? ` ${clause}부터 점검할 것을 권고합니다.` : ' 특정 부품에 치우친 변화는 뚜렷하지 않아 전체 점검을 권고합니다.'}`
  if (f.level === 'warn') return `정비 계획을 준비하고, ${clause ?? '센서'} 추이를 주기적으로 확인합니다.`
  return '정기 모니터링을 유지합니다. 센서 변화는 정상 범위의 흔들림입니다.'
}

/** 규칙 기반 요약 — 위 사실을 문장으로 옮기기만 한다(새 숫자를 만들지 않음). */
export function ruleSummary(f: DiagnosisFacts): string[] {
  const out: string[] = []
  const iv = f.interval
  out.push(
    iv
      ? `${f.name}: 마지막 관측${f.cycles != null ? `(cycle #${f.cycles})` : ''} 기준 예측 남은 수명 ${iv.median} cycle(90% 구간 ${iv.lower}~${iv.upper})로 '${f.levelLabel}' 등급입니다.`
      : `${f.name}: 마지막 관측 기준 예측 남은 수명 ${f.predRul} cycle로 '${f.levelLabel}' 등급입니다.`,
  )

  if (f.dangerSince != null && f.warnSince != null)
    out.push(
      `모델은 cycle #${f.warnSince}에 주의(고장 ${f.leadWarn}사이클 전), cycle #${f.dangerSince}에 위험(고장 ${f.leadDanger}사이클 전) 구간 진입을 알렸습니다. 고장까지 남은 사이클은 평가용 정답으로 계산한 값입니다.`,
    )
  else if (f.warnSince != null)
    out.push(`모델은 cycle #${f.warnSince}에 주의(고장 ${f.leadWarn}사이클 전) 구간 진입을 알렸고, 위험 구간(≤${riskThresholds.dangerRul})에는 아직 들어가지 않았습니다.`)
  else out.push(`예측 남은 수명이 경보 구간(<${riskThresholds.warningRul})에 들어간 적이 없습니다.`)
  if (f.transientDanger + f.transientWarn > 0)
    out.push(`중간에 경보가 켜졌다가 꺼진 적이 있습니다(위험 ${f.transientDanger}회·주의 ${f.transientWarn}회).`)

  const s = f.topSensors[0]
  if (s) {
    out.push(
      `초기(처음 ${partMeta.baselineCycles}사이클) 대비 가장 크게 변한 센서는 ${s.name}(평소 흔들림의 ${Math.abs(s.z).toFixed(1)}배 ${s.z >= 0 ? '증가' : '감소'})입니다.` +
        (f.topPart ? ` 변화는 ${f.topPart.label} 계통에 가장 집중되어 있으며, 고장 원인을 판정한 것이 아니라 부품을 추정한 것입니다.` : ' 특정 부품에 치우친 변화는 뚜렷하지 않습니다.'),
    )
  }
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
    predRul: f.predRul,
    interval: f.interval,
    cycles: f.cycles,
    warnSince: f.warnSince,
    dangerSince: f.dangerSince,
    leadWarn: f.leadWarn,
    leadDanger: f.leadDanger,
    transientDanger: f.transientDanger,
    transientWarn: f.transientWarn,
    topPart: f.topPart?.label ?? null,
    topSensor: f.topSensors[0] ? { name: f.topSensors[0].name, z: f.topSensors[0].z } : null,
    action: actionText(f),
  }
}
export type DiagnosisPayload = ReturnType<typeof toPayload>

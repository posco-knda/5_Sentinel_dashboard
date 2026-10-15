import { LEVEL, URGENCY, daysText, deadlineText, limitDate, requestDate, type FleetEngine } from './fleet'
import type { DiagnosisFacts } from './diagnosis'
import { ROLE_LABEL } from './auth'
import { ACTION_LABEL, STATUS_LABEL, type PlanEvent, type PlanItem } from './plan'
import type { WeeklyStats } from './weekly'
import type { XSheet } from './excel'

const stamp = (t: number) => new Date(t).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
const day = (t: number) => new Date(t).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
const round1 = (n: number) => Math.round(n * 10) / 10

function dateKind(item: PlanItem | undefined) {
  if (!item?.date) return ''
  return item.status === 'submitted' ? '희망일' : item.status === 'scheduled' ? '확정일' : item.status === 'done' ? '정비일' : ''
}

/** 엔진 목록 — 화면에서 거른 엔진 전부 (한 페이지가 아니라 전체) */
export function engineListSheet(engines: FleetEngine[], items: Record<number, PlanItem>): XSheet {
  return {
    name: '엔진 목록',
    header: ['엔진 번호', '등급', '긴급도', '예측 남은 수명(cycle)', '남은 가동일', '정비 요청까지(일, 음수=기한 경과)', '정비 요청 기한', '가동 한계 예상일', '점검 예상 모듈', '모듈 변화(×N)', '처리 상태', '정비 일정', '일정 구분', '최근 처리자', '최근 처리 시각'],
    rows: engines.map((e) => {
      const item = items[e.unit]
      const last = item?.history.at(-1)
      return [
        e.unit,
        LEVEL[e.level].label,
        URGENCY[e.urgency].label,
        e.pred,
        round1(e.daysLeft),
        Math.round(e.requestIn),
        e.requestIn <= 0 ? '기한 지남' : requestDate(e.requestIn),
        limitDate(e.daysLeft),
        e.topPart ? e.topPart.label : '뚜렷한 변화 없음',
        e.topPart ? round1(e.topPart.score) : null,
        STATUS_LABEL[item?.status ?? 'new'],
        item?.date ?? '',
        dateKind(item),
        last ? `${last.by}(${ROLE_LABEL[last.role]})` : '',
        last ? stamp(last.at) : '',
      ]
    }),
  }
}

const historyRows = (events: (PlanEvent & { unit?: number })[], withUnit: boolean) =>
  events.map((ev) => [stamp(ev.at), ...(withUnit ? [ev.unit != null ? `#${ev.unit}` : ''] : []), ACTION_LABEL[ev.action], `${ev.by}(${ROLE_LABEL[ev.role]})`, ev.date ?? '', ev.note ?? ''])

const kv = (name: string, rows: [string, string | number | null][]): XSheet => ({ name, header: ['항목', '내용'], rows, widths: [26, 90] })

/** 주간 정비 리포트 — 화면의 요약·표를 시트별로 나눠 담는다 (결재 이력은 15건 제한 없이 전부) */
export function weeklySheets(stats: WeeklyStats, summary: string[], ai: string | null, basis: { cyclesPerDay: number; prepDays: number }): XSheet[] {
  const f = stats.fleet
  const w = stats.flow
  const rows: [string, string | number | null][] = [
    ['집계 기간', `${day(stats.since)} ~ ${day(stats.until)}`],
    ['기준', `하루 ${basis.cyclesPerDay}회 비행, 정비 준비 ${basis.prepDays}일`],
    ['전체 엔진(대)', f.total],
    ['즉시 조치(대)', f.now],
    ['7일 안에 정비 요청(대)', f.week],
    ['이번 달 안에 정비 요청(대)', f.month],
    ['당분간 정상(대)', f.watch],
    ['결재 요청(건)', w.requested],
    ['승인(건)', w.approved],
    ['반려(건)', w.rejected],
    ['정비 완료(건)', w.completed],
    ['현재 결재 대기(건)', w.pending],
    ...summary.map((s, i): [string, string] => [i === 0 ? '요약' : '', s]),
  ]
  if (ai) rows.push(['AI 요약', ai])
  return [
    kv('요약', rows),
    { name: '정비 요청 도래', header: ['시기', '엔진(대)'], rows: stats.demand.map((d) => [d.label, d.n]) },
    { name: '점검 예상 모듈', header: ['모듈(추정)', '엔진(대)'], rows: stats.modules.map((m) => [m.name, m.n]) },
    {
      name: '우선 정비 대상',
      header: ['엔진 번호', '예측 남은 수명(cycle)', '남은 가동일', '정비 요청 기한', '점검 예상 모듈'],
      rows: stats.top.map((e) => [e.unit, e.pred, round1(e.daysLeft), deadlineText(e.requestIn), e.topPart ? e.topPart.label : '뚜렷한 변화 없음']),
    },
    { name: '결재 이력', header: ['시각', '엔진', '처리', '담당', '정비일', '내용'], rows: historyRows(stats.events, true), widths: [18, 10, 12, 22, 14, 60] },
  ]
}

/** 엔진 진단 리포트 — 핵심 수치, 모듈별 변화, 센서, 결재 이력 */
export function engineReportSheets(facts: DiagnosisFacts, engine: FleetEngine, item: PlanItem, summary: string[], ai: string | null): XSheet[] {
  const rows: [string, string | number | null][] = [
    ['엔진', engine.name],
    ['알림 등급', facts.levelLabel],
    ['긴급도', URGENCY[engine.urgency].label],
    ['예측 남은 수명(cycle)', engine.pred],
    ['남은 가동일', daysText(engine.daysLeft)],
    ['90% 구간(cycle)', facts.interval ? `${facts.interval[0]} ~ ${facts.interval[1]}` : null],
    ['정비 요청 기한', engine.requestIn <= 0 ? '기한 지남' : `${deadlineText(engine.requestIn)} · ${requestDate(engine.requestIn)}`],
    ['가동 한계 예상일', limitDate(engine.daysLeft)],
    ['위험 구간 체류', facts.dangerAgo == null ? null : `${facts.dangerAgo} cycle`],
    ['주의 구간 체류', facts.warnAgo == null ? null : `${facts.warnAgo} cycle`],
    ['점검 예상 모듈(추정)', facts.topPart ? facts.topPart.label : '뚜렷한 변화 없음'],
    ['처리 상태', STATUS_LABEL[item.status]],
    ...summary.map((s, i): [string, string] => [i === 0 ? '요약' : '', s]),
  ]
  if (ai) rows.push(['AI 요약', ai])
  return [
    kv('요약', rows),
    { name: '모듈별 변화', header: ['모듈(추정)', '변화(×N)'], rows: [...facts.parts].sort((a, b) => b.score - a.score).map((p) => [p.label, round1(p.score)]) },
    { name: '센서 변화', header: ['센서', '방향', '변화(×N)'], rows: facts.topSensors.map((s) => [s.name, s.z >= 0 ? '상승' : '하락', round1(Math.abs(s.z))]) },
    { name: '결재 이력', header: ['시각', '처리', '담당', '정비일', '내용'], rows: historyRows(item.history, false), widths: [18, 12, 22, 14, 60] },
  ]
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../../components/Panel'
import { PageHead } from '../../components/PageHead'
import { TodoPanel } from '../../components/TodoPanel'
import { MaintenanceCalendar } from '../../components/ops/MaintenanceCalendar'
import { DemandChart } from '../../components/ops/OpsCharts'
import { ModuleChart, ProgressChart, UrgentBars } from '../../components/ops/FleetCharts'
import { eok, summarize } from '../../lib/cost'
import { useFleet } from '../../lib/fleet'
import { useSettings } from '../../lib/settings'
import { lastSubmit, todayStr, usePlan } from '../../lib/plan'
import { addDays, nextMonday } from '../../lib/schedule'
import { StatLink } from './shared'

const HOUR = 3600000
const ago = (ms: number) => (ms < 24 * HOUR ? `${Math.max(1, Math.round(ms / HOUR))}시간` : `${Math.round(ms / (24 * HOUR))}일`)
const md = (d: string) => d.slice(5).replace('-', '/')

/** 운영 책임자의 첫 화면 — 결정할 결재와 전체 흐름(병목·수용 능력·효과) */
export function ManagerHome() {
  const fleet = useFleet()
  const { settings } = useSettings()
  const plan = usePlan()
  const today = todayStr()
  // 정비는 다음 주부터 잡히므로, 수용 능력과는 '다음 주'를 비교한다
  const monday = nextMonday(today)
  const friday = addDays(monday, 4)

  const active = useMemo(() => fleet.filter((e) => plan.get(e.unit).status !== 'done'), [fleet, plan])
  const pending = useMemo(() => fleet.filter((e) => plan.get(e.unit).status === 'submitted'), [fleet, plan])
  // 기한이 지났는데 아직 결재 단계에도 못 올라온 엔진 — 담당자 단계의 병목
  const stuck = useMemo(() => active.filter((e) => e.urgency === 'now' && ['new', 'review', 'rejected'].includes(plan.get(e.unit).status)), [active, plan])
  const thisWeek = fleet.filter((e) => {
    const it = plan.get(e.unit)
    return it.status === 'scheduled' && !!it.date && it.date >= monday && it.date <= friday
  }).length
  const capacity = settings.slotsPerDay * 5
  const effect = useMemo(() => summarize(fleet, plan.items, settings), [fleet, plan.items, settings])

  const [now] = useState(() => Date.now())
  const oldest = pending.reduce((m, e) => Math.min(m, lastSubmit(plan.get(e.unit))?.at ?? now), now)

  // 결재 지표: 승인·반려 건수와 요청부터 결정까지 걸린 시간
  const flow = useMemo(() => {
    let approve = 0
    let reject = 0
    const spans: number[] = []
    for (const it of Object.values(plan.items)) {
      let sub: number | null = null
      for (const h of it.history) {
        if (h.action === 'submit') sub = h.at
        else if (h.action === 'approve' || h.action === 'reject') {
          if (h.action === 'approve') approve++
          else reject++
          if (sub != null) spans.push(h.at - sub)
          sub = null
        }
      }
    }
    const avg = spans.length ? spans.reduce((a, b) => a + b, 0) / spans.length : null
    return { approve, reject, avg }
  }, [plan.items])

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="결재와 운영 현황" sub={<>{md(today)} 기준 · 승인할 요청 {pending.length}건 · 엔진 {fleet.length}대</>} action={
        <Link to="/approvals" className="shrink-0 text-[13px] font-medium no-underline" style={{ color: 'var(--accent)' }}>결재함 →</Link>
      } />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatLink to="/approvals" label="결재 대기" value={pending.length} unit="건" color="var(--accent)" sub={pending.length ? `가장 오래된 요청 ${ago(now - oldest)} 전` : '대기 중인 요청 없음'} />
        <StatLink to="/plan" label="기한 지났는데 결재 전" value={stuck.length} unit="대" color="var(--status-critical)" sub="담당자 단계에서 멈춘 엔진" />
        <StatLink to="/plan" label="다음 주 정비" value={`${thisWeek} / ${capacity}`} unit="대" color="var(--status-good)" sub={`${md(monday)} 주 · 예정 / 수용 능력`} />
        <StatLink to="/cost" label="정비 효과 (추정)" value={eok(effect.doneGain)} sub={`완료 ${effect.done.length}건 · 방치 위험 ${eok(effect.neglected.exposure)}`} color="var(--status-good)" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panel dense title="정비 일정" sub="날짜를 누르면 그날의 엔진을 볼 수 있습니다 · 승인된 정비와 결재 대기, 만석인 날을 한눈에 봅니다">
            <MaintenanceCalendar large engines={fleet} plan={plan.items} prepDays={settings.prepDays} slotsPerDay={settings.slotsPerDay} />
          </Panel>
          <TodoPanel />
          <Panel dense title="점검 예상 모듈" sub="부품·인력 준비용 · 위험·주의 엔진 기준 추정">
            <ModuleChart engines={active} height={210} />
          </Panel>
        </div>
        <div className="flex flex-col gap-4">
          <Panel dense title="결재 지표">
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: '승인', v: `${flow.approve}건`, sub: flow.approve + flow.reject ? `${Math.round((100 * flow.approve) / (flow.approve + flow.reject))}%` : '' },
                { k: '반려', v: `${flow.reject}건`, sub: flow.approve + flow.reject ? `${Math.round((100 * flow.reject) / (flow.approve + flow.reject))}%` : '' },
                { k: '평균 결재 소요', v: flow.avg == null ? '—' : ago(flow.avg), sub: '요청 → 결정' },
              ].map((m) => (
                <div key={m.k} className="flex flex-col gap-0.5">
                  <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{m.k}</span>
                  <span className="mono text-[20px] font-semibold leading-tight">{m.v}</span>
                  <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.sub}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel dense title="주별 정비 요청" sub={`한 주 수용 능력 ${capacity}대 (하루 ${settings.slotsPerDay}대 × 5일)`}>
            <DemandChart engines={fleet} plan={plan.items} height={200} />
          </Panel>
          <Panel dense title="처리 현황" sub="긴급도별 처리 단계 · 단위: 대">
            <ProgressChart engines={fleet} plan={plan.items} height="fill" />
          </Panel>
          <Panel dense title="멈춰 있는 엔진" sub="기한이 지났는데 결재 전" action={<Link to="/plan" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>전체 →</Link>}>
            <UrgentBars engines={stuck} dangerN={settings.dangerN} />
          </Panel>
        </div>
      </div>
    </div>
  )
}

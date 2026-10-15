import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../components/Panel'
import { MaintenanceCalendar } from '../components/ops/MaintenanceCalendar'
import { DemandChart, LifeHistogram } from '../components/ops/OpsCharts'
import { FleetDonut, KpiTile, ModuleChart, ProgressChart, RecentAlerts, UrgentBars } from '../components/ops/FleetCharts'
import { daysText, useFleet } from '../lib/fleet'
import { useSettings } from '../lib/settings'
import { usePlan, type PlanStatus } from '../lib/plan'
import { sendEngineAlert } from '../lib/notify'
import type { SendState } from '../lib/api'

export function Overview() {
  const fleet = useFleet()
  const { settings } = useSettings()
  const plan = usePlan()
  const [slack, setSlack] = useState<SendState>({ state: 'idle' })

  // 정비를 완료 처리한 엔진은 조치 대상에서 뺀다
  const active = useMemo(() => fleet.filter((e) => plan.get(e.unit).status !== 'done'), [fleet, plan])
  const queue = useMemo(() => active.filter((e) => e.urgency !== 'watch'), [active])
  const nowCount = useMemo(() => active.filter((e) => e.urgency === 'now').length, [active])
  const top = queue[0]
  const stats = useMemo(() => {
    const st: Record<PlanStatus, number> = { new: 0, review: 0, submitted: 0, rejected: 0, scheduled: 0, done: 0 }
    for (const e of fleet) st[plan.get(e.unit).status]++
    const live = active.length || 1
    const mean = active.reduce((a, e) => a + e.pred, 0) / live
    const min = active.reduce((m, e) => (e.pred < m.pred ? e : m), active[0])
    return { st, mean, min, red: active.filter((e) => e.level === 'red').length, warn: active.filter((e) => e.level === 'warn').length }
  }, [fleet, active, plan])

  const send = async () => {
    if (!top) return
    setSlack({ state: 'loading' })
    setSlack(await sendEngineAlert(top, settings))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row items-end justify-between gap-3">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">현황</h1>
        <Link to="/plan" className="text-[13px] font-medium no-underline" style={{ color: 'var(--accent)' }}>정비 계획 →</Link>
      </div>

      {nowCount > 0 && top && (
        <div
          className="flex flex-col gap-2.5 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'var(--status-critical-wash)', borderColor: 'color-mix(in oklab, var(--status-critical) 40%, transparent)', borderRadius: 'var(--radius-sm)' }}
        >
          <p className="m-0 flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--status-critical)' }} />
            <span className="font-semibold" style={{ color: 'var(--status-critical)' }}>즉시 조치 {nowCount}대</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              가장 급한 엔진 <span className="mono">{top.name}</span> · 남은 <span className="mono">{top.pred}</span> cycle
            </span>
          </p>
          <div className="flex shrink-0 flex-row flex-wrap items-center gap-2">
            {slack.state === 'off' && <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Slack 미연결</span>}
            {slack.state === 'error' && <span className="text-[11.5px]" style={{ color: 'var(--status-critical)' }}>전송 실패</span>}
            <Link to={`/equipment/engine-${top.unit}?tab=diagnosis`} className="border px-3 py-1.5 text-[12.5px] font-medium no-underline" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-1)' }}>
              고장 진단
            </Link>
            <button onClick={send} disabled={slack.state === 'loading' || slack.state === 'done'} className="border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-1)' }}>
              {slack.state === 'loading' ? '전송 중…' : slack.state === 'done' ? '전송됨' : 'Slack'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiTile label="즉시 조치" value={nowCount} unit="대" color="var(--status-critical)" sub={`전체의 ${Math.round((100 * nowCount) / fleet.length)}%`} />
        <KpiTile label="위험 구간" value={stats.red} unit="대" color="var(--status-serious)" sub={`주의 ${stats.warn}대`} />
        <KpiTile label="평균 남은 수명" value={stats.mean.toFixed(0)} unit="cycle" sub={daysText(stats.mean / settings.cyclesPerDay)} />
        <KpiTile label="가장 짧은 수명" value={stats.min ? stats.min.pred : '-'} unit="cycle" sub={stats.min?.name} />
        <KpiTile label="검토 필요" value={stats.st.new + stats.st.review} unit="대" sub={`검토 중 ${stats.st.review}대`} />
        <KpiTile label="결재 대기" value={stats.st.submitted} unit="대" color="var(--accent)" sub={`정비 예정 ${stats.st.scheduled}대`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <div className="flex flex-col gap-4">
          <Panel dense title="엔진 상태">
            <FleetDonut engines={active} />
          </Panel>
          <Panel dense title="처리 현황" sub="긴급도별 미확인 → 완료">
            <ProgressChart engines={fleet} plan={plan.items} height={170} />
          </Panel>
        </div>
        <Panel dense title="정비 일정" sub="날짜를 누르면 그날의 엔진을 볼 수 있습니다">
          <MaintenanceCalendar engines={fleet} plan={plan.items} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel dense title="주별 정비 요청">
          <DemandChart engines={fleet} plan={plan.items} height={210} />
        </Panel>
        <Panel dense title="남은 수명 분포">
          <LifeHistogram engines={fleet} dangerN={settings.dangerN} height={210} />
        </Panel>
        <div className="lg:col-span-2 xl:col-span-1">
          <Panel dense title="점검 예상 모듈" sub="위험·주의 엔진 기준 추정">
            <ModuleChart engines={active} height={210} />
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Panel dense title="가장 급한 엔진" action={<Link to="/plan" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>전체 →</Link>}>
          <UrgentBars engines={queue} dangerN={settings.dangerN} />
        </Panel>
        <Panel dense title="최근 알림" action={<Link to="/alerts" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>전체 →</Link>}>
          <RecentAlerts engines={fleet} dangerN={settings.dangerN} cyclesPerDay={settings.cyclesPerDay} plan={plan.items} />
        </Panel>
      </div>
    </div>
  )
}

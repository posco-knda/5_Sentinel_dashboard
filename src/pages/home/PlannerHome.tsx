import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../../components/Panel'
import { PageHead } from '../../components/PageHead'
import { TodoPanel } from '../../components/TodoPanel'
import { MaintenanceCalendar } from '../../components/ops/MaintenanceCalendar'
import { RecentAlerts } from '../../components/ops/FleetCharts'
import { useFleet } from '../../lib/fleet'
import { useSettings } from '../../lib/settings'
import { lastDecision, todayStr, usePlan } from '../../lib/plan'
import { sendEngineAlert } from '../../lib/notify'
import { useFitRows } from '../../lib/useFitRows'
import type { SendState } from '../../lib/api'
import { EngineLine, StatLink } from './shared'

/** 정비 담당자의 첫 화면 — 오늘 내가 손대야 할 엔진과 일정 */
export function PlannerHome() {
  const fleet = useFleet()
  const { settings } = useSettings()
  const plan = usePlan()
  const [slack, setSlack] = useState<SendState>({ state: 'idle' })
  const listRef = useRef<HTMLDivElement>(null)
  // 캘린더 높이에 맞춰 스크롤 없이 들어가는 줄 수만큼만 보여준다 (좁은 화면에서는 8줄)
  const fit = useFitRows(listRef, { row: '[data-row]', head: null, minWidth: 1280, fallbackRow: 78, min: 3 })
  const today = todayStr()
  const horizon = todayStr(13)

  const active = useMemo(() => fleet.filter((e) => plan.get(e.unit).status !== 'done'), [fleet, plan])
  // 내가 처리할 차례인 엔진: 아직 검토 전이거나, 검토 중이거나, 반려돼서 다시 봐야 하는 것
  const todo = useMemo(() => active.filter((e) => e.urgency !== 'watch' && ['new', 'review', 'rejected'].includes(plan.get(e.unit).status)), [active, plan])
  const overdue = todo.filter((e) => e.urgency === 'now' && plan.get(e.unit).status === 'new').length
  const rejected = useMemo(() => fleet.filter((e) => plan.get(e.unit).status === 'rejected'), [fleet, plan])
  const thisWeek = fleet.filter((e) => {
    const it = plan.get(e.unit)
    return it.status === 'scheduled' && !!it.date && it.date >= today && it.date <= horizon
  }).length
  const waiting = fleet.filter((e) => plan.get(e.unit).status === 'submitted').length
  const nowCount = active.filter((e) => e.urgency === 'now').length
  const top = todo[0]

  const send = async () => {
    if (!top) return
    setSlack({ state: 'loading' })
    setSlack(await sendEngineAlert(top, settings))
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHead title="오늘의 업무" sub={<>{today.slice(5).replace('-', '/')} 기준 · 내가 처리할 엔진 {todo.length}대 · 예측은 각 엔진의 가장 최근 비행 직후 기준입니다</>} action={
        <Link to="/plan" className="shrink-0 text-[13px] font-medium no-underline" style={{ color: 'var(--accent)' }}>정비 계획 →</Link>
      } />

      {nowCount > 0 && top && (
        <div className="flex flex-col gap-2.5 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ background: 'var(--status-critical-wash)', borderColor: 'color-mix(in oklab, var(--status-critical) 40%, transparent)', borderRadius: 'var(--radius-sm)' }}>
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
            <Link to={`/equipment/engine-${top.unit}?tab=diagnosis`} className="border px-3 py-1.5 text-[12.5px] font-medium no-underline" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}>
              고장 진단
            </Link>
            <button onClick={send} disabled={slack.state === 'loading' || slack.state === 'done'} className="border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}>
              {slack.state === 'loading' ? '전송 중…' : slack.state === 'done' ? '전송됨' : 'Slack'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatLink to="/plan" label="기한 지났는데 검토 전" value={overdue} unit="대" color="var(--status-critical)" sub="지금 바로 검토가 필요한 엔진" />
        <StatLink to="/approvals" label="반려돼서 다시 볼 것" value={rejected.length} unit="건" color="var(--status-warning)" sub="사유를 확인하고 다시 올리세요" />
        <StatLink to="/plan" label="2주 안 정비 예정" value={thisWeek} unit="대" color="var(--status-good)" sub={`${today.slice(5).replace('-', '/')} ~ ${horizon.slice(5).replace('-', '/')}`} />
        <StatLink to="/approvals" label="내가 올린 결재 대기" value={waiting} unit="건" color="var(--accent)" sub="책임자 승인을 기다리는 중" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        {/* 왼쪽 목록은 오른쪽 캘린더의 높이에 맞추고, 넘치는 엔진은 안에서 스크롤한다 */}
        <div className="relative">
          <div className="flex flex-col gap-4 xl:absolute xl:inset-0">
            <TodoPanel fill />
            <Panel dense fill title="지금 처리할 엔진" sub="요청 기한이 급한 순 · 바로 검토하고 결재를 올릴 수 있습니다" action={<Link to="/plan" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>전체 {todo.length}대 →</Link>}>
              <div ref={listRef} className="min-h-0 flex-1 xl:overflow-hidden">
                {todo.slice(0, fit ?? 8).map((e) => (
                  <EngineLine key={e.unit} e={e} />
                ))}
                {!todo.length && <p className="m-0 py-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>처리할 엔진이 없습니다</p>}
              </div>
            </Panel>
          </div>
        </div>
        <Panel dense title="정비 일정" sub="날짜를 누르면 그날의 엔진을 볼 수 있습니다">
          <MaintenanceCalendar engines={fleet} plan={plan.items} prepDays={settings.prepDays} slotsPerDay={settings.slotsPerDay} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Panel dense title="반려된 요청" sub="책임자가 남긴 사유" action={<Link to="/approvals" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>결재함 →</Link>}>
          {rejected.slice(0, 4).map((e) => {
            const d = lastDecision(plan.get(e.unit))
            return <EngineLine key={e.unit} e={e} note={d?.note ?? '사유 없음'} noteLabel={d ? `${d.by} 반려` : undefined} />
          })}
          {!rejected.length && <p className="m-0 py-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>반려된 요청이 없습니다</p>}
        </Panel>
        <Panel dense title="최근 알림" action={<Link to="/alerts" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>전체 →</Link>}>
          <RecentAlerts engines={fleet} dangerN={settings.dangerN} cyclesPerDay={settings.cyclesPerDay} plan={plan.items} />
        </Panel>
      </div>
    </div>
  )
}

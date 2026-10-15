import { useMemo, useState } from 'react'
import { Panel } from '../components/Panel'
import { StatTile } from '../components/StatTile'
import { QueueTable } from '../components/ops/QueueTable'
import { DemandChart } from '../components/ops/OpsCharts'
import { URGENCY, useFleet, type Urgency } from '../lib/fleet'
import { useSettings } from '../lib/settings'
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER, usePlan, type PlanStatus } from '../lib/plan'
import { useAuth } from '../lib/auth'
import { useBulkReview } from '../lib/bulk'

type Filter = 'todo' | Urgency | 'done'

export function Plan() {
  const fleet = useFleet()
  const { settings } = useSettings()
  const plan = usePlan()
  const isPlanner = useAuth().user?.role === 'planner'
  const bulkReview = useBulkReview()
  const [filter, setFilter] = useState<Filter>('todo')
  const [query, setQuery] = useState('')

  // 처리 상태를 plan.items에서 직접 읽어서, 상태가 바뀌면 아래 계산이 자동으로 다시 돌게 한다
  const items = plan.items
  const stateOf = (u: number) => items[u]?.status ?? 'new'
  const todo = useMemo(() => fleet.filter((e) => e.urgency !== 'watch' && (items[e.unit]?.status ?? 'new') !== 'done'), [fleet, items])
  const done = useMemo(() => fleet.filter((e) => items[e.unit]?.status === 'done'), [fleet, items])

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todo: todo.length, now: 0, week: 0, month: 0, watch: 0, done: done.length }
    for (const e of fleet) if (items[e.unit]?.status !== 'done') c[e.urgency]++
    return c
  }, [fleet, todo, done, items])

  const status = useMemo(() => {
    const s: Record<PlanStatus, number> = { new: 0, review: 0, submitted: 0, rejected: 0, scheduled: 0, done: 0 }
    for (const e of todo) s[items[e.unit]?.status ?? 'new']++
    return s
  }, [todo, items])

  const rows = useMemo(() => {
    const q = query.trim().replace('#', '')
    const base = filter === 'todo' ? todo : filter === 'done' ? done : fleet.filter((e) => e.urgency === filter && items[e.unit]?.status !== 'done')
    return base.filter((e) => !q || String(e.unit).includes(q))
  }, [filter, query, todo, done, fleet, items])

  const startAll = () => bulkReview(todo.filter((e) => stateOf(e.unit) === 'new').map((e) => e.unit))
  const chips: { id: Filter; label: string }[] = [
    { id: 'todo', label: '조치 필요' },
    { id: 'now', label: URGENCY.now.label },
    { id: 'week', label: URGENCY.week.label },
    { id: 'month', label: URGENCY.month.label },
    { id: 'watch', label: URGENCY.watch.label },
    { id: 'done', label: '완료' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">정비 계획</h1>
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          정비 요청 기한 = 예측 남은 수명(일) − 부품·인력 준비 {settings.prepDays}일 · 담당자가 검토해 결재를 올리면 운영 책임자가 승인합니다
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="검토 필요" value={status.new + status.review} suffix="대" foot={`미검토 ${status.new} · 검토 중 ${status.review}`} />
        <StatTile label="결재 대기" value={status.submitted} suffix="대" delay={0.05} foot="운영 책임자 승인을 기다림" />
        <StatTile label="반려" value={status.rejected} suffix="대" delay={0.1} foot="사유를 보고 다시 검토" />
        <StatTile label="정비 예정" value={status.scheduled} suffix="대" delay={0.15} foot={`승인됨 · 완료 ${done.length}대`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="주별 정비 요청 도래" sub="기한이 오는 주별 엔진 수 — 일정이 이미 잡힌 엔진은 파란색">
          <DemandChart engines={fleet} plan={plan.items} />
        </Panel>
        <Panel title="처리 현황" sub={`조치 필요 ${todo.length}대 중`}>
          <div className="flex flex-col gap-3.5">
            {STATUS_ORDER.filter((k) => k !== 'done').map((k) => [STATUS_LABEL[k], status[k], STATUS_COLOR[k]] as const).map(([label, n, color]) => (
              <div key={label} className="grid grid-cols-[72px_1fr_34px] items-center gap-3 text-[12.5px]">
                <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                <div className="h-2.5" style={{ background: 'var(--surface-2)', borderRadius: 3 }}>
                  <div className="h-full" style={{ width: `${todo.length ? (n / todo.length) * 100 : 0}%`, background: color, borderRadius: 3, transition: 'width .5s ease' }} />
                </div>
                <span className="mono text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{n}</span>
              </div>
            ))}
            {isPlanner && <button
              onClick={startAll}
              disabled={status.new === 0}
              className="mt-1 w-fit border px-3.5 py-1.5 text-[12.5px] font-medium"
              style={{ borderColor: 'var(--border)', color: status.new ? 'var(--text-primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-pill)', opacity: status.new ? 1 : 0.6 }}
            >
              검토 필요 {status.new}대 모두 검토 시작
            </button>}
          </div>
        </Panel>
      </div>

      <Panel title="엔진 목록" sub="행을 누르면 엔진 상세로 이동합니다">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-row flex-wrap gap-2">
            {chips.map((c) => {
              const active = filter === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => setFilter(c.id)}
                  className="border px-3 py-1.5 text-[12.5px]"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {c.label} <span className="mono" style={{ opacity: 0.7 }}>{counts[c.id]}</span>
                </button>
              )
            })}
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="엔진 번호"
            inputMode="numeric"
            className="mono w-32 border px-3 py-1.5 text-[12.5px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}
          />
        </div>
        <QueueTable engines={rows.slice(0, 80)} withDates empty={filter === 'done' ? '완료 처리한 엔진이 없습니다' : '해당하는 엔진이 없습니다'} />
        {rows.length > 80 && (
          <p className="mb-0 mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {rows.length}대 중 상위 80대만 표시합니다. 엔진 번호로 검색하세요.
          </p>
        )}
      </Panel>
    </div>
  )
}

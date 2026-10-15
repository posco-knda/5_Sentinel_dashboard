import { useMemo, useRef, useState } from 'react'
import { Panel } from '../components/Panel'
import { Pagination, type SizeMode } from '../components/Pagination'
import { KpiTile } from '../components/ops/FleetCharts'
import { QueueTable } from '../components/ops/QueueTable'
import { URGENCY, useFleet, type Urgency } from '../lib/fleet'
import { useSettings } from '../lib/settings'
import { usePlan, type PlanStatus } from '../lib/plan'
import { useAuth } from '../lib/auth'
import { useBulkReview } from '../lib/bulk'
import { useFitRows } from '../lib/useFitRows'

type Filter = 'todo' | Urgency | 'done'

/** 정비 계획 — 목록이 화면 높이에 맞춰 한 쪽이 스크롤 없이 다 보이게 한다. 차트와 요약은 현황 화면에 있다. */
export function Plan() {
  const fleet = useFleet()
  const { settings } = useSettings()
  const plan = usePlan()
  const isPlanner = useAuth().user?.role === 'planner'
  const bulkReview = useBulkReview()
  const [filter, setFilter] = useState<Filter>('todo')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sizeMode, setSizeMode] = useState<SizeMode>('auto')
  const boxRef = useRef<HTMLDivElement>(null)
  const fit = useFitRows(boxRef)
  const pageSize = sizeMode === 'auto' ? (fit ?? 10) : sizeMode

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

  // 필터·검색·처리 상태가 바뀌어 쪽 수가 줄어도 마지막 쪽 안에 머문다
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize))
  const curPage = Math.min(page, lastPage)
  const pageRows = rows.slice((curPage - 1) * pageSize, curPage * pageSize)
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
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[520px]">
      <div className="flex shrink-0 flex-col gap-1">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">정비 계획</h1>
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          정비 요청 기한 = 예측 남은 수명(일) − 부품·인력 준비 {settings.prepDays}일 · 행을 누르면 엔진 상세로 이동합니다
        </p>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="검토 필요" value={status.new + status.review} unit="대" sub={`미검토 ${status.new} · 검토 중 ${status.review}`} />
        <KpiTile label="결재 대기" value={status.submitted} unit="대" color="var(--accent)" sub="운영 책임자 승인을 기다림" />
        <KpiTile label="반려" value={status.rejected} unit="대" color="var(--status-critical)" sub="사유를 보고 다시 검토" />
        <KpiTile label="정비 예정" value={status.scheduled} unit="대" color="var(--status-good)" sub={`승인됨 · 완료 ${done.length}대`} />
      </div>

      <Panel dense fill>
        <div className="mb-3 flex shrink-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-row flex-wrap gap-2">
            {chips.map((c) => {
              const active = filter === c.id
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setFilter(c.id)
                    setPage(1)
                  }}
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
          <div className="flex flex-row flex-wrap items-center gap-2">
            {isPlanner && status.new > 0 && (
              <button onClick={startAll} className="border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}>
                검토 필요 {status.new}대 모두 검토 시작
              </button>
            )}
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder="엔진 번호"
              inputMode="numeric"
              aria-label="엔진 번호 검색"
              className="mono w-32 border px-3 py-1.5 text-[12.5px]"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}
            />
          </div>
        </div>

        <div ref={boxRef} className="min-h-0 flex-1 overflow-auto">
          <QueueTable engines={pageRows} withDates empty={filter === 'done' ? '완료 처리한 엔진이 없습니다' : '해당하는 엔진이 없습니다'} />
        </div>
        <Pagination
          total={rows.length}
          page={curPage}
          pageSize={pageSize}
          sizeMode={sizeMode}
          onPage={setPage}
          onSizeMode={(m) => {
            setSizeMode(m)
            setPage(1)
          }}
        />
      </Panel>
    </div>
  )
}

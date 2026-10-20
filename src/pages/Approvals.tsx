import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Panel } from '../components/Panel'
import { Pagination, type SizeMode } from '../components/Pagination'
import { KpiTile } from '../components/ops/FleetCharts'
import { PlanControl } from '../components/ops/PlanControl'
import { UrgencyChip } from '../components/ops/UrgencyChip'
import { daysText, deadlineText, useFleet, type FleetEngine } from '../lib/fleet'
import { ROLE_LABEL, useAuth } from '../lib/auth'
import { lastDecision, lastSubmit, usePlan, type PlanItem } from '../lib/plan'
import { useFitRows } from '../lib/useFitRows'

type Filter = 'pending' | 'approved' | 'rejected' | 'all'

const md = (d: string) => d.slice(5).replace('-', '/')
const when = (at: number) => new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

interface Row {
  e: FleetEngine
  item: PlanItem
}

/** 결재함 — 담당자가 올린 정비 요청을 운영 책임자가 검증해 승인하거나 반려한다 */
export function Approvals() {
  const fleet = useFleet()
  const plan = usePlan()
  const { user } = useAuth()
  const isManager = user?.role === 'manager'
  const [filter, setFilter] = useState<Filter>(isManager ? 'pending' : 'all')
  const [page, setPage] = useState(1)
  const [sizeMode, setSizeMode] = useState<SizeMode>('auto')
  const boxRef = useRef<HTMLDivElement>(null)
  const fit = useFitRows(boxRef, { row: '[data-row]', head: null, fallbackRow: 150, min: 2 })
  const pageSize = sizeMode === 'auto' ? (fit ?? 5) : sizeMode

  const all = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const e of fleet) {
      const item = plan.items[e.unit]
      if (item && lastSubmit(item)) out.push({ e, item })
    }
    return out
  }, [fleet, plan.items])

  const by = {
    pending: all.filter((r) => r.item.status === 'submitted'),
    approved: all.filter((r) => r.item.status === 'scheduled' || r.item.status === 'done'),
    rejected: all.filter((r) => r.item.status === 'rejected'),
  }
  const rows = useMemo(() => {
    const base = filter === 'all' ? all : by[filter]
    return [...base].sort((a, b) => {
      const pa = a.item.status === 'submitted' ? 0 : 1
      const pb = b.item.status === 'submitted' ? 0 : 1
      return pa - pb || (pa === 0 ? a.e.requestIn - b.e.requestIn : b.item.updated - a.item.updated)
    })
  }, [all, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const chips: { id: Filter; label: string; n: number }[] = [
    { id: 'pending', label: '결재 대기', n: by.pending.length },
    { id: 'approved', label: '승인', n: by.approved.length },
    { id: 'rejected', label: '반려', n: by.rejected.length },
    { id: 'all', label: '전체', n: all.length },
  ]

  // 필터가 바뀌거나 처리로 목록이 줄어도 마지막 쪽 안에 머문다
  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize))
  const curPage = Math.min(page, lastPage)
  const pageRows = rows.slice((curPage - 1) * pageSize, curPage * pageSize)

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[520px]">
      <PageHead title="결재함" sub={<>{isManager ? '정비 담당자가 올린 요청을 검증해 승인하거나 반려합니다.' : '올린 결재 요청의 진행 상태입니다. 반려된 요청은 사유를 보고 다시 올릴 수 있습니다.'}</>} />

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="결재 대기" value={by.pending.length} unit="건" color="var(--accent)" />
        <KpiTile label="승인(정비 예정)" value={all.filter((r) => r.item.status === 'scheduled').length} unit="건" color="var(--status-good)" />
        <KpiTile label="반려" value={by.rejected.length} unit="건" color="var(--status-critical)" />
        <KpiTile label="정비 완료" value={all.filter((r) => r.item.status === 'done').length} unit="건" />
      </div>

      <Panel dense fill>
        <div className="mb-3 flex shrink-0 flex-row flex-wrap gap-2">
          {chips.map((c) => {
            const active = filter === c.id
            return (
              <button key={c.id} onClick={() => { setFilter(c.id); setPage(1) }} className="border px-3 py-1.5 text-[12.5px]" style={{ borderRadius: 'var(--radius-pill)', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {c.label} <span className="mono" style={{ opacity: 0.7 }}>{c.n}</span>
              </button>
            )
          })}
        </div>

        <div ref={boxRef} className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {filter === 'pending' ? '결재를 기다리는 요청이 없습니다' : '해당하는 요청이 없습니다'}
            {!isManager && <div className="mt-2 text-[12px]">정비 계획에서 엔진을 검토하고 결재를 올려 보세요 ({ROLE_LABEL.planner} 권한)</div>}
          </div>
        ) : (
          <div className="flex flex-col">
            {pageRows.map(({ e, item }) => {
              const req = lastSubmit(item)!
              const dec = lastDecision(item)
              return (
                <div key={e.unit} data-row className="pb-3"><div className="border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-row flex-wrap items-center gap-2.5">
                        <Link to={`/equipment/engine-${e.unit}`} className="text-[14.5px] font-semibold no-underline" style={{ color: 'var(--text-primary)' }}>{e.name}</Link>
                        <UrgencyChip urgency={e.urgency} />
                        <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                          남은 <span className="mono font-medium">{e.pred}</span> cycle · {daysText(e.daysLeft)} · 요청 기한 {deadlineText(e.requestIn)}
                        </span>
                      </div>
                      <div className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        점검 예상 모듈 {e.topPart ? e.topPart.label : '뚜렷한 변화 없음'}
                      </div>

                      <div className="mt-3 border-l-2 pl-3 text-[12.5px]" style={{ borderColor: 'var(--accent)' }}>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {req.by}({ROLE_LABEL[req.role]}) 요청 · {when(req.at)}
                          {req.date && <span className="mono"> · 희망 정비일 {md(req.date)}</span>}
                        </div>
                        <div className="mt-0.5" style={{ color: 'var(--text-primary)' }}>{req.note}</div>
                      </div>

                      {dec && (
                        <div className="mt-2 border-l-2 pl-3 text-[12.5px]" style={{ borderColor: dec.action === 'approve' ? 'var(--status-good)' : 'var(--status-critical)' }}>
                          <div style={{ color: 'var(--text-muted)' }}>
                            {dec.by}({ROLE_LABEL[dec.role]}) {dec.action === 'approve' ? '승인' : '반려'} · {when(dec.at)}
                            {dec.date && <span className="mono"> · 확정 정비일 {md(dec.date)}</span>}
                          </div>
                          {dec.note && <div className="mt-0.5" style={{ color: 'var(--text-primary)' }}>{dec.note}</div>}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0">
                      <PlanControl engine={e} stacked />
                    </div>
                  </div>
                </div></div>
              )
            })}
          </div>
        )}
        </div>
        <Pagination total={rows.length} unit="건" page={curPage} pageSize={pageSize} sizeMode={sizeMode} onPage={setPage} onSizeMode={(m) => { setSizeMode(m); setPage(1) }} />
      </Panel>
    </div>
  )
}

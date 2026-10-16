import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Panel } from '../components/Panel'
import { Pagination, type SizeMode } from '../components/Pagination'
import { Badge } from '../components/Badge'
import { StatusChip } from '../components/ops/StatusChip'
import { UrgencyChip } from '../components/ops/UrgencyChip'
import { saveExcel } from '../lib/excel'
import { engineListSheet } from '../lib/exportData'
import { LEVEL, daysText, deadlineText, useFleet, type Level } from '../lib/fleet'
import { usePlan } from '../lib/plan'
import { useSettings } from '../lib/settings'
import { useFitRows } from '../lib/useFitRows'

type Filter = 'all' | Level
type Sort = 'urgent' | 'life' | 'unit'

const SORTS: { id: Sort; label: string }[] = [
  { id: 'urgent', label: '정비 요청 기한 순' },
  { id: 'life', label: '남은 수명 짧은 순' },
  { id: 'unit', label: '엔진 번호 순' },
]
const HEADS = ['엔진', '등급', '긴급도', '남은 수명', '정비 요청 기한', '점검 예상 모듈', '처리 상태']
const cell = { borderBottom: '1px solid var(--border-soft)' }

/** 엔진 — 플릿의 모든 엔진 목록. 행을 누르면 그 엔진의 상세(/equipment/engine-번호)로 간다. */
export function Engines() {
  const fleet = useFleet()
  const plan = usePlan()
  const { settings } = useSettings()
  const nav = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('urgent')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sizeMode, setSizeMode] = useState<SizeMode>('auto')
  const boxRef = useRef<HTMLDivElement>(null)
  const fit = useFitRows(boxRef)
  const pageSize = sizeMode === 'auto' ? (fit ?? 10) : sizeMode

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: fleet.length, red: 0, warn: 0, ok: 0 }
    for (const e of fleet) c[e.level]++
    return c
  }, [fleet])

  const rows = useMemo(() => {
    const q = query.trim().replace('#', '')
    const base = fleet.filter((e) => (filter === 'all' || e.level === filter) && (!q || String(e.unit).includes(q)))
    if (sort === 'life') return [...base].sort((a, b) => a.pred - b.pred || a.unit - b.unit)
    if (sort === 'unit') return [...base].sort((a, b) => a.unit - b.unit)
    return base // 이미 정비 요청 기한이 급한 순
  }, [fleet, filter, sort, query])

  const lastPage = Math.max(1, Math.ceil(rows.length / pageSize))
  const curPage = Math.min(page, lastPage)
  const pageRows = rows.slice((curPage - 1) * pageSize, curPage * pageSize)

  const chips: { id: Filter; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: 'red', label: LEVEL.red.label },
    { id: 'warn', label: LEVEL.warn.label },
    { id: 'ok', label: LEVEL.ok.label },
  ]
  const saveXlsx = () => void saveExcel('엔진_목록', [engineListSheet(rows, plan.items)])
  const go = (unit: number) => nav(`/equipment/engine-${unit}`)

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100dvh-4rem)] lg:min-h-[520px]">
      <div className="flex shrink-0 flex-col gap-1">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">엔진</h1>
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          플릿의 모든 엔진 {fleet.length}대 · 행을 누르면 엔진 상세로 이동합니다
        </p>
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
                  style={{ borderRadius: 'var(--radius-pill)', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)' }}
                >
                  {c.label} <span className="mono" style={{ opacity: 0.7 }}>{counts[c.id]}</span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-row flex-wrap items-center gap-2">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value as Sort)
                setPage(1)
              }}
              aria-label="정렬"
              className="border px-3 py-1.5 text-[12.5px]"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}
            >
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
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
            <button onClick={saveXlsx} title="지금 거른 엔진 전체를 엑셀로 저장합니다" className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
              엑셀로 저장
            </button>
          </div>
        </div>

        <div ref={boxRef} className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                {HEADS.map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11.5px] font-semibold" style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface-1)', boxShadow: 'inset 0 -1px 0 var(--border-strong)', color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((e) => (
                <tr key={e.unit} onClick={() => go(e.unit)} onKeyDown={(ev) => ev.key === 'Enter' && go(e.unit)} className="row-link" tabIndex={0}>
                  <td className="mono px-3 py-2 text-[13px] font-semibold" style={{ ...cell, color: 'var(--text-primary)' }}>#{e.unit}</td>
                  <td className="px-3 py-2" style={cell}><Badge status={LEVEL[e.level].badge} /></td>
                  <td className="px-3 py-2" style={cell}><UrgencyChip urgency={e.urgency} /></td>
                  <td className="px-3 py-2 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>
                    <span className="mono font-medium">{e.pred}</span> cycle
                    <span className="ml-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{daysText(e.daysLeft)}</span>
                  </td>
                  <td className="px-3 py-2 text-[13px]" style={{ ...cell, color: e.requestIn <= 0 ? 'var(--status-critical)' : 'var(--text-primary)', fontWeight: e.requestIn <= 7 ? 600 : 400 }}>
                    {e.urgency === 'watch' ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{deadlineText(e.requestIn)}</span> : deadlineText(e.requestIn)}
                  </td>
                  <td className="px-3 py-2 text-[12.5px]" style={{ ...cell, color: e.topPart ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{e.topPart ? e.topPart.label : '뚜렷한 변화 없음'}</td>
                  <td className="px-3 py-2" style={cell}><StatusChip status={plan.get(e.unit).status} /></td>
                </tr>
              ))}
              {!pageRows.length && (
                <tr>
                  <td colSpan={HEADS.length} className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>해당하는 엔진이 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination total={rows.length} page={curPage} pageSize={pageSize} sizeMode={sizeMode} onPage={setPage} onSizeMode={(m) => { setSizeMode(m); setPage(1) }} />
        <p className="mb-0 mt-2 shrink-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          위험은 예측 남은 수명 {settings.dangerN} cycle 이하, 주의는 80 cycle 미만입니다. 기준은 설정에서 바꿀 수 있습니다.
        </p>
      </Panel>
    </div>
  )
}

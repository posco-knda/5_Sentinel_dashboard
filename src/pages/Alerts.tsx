import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Panel } from '../components/Panel'
import { Pagination, type SizeMode } from '../components/Pagination'
import { KpiTile } from '../components/ops/FleetCharts'
import { LEVEL, daysText, useFleet, type Level } from '../lib/fleet'
import { buildAlertEvents, type AlertEvent } from '../lib/alerts'
import { useCurves } from '../lib/curves'
import { useSettings } from '../lib/settings'
import { STATUS_LABEL, usePlan } from '../lib/plan'
import { useAuth } from '../lib/auth'
import { useBulkReview } from '../lib/bulk'
import { useFitRows } from '../lib/useFitRows'

type Filter = 'all' | 'red' | 'warn' | 'new'
const BUCKETS = [
  { label: '3일 이내', max: 3 },
  { label: '4~7일', max: 7 },
  { label: '8~14일', max: 14 },
  { label: '15~30일', max: 30 },
  { label: '30일 이전', max: Infinity },
]

/** 알림 — 목록은 큰 화면에서 화면 높이에 맞춰 한 쪽이 스크롤 없이 다 보인다. */
export function Alerts() {
  const fleet = useFleet()
  const curves = useCurves()
  const { settings } = useSettings()
  const plan = usePlan()
  const isPlanner = useAuth().user?.role === 'planner'
  const bulkReview = useBulkReview()
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [sizeMode, setSizeMode] = useState<SizeMode>('auto')
  const boxRef = useRef<HTMLDivElement>(null)
  const fit = useFitRows(boxRef, { row: '[data-row]', head: null, minWidth: 1280, fallbackRow: 58 })
  const pageSize = sizeMode === 'auto' ? (fit ?? 10) : sizeMode

  const events = useMemo<AlertEvent[] | null>(() => (curves ? buildAlertEvents(fleet, curves, settings.dangerN) : null), [curves, fleet, settings.dangerN])

  const unread = (u: number) => plan.get(u).status === 'new'
  const visible = useMemo(() => {
    if (!events) return []
    return events.filter((ev) => (filter === 'all' ? true : filter === 'new' ? unread(ev.unit) : ev.kind === filter))
  }, [events, filter, plan]) // eslint-disable-line react-hooks/exhaustive-deps

  const volume = useMemo(() => {
    const rows = BUCKETS.map((b) => ({ label: b.label, red: 0, warn: 0 }))
    for (const ev of events ?? []) {
      const d = ev.ago / settings.cyclesPerDay
      rows[BUCKETS.findIndex((b) => d <= b.max)][ev.kind]++
    }
    return rows
  }, [events, settings.cyclesPerDay])

  const unreadEngines = new Set((events ?? []).filter((ev) => unread(ev.unit)).map((ev) => ev.unit))
  const recent = (events ?? []).filter((ev) => ev.ago / settings.cyclesPerDay <= 7)
  const ackAll = () => bulkReview([...unreadEngines])
  const chips: { id: Filter; label: string; n: number }[] = [
    { id: 'all', label: '전체', n: events?.length ?? 0 },
    { id: 'red', label: '위험', n: events?.filter((e) => e.kind === 'red').length ?? 0 },
    { id: 'warn', label: '주의', n: events?.filter((e) => e.kind === 'warn').length ?? 0 },
    { id: 'new', label: '미확인', n: events?.filter((e) => unread(e.unit)).length ?? 0 },
  ]

  const lastPage = Math.max(1, Math.ceil(visible.length / pageSize))
  const curPage = Math.min(page, lastPage)
  const pageRows = visible.slice((curPage - 1) * pageSize, curPage * pageSize)

  return (
    <div className="flex flex-col gap-4 xl:h-[calc(100dvh-4rem)] xl:min-h-[520px]">
      <PageHead title="알림" sub={<>예측 남은 수명이 위험(≤{settings.dangerN})·주의(&lt;80) 구간에 들어온 알림 · 최근 것부터 · 시간은 각 엔진의 최신 비행 후 데이터 기준</>} />

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="미확인 엔진" value={unreadEngines.size} unit="대" color={unreadEngines.size ? 'var(--status-critical)' : undefined} sub="확인하면 읽음 처리" />
        <KpiTile label="최근 7일 위험 알림" value={recent.filter((e) => e.kind === 'red').length} unit="건" sub={`하루 ${settings.cyclesPerDay}회 비행 기준`} />
        <KpiTile label="최근 7일 주의 알림" value={recent.filter((e) => e.kind === 'warn').length} unit="건" sub="정비 준비 시작 신호" />
        <KpiTile label="알림이 난 엔진" value={new Set((events ?? []).map((e) => e.unit)).size} unit="대" sub={`전체 ${fleet.length}대 중`} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:min-h-0 xl:flex-1 xl:grid-cols-[1fr_1.7fr]">
        {/* 차트 카드는 내용만큼의 높이로 두고 목록 높이에 끌려가 늘어나지 않게 한다 */}
        <div className="xl:self-start">
          <Panel dense title="알림 발생 시점" sub="경보가 켜진 뒤 지난 기간별 건수">
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volume} margin={{ top: 10, right: 8, bottom: 4, left: -10 }} barCategoryGap={12}>
                  <CartesianGrid stroke="var(--gridline)" vertical={false} />
                  <XAxis dataKey="label" interval={0} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }} axisLine={false} tickLine={false} width={34} />
                  <Tooltip
                    cursor={{ fill: 'var(--border-soft)' }}
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload as { red: number; warn: number }
                      return (
                        <div className="border px-3 py-2 text-[12px]" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                          <div style={{ color: 'var(--text-muted)' }}>위험 <span className="mono">{d.red}</span>건 · 주의 <span className="mono">{d.warn}</span>건</div>
                        </div>
                      )
                    }}
                  />
                  <Bar dataKey="red" stackId="a" fill="var(--status-critical)" animationDuration={600} />
                  <Bar dataKey="warn" stackId="a" fill="var(--status-warning)" radius={[3, 3, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>

        <Panel dense fill>
          <div className="mb-3 flex shrink-0 flex-row flex-wrap items-center justify-between gap-2">
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
                    {c.label} <span className="mono" style={{ opacity: 0.7 }}>{c.n}</span>
                  </button>
                )
              })}
            </div>
            {isPlanner && (
              <button
                onClick={ackAll}
                disabled={!unreadEngines.size}
                className="border px-3 py-1.5 text-[12px] font-medium"
                style={{ borderColor: 'var(--border)', color: unreadEngines.size ? 'var(--text-primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-pill)', opacity: unreadEngines.size ? 1 : 0.6 }}
              >
                모두 확인
              </button>
            )}
          </div>

          <div ref={boxRef} className="min-h-0 flex-1 overflow-auto">
            {!events ? (
              <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>불러오는 중…</div>
            ) : visible.length === 0 ? (
              <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>해당하는 알림이 없습니다</div>
            ) : (
              <div className="flex flex-col">
                {pageRows.map((ev) => {
                  const isNew = unread(ev.unit)
                  const lv: Level = ev.kind
                  return (
                    <div key={`${ev.unit}-${ev.kind}`} data-row className="flex flex-row items-start gap-3 py-2.5" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: isNew ? 'var(--status-critical)' : 'transparent', border: isNew ? 'none' : '1px solid var(--border)' }} title={isNew ? '미확인' : STATUS_LABEL[plan.get(ev.unit).status]} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-row flex-wrap items-center gap-x-2 gap-y-1">
                          <Link to={`/equipment/engine-${ev.unit}?tab=diagnosis`} className="text-[13.5px] font-semibold no-underline" style={{ color: 'var(--text-primary)' }}>Engine #{ev.unit}</Link>
                          <span className="text-[12.5px] font-medium" style={{ color: LEVEL[lv].color }}>{lv === 'red' ? '위험 구간 진입' : '주의 구간 진입'}</span>
                          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{ev.ago} cycle({daysText(ev.ago / settings.cyclesPerDay)}) 전</span>
                        </div>
                        <div className="mt-0.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                          <span className="mono">cycle #{ev.cycle}</span> · 예측 남은 수명 <span className="mono">{ev.predThen}</span> → 현재 <span className="mono">{ev.predNow}</span> cycle
                          {ev.transient > 0 && <span style={{ color: 'var(--text-muted)' }}> · 앞서 일시 경보 {ev.transient}회</span>}
                        </div>
                      </div>
                      {isNew && isPlanner ? (
                        <button onClick={() => plan.act(ev.unit, 'review')} className="shrink-0 border px-3 py-1 text-[12px] font-medium" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}>
                          확인
                        </button>
                      ) : (
                        <span className="shrink-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>{STATUS_LABEL[plan.get(ev.unit).status]}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          <Pagination
            total={visible.length}
            unit="건"
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
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Panel } from '../components/Panel'
import { StatTile } from '../components/StatTile'
import { LEVEL, daysText, useFleet, type Level } from '../lib/fleet'
import { buildAlertEvents, type AlertEvent } from '../lib/alerts'
import { useCurves } from '../lib/curves'
import { useSettings } from '../lib/settings'
import { STATUS_LABEL, usePlan } from '../lib/plan'
import { useAuth } from '../lib/auth'
import { useBulkReview } from '../lib/bulk'

type Filter = 'all' | 'red' | 'warn' | 'new'
const PAGE = 40
const BUCKETS = [
  { label: '3일 이내', max: 3 },
  { label: '4~7일', max: 7 },
  { label: '8~14일', max: 14 },
  { label: '15~30일', max: 30 },
  { label: '30일 이전', max: Infinity },
]

export function Alerts() {
  const fleet = useFleet()
  const curves = useCurves()
  const { settings } = useSettings()
  const plan = usePlan()
  const isPlanner = useAuth().user?.role === 'planner'
  const bulkReview = useBulkReview()
  const [filter, setFilter] = useState<Filter>('all')
  const [shown, setShown] = useState(PAGE)

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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">알림</h1>
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          예측 남은 수명이 위험(≤{settings.dangerN})·주의(&lt;80) 구간에 들어온 알림 · 최근 것부터 · 시간은 각 엔진의 최신 비행 후 데이터 기준
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="미확인 엔진" value={unreadEngines.size} suffix="대" icon={unreadEngines.size ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--status-critical)' }} /> : undefined} foot="확인하면 목록에서 읽음 처리" />
        <StatTile label="최근 7일 위험 알림" value={recent.filter((e) => e.kind === 'red').length} suffix="건" delay={0.05} foot={`하루 ${settings.cyclesPerDay}회 비행 기준`} />
        <StatTile label="최근 7일 주의 알림" value={recent.filter((e) => e.kind === 'warn').length} suffix="건" delay={0.1} foot="정비 준비 시작 신호" />
        <StatTile label="알림이 난 엔진" value={new Set((events ?? []).map((e) => e.unit)).size} suffix="대" delay={0.15} foot={`전체 ${fleet.length}대 중`} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.5fr]">
        <Panel title="알림 발생 시점" sub="경보가 켜진 뒤 지난 기간별 건수">
          <div className="h-[230px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volume} margin={{ top: 10, right: 8, bottom: 4, left: -10 }} barCategoryGap={12}>
                <CartesianGrid stroke="var(--gridline)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11.5 }} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
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

        <Panel
          title="알림 목록"
          action={
            isPlanner && (<button onClick={ackAll} disabled={!unreadEngines.size} className="border px-3 py-1.5 text-[12px] font-medium" style={{ borderColor: 'var(--border)', color: unreadEngines.size ? 'var(--text-primary)' : 'var(--text-muted)', borderRadius: 'var(--radius-pill)', opacity: unreadEngines.size ? 1 : 0.6 }}>
              모두 확인
            </button>)
          }
        >
          <div className="mb-3 flex flex-row flex-wrap gap-2">
            {chips.map((c) => {
              const active = filter === c.id
              return (
                <button key={c.id} onClick={() => { setFilter(c.id); setShown(PAGE) }} className="border px-3 py-1.5 text-[12.5px]" style={{ borderRadius: 'var(--radius-pill)', borderColor: active ? 'var(--accent)' : 'var(--border)', background: active ? 'var(--accent-dim)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {c.label} <span className="mono" style={{ opacity: 0.7 }}>{c.n}</span>
                </button>
              )
            })}
          </div>

          {!events ? (
            <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>불러오는 중…</div>
          ) : visible.length === 0 ? (
            <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>해당하는 알림이 없습니다</div>
          ) : (
            <div className="flex flex-col">
              {visible.slice(0, shown).map((ev) => {
                const isNew = unread(ev.unit)
                const lv: Level = ev.kind
                return (
                  <div key={`${ev.unit}-${ev.kind}`} className="flex flex-row items-start gap-3 py-3.5" style={{ borderBottom: '1px solid var(--border-soft)' }}>
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
              {visible.length > shown && (
                <button onClick={() => setShown((n) => n + PAGE)} className="mx-auto mt-3 border px-4 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
                  더 보기 ({visible.length - shown}건 남음)
                </button>
              )}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

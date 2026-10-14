import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PART_LABEL, deadlineText, type FleetEngine, type Urgency } from '../../lib/fleet'
import type { PlanItem } from '../../lib/plan'
import { partMeta } from '../../data/partFlowMeta'

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }
const tipBox = { background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }

/** 플릿 현황에서 쓰는 4단계 색 — 정상은 초록 */
const FLEET_COLOR: Record<Urgency, string> = {
  now: 'var(--status-critical)',
  week: 'var(--status-serious)',
  month: 'var(--status-warning)',
  watch: 'var(--status-good)',
}
const FLEET_LABEL: Record<Urgency, string> = { now: '즉시 조치', week: '이번 주', month: '이번 달', watch: '정상' }
const ORDER: Urgency[] = ['now', 'week', 'month', 'watch']

const SHORT_PART: Record<string, string> = { fan: '팬', lpc: 'LPC', hpc: 'HPC', core: '코어', hpt: 'HPT', lpt: 'LPT' }

/** 엔진 상태 도넛 — 가운데는 전체 대수, 아래 범례가 곧 대수 요약 */
export function FleetDonut({ engines }: { engines: FleetEngine[] }) {
  const counts = useMemo(() => {
    const c: Record<Urgency, number> = { now: 0, week: 0, month: 0, watch: 0 }
    for (const e of engines) c[e.urgency]++
    return c
  }, [engines])
  const data = ORDER.map((u) => ({ u, n: counts[u] }))
  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[190px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="n" innerRadius="66%" outerRadius="96%" paddingAngle={2} stroke="none" startAngle={90} endAngle={-270} animationDuration={700}>
              {data.map((d) => (
                <Cell key={d.u} fill={FLEET_COLOR[d.u]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="mono text-[34px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{engines.length}</span>
          <span className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>엔진</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {ORDER.map((u) => (
          <div key={u} className="flex flex-row items-center gap-2 text-[12.5px]">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: FLEET_COLOR[u] }} />
            <span style={{ color: 'var(--text-secondary)' }}>{FLEET_LABEL[u]}</span>
            <span className="mono ml-auto font-semibold" style={{ color: 'var(--text-primary)' }}>{counts[u]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 플릿 지도 — 엔진 한 대가 칸 하나. 색은 긴급도, 누르면 그 엔진으로 이동 */
export function FleetMap({ engines, plan }: { engines: FleetEngine[]; plan: Record<number, PlanItem> }) {
  const [hover, setHover] = useState<FleetEngine | null>(null)
  const sorted = useMemo(() => [...engines].sort((a, b) => a.unit - b.unit), [engines])
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-[3px]" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(15px, 1fr))' }} onMouseLeave={() => setHover(null)}>
        {sorted.map((e) => {
          const done = plan[e.unit]?.status === 'done'
          return (
            <Link
              key={e.unit}
              to={`/equipment/engine-${e.unit}`}
              aria-label={`${e.name} ${e.pred} cycle`}
              onMouseEnter={() => setHover(e)}
              onFocus={() => setHover(e)}
              className="aspect-square"
              style={{ background: FLEET_COLOR[e.urgency], opacity: done ? 0.22 : 1, borderRadius: 3, outlineOffset: 1 }}
            />
          )
        })}
      </div>
      <div className="flex min-h-[20px] flex-row items-center justify-between gap-3 text-[12.5px]">
        <div className="flex flex-row flex-wrap items-center gap-x-4 gap-y-1" style={{ color: 'var(--text-muted)' }}>
          {ORDER.map((u) => (
            <span key={u} className="flex flex-row items-center gap-1.5 text-[11.5px]">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: FLEET_COLOR[u] }} />
              {FLEET_LABEL[u]}
            </span>
          ))}
        </div>
        <span className="mono truncate" style={{ color: 'var(--text-primary)' }}>
          {hover ? `${hover.name} · ${hover.pred} cycle · ${deadlineText(hover.requestIn)}` : ''}
        </span>
      </div>
    </div>
  )
}

/** 점검 예상 모듈 — 위험·주의 엔진에서 센서가 가장 크게 변한 모듈별 엔진 수 */
export function ModuleChart({ engines }: { engines: FleetEngine[] }) {
  const data = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of engines) if (e.level !== 'ok' && e.topPart) m.set(e.topPart.id, (m.get(e.topPart.id) ?? 0) + 1)
    return partMeta.parts.map((p) => ({ id: p.id, name: SHORT_PART[p.id] ?? p.label, n: m.get(p.id) ?? 0 })).sort((a, b) => b.n - a.n)
  }, [engines])
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 30, bottom: 4, left: 4 }} barCategoryGap={10}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            cursor={{ fill: 'var(--border-soft)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as { id: string; n: number }
              return (
                <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                  <div style={{ color: 'var(--text-muted)' }}>{PART_LABEL[d.id]}</div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <span className="mono">{d.n}</span>대
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="n" fill="var(--accent)" radius={[0, 4, 4, 0]} animationDuration={700}>
            <LabelList dataKey="n" position="right" style={{ fill: 'var(--text-primary)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const HORIZON = 60

/** 누적 정비 요청 — 앞으로 N일 안에 정비 요청 기한이 오는 엔진이 몇 대까지 쌓이는지 */
export function CumulativeDemand({ engines }: { engines: FleetEngine[] }) {
  const data = useMemo(() => {
    const due = engines.map((e) => Math.max(0, Math.ceil(e.requestIn))).sort((a, b) => a - b)
    const rows: { day: number; n: number }[] = []
    let i = 0
    for (let d = 0; d <= HORIZON; d++) {
      while (i < due.length && due[i] <= d) i++
      rows.push({ day: d, n: i })
    }
    return rows
  }, [engines])
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 14, right: 12, bottom: 4, left: -10 }}>
          <defs>
            <linearGradient id="cumFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis dataKey="day" type="number" domain={[0, HORIZON]} ticks={[0, 10, 20, 30, 40, 50, 60]} tickFormatter={(v) => (v === 0 ? '오늘' : `${v}일`)} tick={TICK} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
          <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={38} />
          <ReferenceLine x={7} stroke="var(--text-muted)" strokeDasharray="4 3" label={{ value: '1주', position: 'top', fill: 'var(--text-muted)', fontSize: 11 }} />
          <ReferenceLine x={30} stroke="var(--text-muted)" strokeDasharray="4 3" label={{ value: '30일', position: 'top', fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip
            cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as { day: number; n: number }
              return (
                <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                  <div style={{ color: 'var(--text-muted)' }}>{d.day === 0 ? '오늘까지' : `${d.day}일 안에`}</div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    정비 요청 <span className="mono">{d.n}</span>대
                  </div>
                </div>
              )
            }}
          />
          <Area type="stepAfter" dataKey="n" stroke="var(--accent)" strokeWidth={2} fill="url(#cumFill)" animationDuration={800} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/** 가장 급한 엔진 — 남은 수명을 막대로 비교하고 위험 기준선을 함께 보여 준다 */
export function UrgentBars({ engines, dangerN, limit = 8 }: { engines: FleetEngine[]; dangerN: number; limit?: number }) {
  const rows = engines.slice(0, limit)
  const max = Math.max(dangerN * 1.15, ...rows.map((r) => r.pred), 1)
  if (rows.length === 0) return <p className="m-0 py-8 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>지금 조치가 필요한 엔진이 없습니다</p>
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((e) => (
        <Link key={e.unit} to={`/equipment/engine-${e.unit}?tab=diagnosis`} className="grid grid-cols-[88px_1fr_132px] items-center gap-3 text-[12.5px] no-underline">
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{e.name}</span>
          <div className="relative h-3" style={{ background: 'var(--surface-2)', borderRadius: 3 }}>
            <div className="h-full" style={{ width: `${(e.pred / max) * 100}%`, background: FLEET_COLOR[e.urgency], borderRadius: 3, transition: 'width .6s ease' }} />
            <div className="absolute -top-0.5 h-4" style={{ left: `${(dangerN / max) * 100}%`, width: 0, borderLeft: '1.5px dashed var(--text-primary)' }} />
          </div>
          <span className="mono whitespace-nowrap text-right" style={{ color: 'var(--text-secondary)' }}>
            {e.pred} cycle
            <span className="ml-1.5 text-[11px]" style={{ color: FLEET_COLOR[e.urgency] }}>{deadlineText(e.requestIn)}</span>
          </span>
        </Link>
      ))}
      <p className="m-0 flex flex-row items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <span className="inline-block h-3" style={{ borderLeft: '1.5px dashed var(--text-primary)' }} />
        위험 기준 {dangerN} cycle
      </p>
    </div>
  )
}

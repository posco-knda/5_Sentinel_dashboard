import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { LEVEL, PART_LABEL, daysText, deadlineText, type FleetEngine, type Urgency } from '../../lib/fleet'
import { buildAlertEvents } from '../../lib/alerts'
import { useCurves } from '../../lib/curves'
import { STATUS_COLOR, STATUS_LABEL, STATUS_ORDER, type PlanItem, type PlanStatus } from '../../lib/plan'
import { partMeta } from '../../data/partFlowMeta'

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
    <div className="flex flex-col gap-3">
      <div className="relative h-[160px] w-full">
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

/** 점검 예상 모듈 — 위험·주의 엔진에서 센서가 가장 크게 변한 모듈별 엔진 수 */
export function ModuleChart({ engines, height = 250 }: { engines: FleetEngine[]; height?: number }) {
  const data = useMemo(() => {
    const m = new Map<string, number>()
    for (const e of engines) if (e.level !== 'ok' && e.topPart) m.set(e.topPart.id, (m.get(e.topPart.id) ?? 0) + 1)
    return partMeta.parts.map((p) => ({ id: p.id, name: SHORT_PART[p.id] ?? p.label, n: m.get(p.id) ?? 0 })).sort((a, b) => b.n - a.n)
  }, [engines])
  return (
    <div className="w-full" style={{ height }}>
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

/** 상단 요약 숫자 — 작게, 한 줄에 여섯 개 */
export function KpiTile({ label, value, unit, color, sub }: { label: string; value: number | string; unit?: string; color?: string; sub?: string }) {
  return (
    <div className="surface-card flex flex-col gap-1 border px-4 py-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <span className="flex flex-row items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className="flex flex-row items-baseline gap-1.5">
        <span className="mono text-[26px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</span>
        {unit && <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{unit}</span>}
      </span>
      {sub && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
    </div>
  )
}

/** 긴급도별 처리 현황 — 즉시·이번 주·이번 달 엔진이 미확인에서 완료까지 어디에 있는지 */
export function ProgressChart({ engines, plan, height = 200 }: { engines: FleetEngine[]; plan: Record<number, PlanItem>; height?: number }) {
  const data = useMemo(() => {
    const rows = (['now', 'week', 'month'] as Urgency[]).map((u) => ({ u, name: FLEET_LABEL[u], new: 0, review: 0, submitted: 0, rejected: 0, scheduled: 0, done: 0 }))
    for (const e of engines) {
      const r = rows.find((x) => x.u === e.urgency)
      if (r) r[plan[e.unit]?.status ?? 'new']++
    }
    return rows
  }, [engines, plan])
  return (
    <div>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }} barCategoryGap={14}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} width={72} />
            <Tooltip
              cursor={{ fill: 'var(--border-soft)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as Record<PlanStatus, number>
                return (
                  <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      {STATUS_ORDER.map((k) => `${STATUS_LABEL[k]} ${d[k]}`).join(' · ')}
                    </div>
                  </div>
                )
              }}
            />
            {STATUS_ORDER.map((k, i) => (
              <Bar key={k} dataKey={k} stackId="a" fill={STATUS_COLOR[k]} radius={i === STATUS_ORDER.length - 1 ? [0, 4, 4, 0] : 0} animationDuration={600} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-row flex-wrap gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        {STATUS_ORDER.map((k) => (
          <span key={k} className="flex flex-row items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px]" style={{ background: STATUS_COLOR[k] }} />
            {STATUS_LABEL[k]}
          </span>
        ))}
      </div>
    </div>
  )
}

/** 최근 알림 — 위험·주의 구간에 막 들어온 엔진 */
export function RecentAlerts({ engines, dangerN, cyclesPerDay, plan, limit = 8 }: { engines: FleetEngine[]; dangerN: number; cyclesPerDay: number; plan: Record<number, PlanItem>; limit?: number }) {
  const curves = useCurves()
  const events = useMemo(() => (curves ? buildAlertEvents(engines, curves, dangerN).slice(0, limit) : null), [curves, engines, dangerN, limit])
  if (!events) return <p className="m-0 py-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>불러오는 중…</p>
  return (
    <div className="flex flex-col">
      {events.map((ev) => {
        const isNew = (plan[ev.unit]?.status ?? 'new') === 'new'
        return (
          <Link key={`${ev.unit}-${ev.kind}`} to={`/equipment/engine-${ev.unit}?tab=diagnosis`} className="flex flex-row items-center gap-2.5 py-[7px] text-[12.5px] no-underline" style={{ borderBottom: '1px solid var(--border-soft)' }}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: LEVEL[ev.kind].color }} />
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Engine #{ev.unit}</span>
            <span style={{ color: LEVEL[ev.kind].color }}>{ev.kind === 'red' ? '위험' : '주의'}</span>
            <span className="mono ml-auto" style={{ color: 'var(--text-muted)' }}>{daysText(ev.ago / cyclesPerDay)} 전</span>
            {isNew && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: 'var(--accent)' }} title="미확인" />}
          </Link>
        )
      })}
    </div>
  )
}

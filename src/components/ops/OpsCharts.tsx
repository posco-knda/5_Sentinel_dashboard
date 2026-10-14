import { useMemo } from 'react'
import { BarChart, Bar, Cell, LabelList, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { MAX_WEEK, WEEK_LABEL, weekBucket, PART_LABEL, type FleetEngine } from '../../lib/fleet'
import type { PlanItem } from '../../lib/plan'
import { WARN_N } from '../../lib/settings'

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }
const tipBox = { background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }

/** 주별 정비 요청 도래 — 정비 요청 기한이 어느 주에 오는지, 이미 일정이 배정된 엔진은 몇 대인지 */
export function DemandChart({ engines, plan }: { engines: FleetEngine[]; plan: Record<number, PlanItem> }) {
  const data = useMemo(() => {
    const rows = WEEK_LABEL.slice(0, MAX_WEEK).map((label, i) => ({ label, open: 0, scheduled: 0, now: i === 0 }))
    for (const e of engines) {
      const w = weekBucket(e.requestIn)
      if (w >= MAX_WEEK) continue
      const st = plan[e.unit]?.status
      if (st === 'done') continue
      if (st === 'scheduled') rows[w].scheduled++
      else rows[w].open++
    }
    return rows
  }, [engines, plan])
  return (
    <div>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 4, left: -10 }} barCategoryGap={10}>
            <CartesianGrid stroke="var(--gridline)" vertical={false} />
            <XAxis dataKey="label" interval={0} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
            <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={34} />
            <Tooltip
              cursor={{ fill: 'var(--border-soft)' }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as { open: number; scheduled: number }
                return (
                  <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      미배정 <span className="mono">{d.open}</span>대 · 정비 예정 <span className="mono">{d.scheduled}</span>대
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="open" stackId="a" animationDuration={600}>
              {data.map((d) => (
                <Cell key={d.label} fill={d.now ? 'var(--status-critical)' : 'var(--status-warning)'} />
              ))}
              <LabelList dataKey="open" position="insideTop" formatter={(v: unknown) => (Number(v) > 0 ? String(v) : '')} style={{ fill: '#fff', fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600 }} />
            </Bar>
            <Bar dataKey="scheduled" stackId="a" fill="var(--accent)" radius={[3, 3, 0, 0]} animationDuration={600} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex flex-row items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--status-warning)' }} />
          미배정
        </span>
        <span className="flex flex-row items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />
          정비 예정
        </span>
      </div>
    </div>
  )
}

const BIN = 10

/** 플릿 전체의 예측 남은 수명 분포 — 위험·주의 구간이 어디까지인지 색으로 보여 준다 */
export function LifeHistogram({ engines, dangerN }: { engines: FleetEngine[]; dangerN: number }) {
  const data = useMemo(() => {
    const bins = Array.from({ length: 13 }, (_, i) => ({ lo: i * BIN, n: 0 }))
    for (const e of engines) bins[Math.min(12, Math.floor(e.pred / BIN))].n++
    return bins.map((b) => ({ ...b, label: b.lo >= 120 ? '120+' : String(b.lo) }))
  }, [engines])
  const color = (lo: number) => (lo + BIN - 1 <= dangerN ? 'var(--status-critical)' : lo < WARN_N ? 'var(--status-warning)' : 'var(--status-good)')
  return (
    <div>
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 8, bottom: 20, left: -10 }} barCategoryGap={2}>
            <CartesianGrid stroke="var(--gridline)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={TICK}
              axisLine={{ stroke: 'var(--axis)' }}
              tickLine={false}
              label={{ value: '예측 남은 수명 (cycle)', position: 'insideBottom', offset: -10, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} width={34} />
            <ReferenceLine x={String(Math.floor(dangerN / BIN) * BIN)} stroke="var(--text-primary)" strokeDasharray="4 3" />
            <Tooltip
              cursor={{ fill: 'var(--border-soft)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as { lo: number; n: number }
                return (
                  <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                    <div style={{ color: 'var(--text-muted)' }}>
                      남은 수명 <span className="mono">{d.lo >= 120 ? '120 이상' : `${d.lo}~${d.lo + BIN - 1}`}</span> cycle
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      <span className="mono">{d.n}</span>대
                    </div>
                  </div>
                )
              }}
            />
            <Bar dataKey="n" radius={[3, 3, 0, 0]} animationDuration={600}>
              {data.map((d) => (
                <Cell key={d.lo} fill={color(d.lo)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex flex-row items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--status-critical)' }} />위험 (≤{dangerN})</span>
        <span className="flex flex-row items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--status-warning)' }} />주의 (&lt;{WARN_N})</span>
        <span className="flex flex-row items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--status-good)' }} />정상</span>
      </div>
    </div>
  )
}

/** 점검 예상 모듈 — 위험·주의 엔진에서 센서가 가장 크게 변한 부품 묶음의 분포 (부품·인력 준비용) */
export function ModuleBars({ engines }: { engines: FleetEngine[] }) {
  const data = useMemo(() => {
    const m = new Map<string, number>()
    let base = 0
    for (const e of engines) {
      if (e.level === 'ok') continue
      base++
      if (e.topPart) m.set(e.topPart.id, (m.get(e.topPart.id) ?? 0) + 1)
    }
    return { base, rows: [...m].map(([id, n]) => ({ id, name: PART_LABEL[id], n })).sort((a, b) => b.n - a.n) }
  }, [engines])
  const top = data.rows[0]?.n ?? 1
  return (
    <div className="flex flex-col gap-3">
      {data.rows.map((r) => (
        <div key={r.id} className="grid grid-cols-[132px_1fr_34px] items-center gap-3 text-[12.5px]">
          <span style={{ color: 'var(--text-secondary)' }}>{r.name}</span>
          <div className="h-2.5" style={{ background: 'var(--surface-2)', borderRadius: 3 }}>
            <div className="h-full" style={{ width: `${(r.n / top) * 100}%`, background: 'var(--accent)', borderRadius: 3, transition: 'width .6s ease' }} />
          </div>
          <span className="mono text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{r.n}</span>
        </div>
      ))}
      <p className="m-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        위험·주의 엔진 {data.base}대 중 뚜렷한 변화가 있는 {data.rows.reduce((s, r) => s + r.n, 0)}대 기준 · 가장 크게 변한 센서가 속한 모듈(추정)
      </p>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ScatterChart,
  Scatter,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Panel } from '../components/Panel'
import { StatTile } from '../components/StatTile'
import { analysisExtras } from '../data/analysisExtras'

interface Opt {
  id: string
  method: 'GRU' | 'RF'
  kind: 'n' | 'p'
  setting: number
  tag: string
  tp: number
  fn: number
  fp: number
  cost15: number
  cost12: number
  fail: number
  wasted: number
}
interface GruRow {
  n: number
  tp: number
  fn: number
  fp: number
  cost15: number
  cost12: number
  fail: number
  wasted: number
}
interface RfRow {
  p: number
  tp: number
  fn: number
  fp: number
}

const policy = analysisExtras.policy as unknown as {
  testN: { danger: number; safe: number }
  options: Opt[]
  gruSweep: GruRow[]
  rfSweep: RfRow[]
  danger: number
}

const TAG: Record<string, string> = {
  cost: '비용 최우선',
  balanced: '절충',
  safety: '안전 최우선',
  'rf-current': 'RF 현재 설정',
  'rf-zero-miss': 'RF 놓침 0 (최대 기준)',
}

// 가상 항공사 (발표 4b 슬라이드). 안전 하한 값은 결과를 본 뒤 정한 시나리오상 가정이다.
const PERSONAS = {
  A: {
    name: 'A 항공사',
    goal: '비용 최우선',
    desc: '총 정비 비용 최소 · 주간 계획, 정비 준비 7일 이상',
    limit: '정비 전 고장 엔진 1% 이하',
    ok: (o: Opt) => o.fail <= 0.01,
  },
  B: {
    name: 'B 항공사',
    goal: '안전 최우선',
    desc: '위험 엔진을 놓치지 않기 · 조기 정비 비용은 감수',
    limit: '공식 test 놓침 0대',
    ok: (o: Opt) => o.fn === 0,
  },
} as const
type PersonaId = keyof typeof PERSONAS

const RATIOS = {
  '1:5': { label: '비용비 1:5', cite: 'de Pater 외 2022' },
  '1:2': { label: '비용비 1:2', cite: 'Lee & Mitici 2023' },
} as const
type Ratio = keyof typeof RATIOS

const settingText = (o: Opt) => (o.kind === 'n' ? `예측 RUL ≤ ${o.setting}` : `위험 확률 ≥ ${o.setting.toFixed(2)}`)
const fmtPct = (v: number) => (v === 0 ? '0%' : `${(v * 100).toFixed(2)}%`)
const costOf = (o: { cost15: number; cost12: number }, r: Ratio) => (r === '1:5' ? o.cost15 : o.cost12)

const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }

function Marker({ cx, cy, label, color }: { cx?: number; cy?: number; label: string; color: string }) {
  if (cx == null || cy == null) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={color} stroke="var(--surface-1)" strokeWidth={2} />
      <text x={cx} y={cy + 4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff">
        {label}
      </text>
    </g>
  )
}

function TradeoffChart({ n }: { n: number }) {
  const lim = 30
  const gru = policy.gruSweep.filter((r) => r.fn <= lim && r.fp <= lim).map((r) => ({ fp: r.fp, fn: r.fn, label: `GRU ≤ ${r.n}` }))
  const rf = policy.rfSweep.filter((r) => r.fn <= lim && r.fp <= lim).map((r) => ({ fp: r.fp, fn: r.fn, label: `RF ≥ ${r.p.toFixed(2)}` }))
  gru.sort((a, b) => a.fp - b.fp || b.fn - a.fn)
  rf.sort((a, b) => a.fp - b.fp || b.fn - a.fn)
  const sel = policy.gruSweep.find((r) => r.n === n)!
  const marks = policy.options.map((o) => ({ fp: o.fp, fn: o.fn, id: o.id, color: o.method === 'GRU' ? 'var(--accent)' : 'var(--series-2)' }))
  return (
    <div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 16, bottom: 28, left: 0 }}>
            <CartesianGrid stroke="var(--gridline)" />
            <XAxis
              type="number"
              dataKey="fp"
              domain={[0, lim]}
              allowDataOverflow
              tick={AXIS_TICK}
              axisLine={{ stroke: 'var(--axis)' }}
              tickLine={false}
              label={{ value: '헛경보 (대) — 안전한 엔진을 위험으로 오판', position: 'insideBottom', offset: -14, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="fn"
              domain={[0, lim]}
              allowDataOverflow
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={46}
              label={{ value: '놓침 (대)', angle: -90, position: 'insideLeft', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--axis)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as { label?: string; id?: string; fp: number; fn: number }
                return (
                  <div
                    className="border px-3 py-2 text-[12px]"
                    style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
                  >
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.id ? `${d.id}안` : d.label}</div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      놓침 <span className="mono">{d.fn}</span> · 헛경보 <span className="mono">{d.fp}</span>
                    </div>
                  </div>
                )
              }}
            />
            <Scatter data={rf} fill="var(--series-2)" line={{ stroke: 'var(--series-2)', strokeWidth: 2 }} shape="circle" isAnimationActive={false} />
            <Scatter data={gru} fill="var(--accent)" line={{ stroke: 'var(--accent)', strokeWidth: 2 }} shape="circle" isAnimationActive={false} />
            <Scatter
              data={[{ fp: sel.fp, fn: sel.fn, label: `슬라이더 N=${n}` }]}
              shape={(p: { cx?: number; cy?: number }) =>
                p.cx == null || p.cy == null ? <g /> : <circle cx={p.cx} cy={p.cy} r={9} fill="none" stroke="var(--text-primary)" strokeWidth={2} />
              }
              isAnimationActive={false}
            />
            {marks.map((m) => (
              <Scatter
                key={m.id}
                data={[m]}
                shape={(p: { cx?: number; cy?: number }) => <Marker cx={p.cx} cy={p.cy} label={m.id} color={m.color} />}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex flex-row items-center gap-1.5">
          <span className="inline-block h-[2px] w-4" style={{ background: 'var(--accent)' }} />
          GRU (기준 N을 바꿈)
        </span>
        <span className="flex flex-row items-center gap-1.5">
          <span className="inline-block h-[2px] w-4" style={{ background: 'var(--series-2)' }} />
          RF 분류 (확률 기준을 바꿈)
        </span>
        <span>원 안의 문자 = 5가지 안 · 아래·왼쪽일수록 좋음 · 놓침·헛경보 30대 이하만 표시</span>
      </div>
    </div>
  )
}

function CostChart({ n, ratio }: { n: number; ratio: Ratio }) {
  const data = policy.gruSweep.map((r) => ({ n: r.n, cost: costOf(r, ratio), fail: +(r.fail * 100).toFixed(2) }))
  return (
    <div>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 8, bottom: 28, left: -6 }}>
            <CartesianGrid stroke="var(--gridline)" vertical={false} />
            <XAxis
              dataKey="n"
              type="number"
              domain={[20, 80]}
              ticks={[20, 30, 40, 50, 60, 70, 80]}
              tick={AXIS_TICK}
              axisLine={{ stroke: 'var(--axis)' }}
              tickLine={false}
              label={{ value: 'GRU 경보 기준 N (예측 남은 수명 ≤ N이면 경보)', position: 'insideBottom', offset: -14, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              yAxisId="cost"
              domain={[4, 8]}
              allowDataOverflow
              tick={AXIS_TICK}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <YAxis yAxisId="fail" orientation="right" domain={[0, 40]} allowDataOverflow tick={AXIS_TICK} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              cursor={{ stroke: 'var(--axis)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as { n: number; cost: number; fail: number }
                return (
                  <div
                    className="border px-3 py-2 text-[12px]"
                    style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
                  >
                    <div className="mono" style={{ color: 'var(--text-muted)' }}>N ≤ {d.n}</div>
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      정비 비용 <span className="mono">{d.cost}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      정비 전 고장 <span className="mono">{d.fail}%</span>
                    </div>
                  </div>
                )
              }}
            />
            <Area yAxisId="fail" type="monotone" dataKey="fail" stroke="var(--status-critical)" strokeWidth={1.5} fill="var(--status-critical)" fillOpacity={0.12} isAnimationActive={false} />
            <Line yAxisId="cost" type="monotone" dataKey="cost" stroke="var(--accent)" strokeWidth={2.5} dot={false} isAnimationActive={false} />
            <ReferenceLine yAxisId="cost" x={n} stroke="var(--text-primary)" strokeDasharray="4 3" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <span className="flex flex-row items-center gap-1.5">
          <span className="inline-block h-[2px] w-4" style={{ background: 'var(--accent)' }} />
          정비 비용 (운행 1,000사이클당, 왼쪽 축 · 4~8만 표시)
        </span>
        <span className="flex flex-row items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5" style={{ background: 'color-mix(in oklab, var(--status-critical) 30%, transparent)' }} />
          정비 전 고장률 (오른쪽 축)
        </span>
      </div>
    </div>
  )
}

export function Policy() {
  const [persona, setPersona] = useState<PersonaId>('A')
  const [ratio, setRatio] = useState<Ratio>('1:5')
  const [n, setN] = useState(policy.danger)

  const p = PERSONAS[persona]
  const base = policy.options[0]
  const pick = useMemo(() => {
    const ok = policy.options.filter(p.ok)
    return ok.length ? ok.reduce((a, b) => (costOf(b, ratio) < costOf(a, ratio) ? b : a)) : null
  }, [p, ratio])
  const sel = policy.gruSweep.find((r) => r.n === n)!

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em]">경보 기준</h1>
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          공식 test 위험 {policy.testN.danger}대 · 안전 {policy.testN.safe}대 · 가상 항공사 시나리오
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(Object.keys(PERSONAS) as PersonaId[]).map((id) => {
          const x = PERSONAS[id]
          const active = persona === id
          return (
            <button
              key={id}
              onClick={() => setPersona(id)}
              className="surface-card flex flex-col gap-2 border p-5 text-left"
              style={{
                background: active ? 'var(--accent-dim)' : 'var(--surface-1)',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
              }}
            >
              <div className="flex flex-row items-center justify-between">
                <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {x.name}
                </span>
                <span
                  className="px-2.5 py-1 text-[11.5px] font-semibold"
                  style={{ background: active ? 'var(--accent)' : 'var(--surface-2)', color: active ? 'var(--accent-ink)' : 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}
                >
                  {x.goal}
                </span>
              </div>
              <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{x.desc}</span>
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                안전 하한(가정) · {x.limit}
              </span>
            </button>
          )
        })}
      </div>

      <Panel
        title="경보 기준 5가지 안 비교"
        sub="기준을 올릴수록 놓침은 줄고 헛경보와 비용은 늘어납니다"
        action={
          <div className="flex flex-row gap-1.5">
            {(Object.keys(RATIOS) as Ratio[]).map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                title={RATIOS[r].cite}
                className="border px-3 py-1 text-[12px]"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  borderColor: ratio === r ? 'var(--accent)' : 'var(--border)',
                  background: ratio === r ? 'var(--accent-dim)' : 'transparent',
                  color: ratio === r ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {RATIOS[r].label}
              </button>
            ))}
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                {['안', '경보 기준', '놓침', '헛경보', '정비 전 고장', '정비 비용', '평균 낭비', `${p.name} 판정`].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b px-3 py-2.5 text-left text-[11.5px] font-semibold" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {policy.options.map((o) => {
                const ok = p.ok(o)
                const chosen = pick?.id === o.id
                const cost = costOf(o, ratio)
                // 화면에 보이는 비용(소수 둘째 자리)끼리 비교해서 표의 숫자와 증가율이 서로 맞게 한다
                const extra = (Number(cost.toFixed(2)) / Number(costOf(base, ratio).toFixed(2)) - 1) * 100
                const cell = { borderBottom: '1px solid var(--border-soft)' }
                return (
                  <tr key={o.id} style={{ background: chosen ? 'var(--accent-dim)' : undefined }}>
                    <td className="px-3 py-3.5" style={cell}>
                      <span
                        className="mono flex h-6 w-6 items-center justify-center text-[12px] font-bold"
                        style={{ background: o.method === 'GRU' ? 'var(--accent)' : 'var(--series-2)', color: '#fff', borderRadius: 'var(--radius-pill)' }}
                      >
                        {o.id}
                      </span>
                    </td>
                    <td className="px-3 py-3.5" style={cell}>
                      <div className="mono text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                        {o.method} {settingText(o)}
                      </div>
                      <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{TAG[o.tag]}</div>
                    </td>
                    <td className="mono px-3 py-3.5 text-[13px]" style={{ ...cell, color: o.fn === 0 ? 'var(--status-good)' : 'var(--text-primary)' }}>{o.fn}대</td>
                    <td className="mono px-3 py-3.5 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>{o.fp}대</td>
                    <td className="mono px-3 py-3.5 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>{fmtPct(o.fail)}</td>
                    <td className="mono px-3 py-3.5 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>
                      {cost.toFixed(2)}
                      <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{o.id === base.id ? '' : `+${extra.toFixed(1)}%`}</span>
                    </td>
                    <td className="mono px-3 py-3.5 text-[13px]" style={{ ...cell, color: 'var(--text-secondary)' }}>{o.wasted.toFixed(0)} cycle</td>
                    <td className="px-3 py-3.5" style={cell}>
                      {chosen ? (
                        <span className="px-2.5 py-1 text-[11.5px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 'var(--radius-pill)' }}>
                          추천
                        </span>
                      ) : ok ? (
                        <span className="text-[12px]" style={{ color: 'var(--status-good)' }}>하한 충족</span>
                      ) : (
                        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>하한 미달</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mb-0 mt-3 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {pick ? (
            <>
              <b>{p.name}</b>의 안전 하한(<span>{p.limit}</span>)을 만족하는 안 중 비용이 가장 낮은 것은 <b>{pick.id}안</b>(
              {pick.method} {settingText(pick)}, 비용 {costOf(pick, ratio).toFixed(2)})입니다.
            </>
          ) : (
            '안전 하한을 만족하는 안이 없습니다.'
          )}
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label={`슬라이더 · GRU 예측 RUL ≤ ${n}`} value={n} suffix="cycle" foot="아래 슬라이더로 기준을 바꿔 보세요" />
        <StatTile label="놓침" value={sel.fn} suffix="대" delay={0.05} foot={`위험 ${policy.testN.danger}대 중`} />
        <StatTile label="헛경보" value={sel.fp} suffix="대" delay={0.1} foot={`안전 ${policy.testN.safe}대 중`} />
        <StatTile
          label={`정비 비용 (${RATIOS[ratio].label})`}
          value={costOf(sel, ratio)}
          decimals={2}
          delay={0.15}
          foot={`정비 전 고장 ${fmtPct(sel.fail)} · 낭비 ${sel.wasted.toFixed(0)} cycle`}
        />
      </div>

      <div className="surface-card flex flex-col gap-2 border px-6 py-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <div className="flex flex-row items-center justify-between text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          <span>GRU 경보 기준 N</span>
          <span className="mono font-semibold" style={{ color: 'var(--text-primary)' }}>예측 RUL ≤ {n}</span>
        </div>
        <input type="range" className="range-input" min={20} max={80} step={1} value={n} onChange={(e) => setN(Number(e.target.value))} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="놓침 ↔ 헛경보 트레이드오프" sub="같은 헛경보 수에서 GRU가 더 적게 놓칩니다 (공식 test)">
          <TradeoffChart n={n} />
        </Panel>
        <Panel title="경보 기준에 따른 정비 비용" sub="비용이 가장 낮은 곳은 N=40 부근입니다 (validation 49대 정비 시뮬레이션)">
          <CostChart n={n} ratio={ratio} />
        </Panel>
      </div>

      <motion.p className="m-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        ※ 놓침·헛경보는 공식 test, 정비 전 고장·비용·낭비는 validation 49대 정비 시뮬레이션입니다. 비용은 운행 1,000사이클당(계획 정비 1회 = 1),
        낭비는 정비 시점에 아직 남아 있던 평균 수명입니다. 비용비 1:5는 de Pater 외(2022), 1:2는 Lee &amp; Mitici(2023)의 가정이며, 가상 항공사와
        안전 하한은 팀이 정한 시나리오입니다. 실제 운영에서는 고객이 정합니다.
      </motion.p>
    </div>
  )
}

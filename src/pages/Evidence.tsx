import { useState } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  LabelList,
  ScatterChart,
  Scatter,
  LineChart,
  Line,
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
import { dataMeta } from '../data/mock'
import { logRows } from '../data/detectionLog'

interface Model {
  name: string
  type: string
  valMae: number
  valRmse: number
  testMae: number
  testRmse: number
  testNasa: number
  valMiss: number
  valFalse: number
  testTp: number
  testFn: number
  testFp: number
  bestN15: number
  bestCost15: number
  costAt40_15: number
  failAt40: number
  bestN12: number
  bestCost12: number
}
interface Wilson {
  recall: [number, [number, number]]
  precision: [number, [number, number]]
}
interface Cls {
  model: string
  test_TP: number
  test_FN: number
  test_FP: number
  val_F1: number
  wilson: Wilson | null
}
interface CurvePt {
  n: number
  cost: number
  fail: number
}
interface TcSummary {
  model: string
  ratio: string
  bestN: number
  bestCost: number
  within5pct: string
  n30FailRate: number
  n30ExtraPct: number
  n40FailRate: number
  n40ExtraPct: number
}
interface SeedRow {
  model: string
  seed: number
  mae: number
  rmse: number
  nasa: number
}

const x = analysisExtras as unknown as {
  models: Model[]
  maeMissCorr: number
  thresholdCurves: Record<string, Record<string, CurvePt[]>>
  thresholdSummary: TcSummary[]
  classification: Cls[]
  uncertainty: {
    validation: {
      engines: number
      F1_bootstrap_95: Record<string, [number, [number, number]]>
      F1_diff_GRU_minus_RF_95: [number, [number, number]]
      share_of_resamples_GRU_better: number
      engines_with_any_false_alarm_in_safe_zone: Record<string, number>
    }
    bootstrap: { resamples: number }
  }
  seeds: SeedRow[]
}

const TABS = [
  { id: 'models', label: '모델 비교' },
  { id: 'threshold', label: '위험 기준 40' },
  { id: 'trust', label: '신뢰구간·재현성' },
  { id: 'limits', label: '한계' },
] as const
type TabId = (typeof TABS)[number]['id']

const short = (name: string) => name.replace(/\s*\(.*?\)\s*/g, '').trim()
const colorOf = (name: string) =>
  name.startsWith('GRU')
    ? 'var(--accent)'
    : name.startsWith('LSTM')
      ? 'var(--series-3)'
      : name.startsWith('RandomForest')
        ? 'var(--series-2)'
        : name.startsWith('베이스라인')
          ? 'var(--text-muted)'
          : 'color-mix(in oklab, var(--text-muted) 60%, transparent)'
const AXIS_TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }

const tipBox = {
  background: 'var(--surface-raised)',
  borderColor: 'var(--border-strong)',
  borderRadius: 'var(--radius-xs)',
}

function ModelsTab() {
  const models = x.models
  const bars = models.map((m) => ({ name: short(m.name), full: m.name, mae: m.testMae }))
  const pts = models
    .filter((m) => m.type !== '기준')
    .map((m) => ({ name: short(m.name), full: m.name, mae: m.valMae, miss: +(m.valMiss * 100).toFixed(1) }))
  const showLabel = new Set(['GRU', 'LSTM', 'Ridge'])
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel title="공식 test 평균 오차 (MAE)" sub="후보 8종 + 센서를 쓰지 않는 기준 모델 · 낮을수록 좋음 (cycle)">
          <div className="h-[330px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }} barCategoryGap={6}>
                <CartesianGrid stroke="var(--gridline)" horizontal={false} />
                <XAxis type="number" tick={AXIS_TICK} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
                <YAxis type="category" dataKey="name" width={118} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'var(--border-soft)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as { full: string; mae: number }
                    return (
                      <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.full}</div>
                        <div style={{ color: 'var(--text-muted)' }}>test MAE <span className="mono">{d.mae}</span></div>
                      </div>
                    )
                  }}
                />
                <Bar dataKey="mae" radius={[0, 3, 3, 0]} animationDuration={700}>
                  {bars.map((b) => (
                    <Cell key={b.full} fill={colorOf(b.full)} />
                  ))}
                  <LabelList dataKey="mae" position="right" style={{ fill: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title={x.maeMissCorr >= 0.5 ? '오차가 작은 모델일수록 미탐도 낮다' : '평균 오차와 미탐율'} sub={`validation 49대 · 평균 오차(MAE) vs 미탐율 · 상관 r = ${x.maeMissCorr}`}>
          <div className="h-[330px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 14, right: 24, bottom: 30, left: 0 }}>
                <CartesianGrid stroke="var(--gridline)" />
                <XAxis
                  type="number"
                  dataKey="mae"
                  domain={[6, 15]}
                  tick={AXIS_TICK}
                  axisLine={{ stroke: 'var(--axis)' }}
                  tickLine={false}
                  label={{ value: 'validation MAE (cycle)', position: 'insideBottom', offset: -14, fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="miss"
                  domain={[0, 45]}
                  tick={AXIS_TICK}
                  axisLine={false}
                  tickLine={false}
                  width={46}
                  tickFormatter={(v) => `${v}%`}
                  label={{ value: '미탐율', angle: -90, position: 'insideLeft', offset: -2, fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: '3 3', stroke: 'var(--axis)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload as { full: string; mae: number; miss: number }
                    return (
                      <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                        <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.full}</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          MAE <span className="mono">{d.mae}</span> · 미탐 <span className="mono">{d.miss}%</span>
                        </div>
                      </div>
                    )
                  }}
                />
                <Scatter data={pts} isAnimationActive={false}>
                  {pts.map((p) => (
                    <Cell key={p.full} fill={colorOf(p.full)} />
                  ))}
                  <LabelList
                    dataKey="name"
                    position="top"
                    formatter={(v: unknown) => (showLabel.has(String(v)) ? String(v) : '')}
                    style={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                  />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="후보 모델 전체 비교" sub="공식 test 248대 · 정비 비용은 각 모델의 최적 경보 기준에서 (운행 1,000사이클당, 비용비 1:5)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr>
                {['모델', '유형', 'MAE', 'RMSE', 'NASA 점수', '탐지·놓침·헛경보', '최적 N', '정비 비용'].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b px-3 py-2.5 text-left text-[11.5px] font-semibold" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {x.models.map((m) => {
                const gru = m.name.startsWith('GRU')
                const cell = { borderBottom: '1px solid var(--border-soft)' }
                return (
                  <tr key={m.name} style={{ background: gru ? 'var(--accent-dim)' : undefined }}>
                    <td className="px-3 py-3 text-[13px] font-medium" style={{ ...cell, color: 'var(--text-primary)' }}>
                      <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colorOf(m.name) }} />
                      {short(m.name)}
                      {gru && <span className="ml-2 text-[11px]" style={{ color: 'var(--accent)' }}>최종</span>}
                    </td>
                    <td className="px-3 py-3 text-[12px]" style={{ ...cell, color: 'var(--text-muted)' }}>{m.type}</td>
                    <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>{m.testMae.toFixed(2)}</td>
                    <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-secondary)' }}>{m.testRmse.toFixed(2)}</td>
                    <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-secondary)' }}>{Math.round(m.testNasa).toLocaleString()}</td>
                    <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-secondary)' }}>{m.testTp} · {m.testFn} · {m.testFp}</td>
                    <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-secondary)' }}>{m.bestN15}</td>
                    <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>{m.bestCost15.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

const DANGER = (analysisExtras.policy as unknown as { danger: number }).danger

function ThresholdTab() {
  const [ratio, setRatio] = useState<'1:5' | '1:2'>('1:5')
  const gru = x.thresholdCurves['GRU (04번)'][ratio]
  const rf = x.thresholdCurves['RandomForest (03번)'][ratio]
  const ns = Array.from(new Set([...gru.map((p) => p.n), ...rf.map((p) => p.n)])).sort((a, b) => a - b)
  const data = ns.map((n) => ({ n, gru: gru.find((p) => p.n === n)?.cost, rf: rf.find((p) => p.n === n)?.cost }))
  const sums = x.thresholdSummary.filter((s) => s.ratio === ratio)
  const g = sums.find((s) => s.model.startsWith('GRU'))!
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="비용이 가장 낮은 기준 N (GRU)" value={g.bestN} suffix="cycle" foot={`정비 비용 ${g.bestCost.toFixed(2)} · 비용비 ${ratio}`} />
        <StatTile label={`N=${g.bestN} 정비 전 고장률`} value={g.n40FailRate * 100} decimals={1} suffix="%" delay={0.05} foot="validation 49대 정비 시뮬레이션" />
        <StatTile label="N=30으로 낮추면 고장률" value={g.n30FailRate * 100} decimals={1} suffix="%" delay={0.1} foot="너무 늦게 울려 정비가 못 따라감" />
        <StatTile label="N=30 추가 비용" value={g.n30ExtraPct} decimals={1} suffix="%" delay={0.15} foot="N=40 대비" />
      </div>
      <Panel
        title="경보 기준 N에 따른 정비 비용"
        sub={`위험 기준 ${DANGER}은 이 곡선의 최저점 · 비용 4~8 구간만 표시 (비용 계산은 논문 운영 조건 가정)`}
        action={
          <div className="flex flex-row gap-1.5">
            {(['1:5', '1:2'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRatio(r)}
                className="border px-3 py-1 text-[12px]"
                style={{
                  borderRadius: 'var(--radius-pill)',
                  borderColor: ratio === r ? 'var(--accent)' : 'var(--border)',
                  background: ratio === r ? 'var(--accent-dim)' : 'transparent',
                  color: ratio === r ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                비용비 {r}
              </button>
            ))}
          </div>
        }
      >
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 16, bottom: 28, left: -6 }}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis
                dataKey="n"
                type="number"
                domain={[10, 80]}
                ticks={[10, 20, 30, 40, 50, 60, 70, 80]}
                tick={AXIS_TICK}
                axisLine={{ stroke: 'var(--axis)' }}
                tickLine={false}
                label={{ value: '경보 기준 N (예측 남은 수명 ≤ N이면 경보)', position: 'insideBottom', offset: -14, fill: 'var(--text-muted)', fontSize: 11 }}
              />
              <YAxis domain={[4, 8]} allowDataOverflow tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                cursor={{ stroke: 'var(--axis)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                      <div className="mono" style={{ color: 'var(--text-muted)' }}>N ≤ {label}</div>
                      {payload.map((p) => (
                        <div key={String(p.dataKey)} style={{ color: p.color }}>
                          {p.dataKey === 'gru' ? 'GRU' : 'RandomForest'} <span className="mono">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <ReferenceLine x={DANGER} stroke="var(--text-primary)" strokeDasharray="4 3" label={{ value: `위험 기준 ${DANGER}`, position: 'top', fill: 'var(--text-primary)', fontSize: 11, fontWeight: 600 }} />
              <Line type="monotone" dataKey="rf" stroke="var(--series-2)" strokeWidth={2} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
              <Line type="monotone" dataKey="gru" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 2.5 }} connectNulls isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex flex-row items-center gap-1.5">
            <span className="inline-block h-[2px] w-4" style={{ background: 'var(--accent)' }} />
            GRU
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <span className="inline-block h-[2px] w-4" style={{ background: 'var(--series-2)' }} />
            RandomForest
          </span>
          <span>비용 = 운행 1,000사이클당 (계획 정비 1회 = 1)</span>
        </div>
      </Panel>
      <Panel title="모델별 최적 기준 요약">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr>
                {['모델', '최적 N', '최저 비용', '비용 5% 이내 N 범위', 'N=30 고장률', 'N=40 추가 비용'].map((h) => (
                  <th key={h} className="whitespace-nowrap border-b px-3 py-2.5 text-left text-[11.5px] font-semibold" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sums.map((s) => (
                <tr key={s.model}>
                  {[short(s.model), s.bestN, s.bestCost.toFixed(2), s.within5pct, `${(s.n30FailRate * 100).toFixed(1)}%`, `+${s.n40ExtraPct.toFixed(1)}%`].map((v, i) => (
                    <td key={i} className={`px-3 py-3 text-[13px] ${i > 0 ? 'mono' : 'font-medium'}`} style={{ borderBottom: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function Forest({ title, sub, items }: { title: string; sub: string; items: { label: string; v: number; lo: number; hi: number; gru?: boolean }[] }) {
  const min = 0.3
  const max = 1
  const pos = (v: number) => `${((v - min) / (max - min)) * 100}%`
  return (
    <Panel title={title} sub={sub}>
      <div className="flex flex-col gap-3">
        {items.map((it) => (
          <div key={it.label} className="grid grid-cols-[120px_1fr_44px] items-center gap-3 sm:grid-cols-[250px_1fr_52px]">
            <span className="truncate text-[12px]" style={{ color: it.gru ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: it.gru ? 600 : 400 }} title={it.label}>
              {it.label}
            </span>
            <div className="relative h-5">
              <div className="absolute inset-x-0 top-1/2 h-px" style={{ background: 'var(--border)' }} />
              <div
                className="absolute top-1/2 h-[3px] -translate-y-1/2"
                style={{ left: pos(it.lo), width: `calc(${pos(it.hi)} - ${pos(it.lo)})`, background: it.gru ? 'var(--accent)' : 'var(--text-muted)', opacity: it.gru ? 1 : 0.55, borderRadius: 2 }}
              />
              <div
                className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ left: pos(it.v), background: it.gru ? 'var(--accent)' : 'var(--text-secondary)', border: '2px solid var(--surface-1)' }}
              />
            </div>
            <span className="mono text-right text-[12px]" style={{ color: 'var(--text-primary)' }}>{it.v.toFixed(2)}</span>
          </div>
        ))}
        <div className="grid grid-cols-[120px_1fr_44px] gap-3 sm:grid-cols-[250px_1fr_52px]">
          <span />
          <div className="mono relative h-4 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
            {[0.3, 0.5, 0.75, 1].map((t) => (
              <span key={t} className="absolute -translate-x-1/2" style={{ left: pos(t) }}>
                {t}
              </span>
            ))}
          </div>
          <span />
        </div>
      </div>
    </Panel>
  )
}

function TrustTab() {
  const cls = x.classification.filter((c) => c.wilson)
  const mk = (key: 'recall' | 'precision') =>
    cls.map((c) => ({
      label: c.model.replace('임곗값', '기준'),
      v: c.wilson![key][0],
      lo: c.wilson![key][1][0],
      hi: c.wilson![key][1][1],
      gru: c.model.startsWith('GRU'),
    }))
  const val = x.uncertainty.validation
  const gruF1 = val.F1_bootstrap_95['GRU 회귀→분류(예측 RUL≤40)']
  const rfF1 = val.F1_bootstrap_95['RandomForest 분류(임곗값 0.36)']
  const seeds = [42, 1, 2].map((s) => ({
    seed: `시드 ${s}`,
    GRU: x.seeds.find((r) => r.model === 'GRU' && r.seed === s)!.mae,
    LSTM: x.seeds.find((r) => r.model === 'LSTM' && r.seed === s)!.mae,
  }))
  const gruWorst = Math.max(...seeds.map((s) => s.GRU))
  const lstmBest = Math.min(...seeds.map((s) => s.LSTM))
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5">
        <Forest title="위험 탐지율(재현율) 95% 구간" sub="공식 test 위험 69대 · Wilson 구간 — 표본이 작아 구간이 넓습니다" items={mk('recall')} />
        <Forest title="경보 정밀도 95% 구간" sub="경보를 낸 엔진 중 실제로 위험했던 비율 (Wilson 구간)" items={mk('precision')} />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="GRU F1 (validation)" value={gruF1[0]} decimals={3} foot={`95% 구간 ${gruF1[1][0]}~${gruF1[1][1]}`} />
        <StatTile label="RF F1 (validation)" value={rfF1[0]} decimals={3} delay={0.05} foot={`95% 구간 ${rfF1[1][0]}~${rfF1[1][1]}`} />
        <StatTile
          label="F1 차이 (GRU − RF)"
          value={val.F1_diff_GRU_minus_RF_95[0]}
          decimals={3}
          delay={0.1}
          foot={`95% 구간 ${val.F1_diff_GRU_minus_RF_95[1][0]}~${val.F1_diff_GRU_minus_RF_95[1][1]}`}
        />
        <StatTile
          label="GRU가 더 나았던 재표본"
          value={val.share_of_resamples_GRU_better * 100}
          suffix="%"
          delay={0.15}
          foot={`엔진 ${val.engines}대 부트스트랩 ${x.uncertainty.bootstrap.resamples.toLocaleString()}회`}
        />
      </div>

      <Panel
        title={gruWorst < lstmBest ? '학습 시드를 바꿔도 GRU가 LSTM보다 낫다' : '학습 시드별 GRU와 LSTM 비교'}
        sub={`공식 test MAE · 같은 구조에서 시드만 다르게 ${seeds.length}회 · GRU 가장 나쁜 값 ${gruWorst} ${gruWorst < lstmBest ? '<' : '≥'} LSTM 가장 좋은 값 ${lstmBest}`}
      >
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={seeds} margin={{ top: 16, right: 16, bottom: 4, left: -8 }} barGap={4}>
              <CartesianGrid stroke="var(--gridline)" vertical={false} />
              <XAxis dataKey="seed" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
              <YAxis domain={[0, 24]} tick={AXIS_TICK} axisLine={false} tickLine={false} width={34} />
              <Tooltip
                cursor={{ fill: 'var(--border-soft)' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  return (
                    <div className="border px-3 py-2 text-[12px]" style={tipBox}>
                      <div style={{ color: 'var(--text-muted)' }}>{label}</div>
                      {payload.map((p) => (
                        <div key={String(p.dataKey)} style={{ color: p.color }}>
                          {String(p.dataKey)} MAE <span className="mono">{p.value}</span>
                        </div>
                      ))}
                    </div>
                  )
                }}
              />
              <Bar dataKey="GRU" fill="var(--accent)" radius={[3, 3, 0, 0]} animationDuration={700}>
                <LabelList dataKey="GRU" position="top" style={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              </Bar>
              <Bar dataKey="LSTM" fill="var(--series-3)" radius={[3, 3, 0, 0]} animationDuration={700}>
                <LabelList dataKey="LSTM" position="top" style={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: 'var(--font-mono)' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1 flex flex-row items-center gap-x-4 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex flex-row items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--accent)' }} />GRU (최종)</span>
          <span className="flex flex-row items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--series-3)' }} />LSTM</span>
        </div>
      </Panel>
    </div>
  )
}

function LimitsTab() {
  const tpRows = logRows.filter((r) => r.verdict === 'tp')
  const tpTransient = tpRows.filter((r) => r.transientDanger > 0).length
  const dangerN = (analysisExtras.policy as unknown as { testN: { danger: number } }).testN.danger
  const items = [
    { t: '시뮬레이션 데이터', d: `${dataMeta.dataset}(NASA C-MAPSS)는 터보팬 열화 시뮬레이션입니다. 실제 항공기 센서값이 아니라, 실제 현장보다 쉬운 문제일 수 있습니다.` },
    { t: '비용·정비 시간은 가정', d: '데이터에 비용과 정비 시간이 없어서 논문 운영 조건(비용비 1:5·1:2, 정비 준비 7일)으로 시뮬레이션했습니다. 금액 수치는 방향을 보는 용도입니다.' },
    { t: '작은 표본', d: `공식 test 위험 엔진이 ${dangerN}대라 탐지율·정밀도의 95% 구간이 넓습니다. 모델 간 작은 차이는 우연일 수 있습니다.` },
    { t: '학습 무작위성', d: '같은 구조도 학습 시드에 따라 MAE가 달라집니다. 그래서 GRU와 LSTM은 시드 3회로 비교했습니다.' },
    { t: '엔진별 시간축', d: '엔진마다 자기만의 사이클을 가집니다. 서로 다른 엔진의 경보를 하나의 시계로 줄 세울 수 없습니다.' },
    { t: '고장 부품은 추정', d: 'FD004에는 엔진별 고장 모드 정답이 없어, 고장 진단 화면의 부품은 "가장 크게 변한 센서가 속한 부품"일 뿐 원인 판정이 아닙니다.' },
    { t: '일시 경보', d: `예측이 중간에 기준을 넘었다가 돌아오는 일이 있습니다. 탐지로 분류된 엔진 ${tpRows.length}대 중 ${tpTransient}대가 일시 경보를 겪었고, 탐지 이력 화면에 따로 셉니다.` },
    { t: '즉시 안전 경보는 별개', d: '이 도구는 비행 후 데이터로 몇 주 단위 정비 계획을 돕는 용도입니다. 비행 중 즉시 경보는 별도 시스템의 몫입니다.' },
  ]
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {items.map((it, i) => (
        <div key={it.t} className="surface-card flex flex-row gap-4 border p-5" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <span className="mono text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>{String(i + 1).padStart(2, '0')}</span>
          <div>
            <p className="m-0 text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{it.t}</p>
            <p className="m-0 mt-1 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{it.d}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Evidence() {
  const [tab, setTab] = useState<TabId>('models')
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em]">모델 · 근거</h1>
        <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          최종 모델 GRU를 고른 근거 · 숫자는 모두 분석 저장소 결과 파일에서 옵니다
        </span>
      </div>
      <div className="flex flex-row gap-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn shrink-0 ${tab === t.id ? 'is-active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'models' && <ModelsTab />}
      {tab === 'threshold' && <ThresholdTab />}
      {tab === 'trust' && <TrustTab />}
      {tab === 'limits' && <LimitsTab />}
    </div>
  )
}

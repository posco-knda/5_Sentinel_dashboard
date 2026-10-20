import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useCurves } from '../../lib/curves'
import { best, buildLives, runPeriodic, runPredictive, runReactive, sweep, type Summary } from '../../lib/policy'
import { useSettings } from '../../lib/settings'
import { FlyLoading } from '../FlyLoading'
import { Panel } from '../Panel'

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }
const INTERVALS = Array.from({ length: 65 }, (_, i) => 80 + i * 5)
const SAFETIES = Array.from({ length: 41 }, (_, i) => i * 2)
const eok = (v: number) => `${v.toFixed(1)}억`
const eokTotal = (v: number) => `${Math.round(v).toLocaleString()}억`

function Card({ title, sub, s, base, hi, note }: { title: string; sub: string; s: Summary; base: Summary; hi?: boolean; note?: string }) {
  const save = base.cost > 0 ? ((base.cost - s.cost) / base.cost) * 100 : 0
  return (
    <div className="flex flex-col gap-2.5 border p-4" style={{ background: hi ? 'color-mix(in oklab, var(--accent) 7%, var(--surface-1))' : 'var(--surface-1)', borderColor: hi ? 'color-mix(in oklab, var(--accent) 55%, var(--border))' : 'var(--border)', borderRadius: 'var(--radius-xs)' }}>
      <div>
        <div className="text-[14px] font-semibold" style={{ color: hi ? 'var(--accent)' : 'var(--text-primary)' }}>{title}</div>
        <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{sub}</div>
      </div>
      <div>
        <span className="mono text-[28px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{eok(s.perEngine)}</span>
        <span className="ml-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>/ 엔진 1대</span>
      </div>
      <dl className="m-0 flex flex-col gap-1 text-[12.5px]">
        <div className="flex flex-row justify-between">
          <dt style={{ color: 'var(--text-muted)' }}>고장 난 엔진</dt>
          <dd className="m-0 mono font-semibold" style={{ color: s.failures ? 'var(--status-critical)' : 'var(--status-good)' }}>{s.failures} / {s.n}대</dd>
        </div>
        <div className="flex flex-row justify-between">
          <dt style={{ color: 'var(--text-muted)' }}>남기고 교체한 수명(평균)</dt>
          <dd className="m-0 mono font-semibold">{s.avgWasted ? `${Math.round(s.avgWasted)} cycle` : '—'}</dd>
        </div>
        <div className="flex flex-row justify-between">
          <dt style={{ color: 'var(--text-muted)' }}>전체 비용</dt>
          <dd className="m-0 mono font-semibold">{eokTotal(s.cost)}</dd>
        </div>
      </dl>
      <div className="text-[12.5px] font-semibold" style={{ color: save > 0.05 ? 'var(--status-good)' : 'var(--text-muted)' }}>
        {save > 0.05 ? `사후 정비보다 ${save.toFixed(0)}% 절감` : '비교 기준'}
      </div>
      {note && <div className="text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>{note}</div>}
    </div>
  )
}

/** 절감 효과 한눈에 — 예측 정비가 다른 방식보다 얼마나 아끼는지 큰 숫자와 막대로 보여 준다 */
function SavingsHero({ react, per, pre }: { react: Summary; per: Summary; pre: Summary }) {
  const saved = react.cost - pre.cost
  const pct = react.cost > 0 ? (saved / react.cost) * 100 : 0
  const savedPer = per.cost - pre.cost
  const pctPer = per.cost > 0 ? (savedPer / per.cost) * 100 : 0
  const max = Math.max(react.perEngine, per.perEngine, pre.perEngine, 1)
  const bars = [
    { k: '사후 정비', s: react, c: 'var(--status-critical)' },
    { k: '정기 정비', s: per, c: 'var(--status-warning)' },
    { k: '예측 정비', s: pre, c: 'var(--status-good)' },
  ]
  return (
    <div className="mb-4 grid grid-cols-1 gap-5 border p-5 lg:grid-cols-[1.1fr_1fr]" style={{ background: 'linear-gradient(120deg, color-mix(in oklab, var(--status-good) 14%, var(--surface-1)), var(--surface-1))', borderColor: 'color-mix(in oklab, var(--status-good) 45%, var(--border))', borderRadius: 'var(--radius-sm)' }}>
      <div className="flex flex-col gap-3">
        <div className="text-[13px] font-semibold" style={{ color: 'var(--status-good)' }}>예측 정비로 얻는 절감 효과</div>
        <div className="flex flex-row flex-wrap items-end gap-x-5 gap-y-1">
          <div className="mono text-[56px] font-bold leading-none" style={{ color: 'var(--status-good)' }}>−{pct.toFixed(0)}%</div>
          <div className="pb-1">
            <div className="mono text-[26px] font-bold leading-none" style={{ color: 'var(--text-primary)' }}>{eokTotal(saved)} 절감</div>
            <div className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>사후 정비 대비 · 엔진 {pre.n}대 기준</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <div className="mono text-[22px] font-bold leading-tight" style={{ color: 'var(--status-good)' }}>{react.failures}→{pre.failures}건</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>고장 건수</div>
          </div>
          <div>
            <div className="mono text-[22px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>−{pctPer.toFixed(0)}%</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>정기 정비 대비 ({eokTotal(savedPer)})</div>
          </div>
          <div>
            <div className="mono text-[22px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{eok(react.perEngine - pre.perEngine)}</div>
            <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>엔진 1대당 절감</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center gap-2.5">
        {bars.map((b) => (
          <div key={b.k} className="flex flex-row items-center gap-3">
            <span className="w-[68px] shrink-0 text-[12.5px] font-medium" style={{ color: 'var(--text-secondary)' }}>{b.k}</span>
            <div className="relative h-[22px] flex-1" style={{ background: 'var(--surface-2)', borderRadius: 4 }}>
              <div className="h-full" style={{ width: `${(b.s.perEngine / max) * 100}%`, background: b.c, borderRadius: 4, transition: 'width .4s' }} />
              {b.k === '예측 정비' && b.s.perEngine < max && (
                <div className="absolute inset-y-0 border border-dashed" style={{ left: `${(b.s.perEngine / max) * 100}%`, width: `${((max - b.s.perEngine) / max) * 100}%`, borderColor: 'var(--status-good)', borderRadius: 4, background: 'color-mix(in oklab, var(--status-good) 12%, transparent)' }} />
              )}
            </div>
            <span className="mono w-[58px] shrink-0 text-right text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>{eok(b.s.perEngine)}</span>
          </div>
        ))}
        <div className="pl-[80px] text-[11px]" style={{ color: 'var(--text-muted)' }}>엔진 1대당 비용 · 점선 칸이 아낀 금액</div>
      </div>
    </div>
  )
}

function CostChart({ data, x, label, cur, bestV, unit }: { data: { v: number; y: number }[]; x: number; label: string; cur: number; bestV: { v: number; y: number }; unit: string }) {
  const curPt = data.find((d) => d.v === x) ?? data[0]
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-row items-baseline justify-between text-[12px]">
        <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ color: 'var(--text-muted)' }}>최저 {eok(bestV.y)} ({bestV.v}{unit})</span>
      </div>
      <div className="h-[170px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -10 }}>
            <CartesianGrid stroke="var(--gridline)" vertical={false} />
            <XAxis dataKey="v" type="number" domain={['dataMin', 'dataMax']} tick={TICK} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
            <YAxis tick={TICK} axisLine={false} tickLine={false} width={42} domain={['auto', 'auto']} tickFormatter={(v: number) => v.toFixed(0)} />
            <Tooltip
              cursor={{ stroke: 'var(--axis)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as { v: number; y: number }
                return (
                  <div className="border px-2.5 py-1.5 text-[12px]" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                    <span className="mono">{d.v}{unit}</span> · 엔진 1대당 <span className="mono font-semibold">{eok(d.y)}</span>
                  </div>
                )
              }}
            />
            <Line type="monotone" dataKey="y" stroke="var(--series-1)" strokeWidth={2} dot={false} isAnimationActive={false} />
            <ReferenceDot x={bestV.v} y={bestV.y} r={5} fill="var(--status-good)" stroke="var(--surface-1)" strokeWidth={2} />
            <ReferenceDot x={cur} y={curPt.y} r={5} fill="var(--accent)" stroke="var(--surface-1)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/**
 * 정비 방식 비교 — 같은 엔진들을 고장 날 때까지 운용했다고 보고,
 * 사후 정비(고장 후 처리) · 정기 정비(정해진 주기) · 예측 정비(예측 남은 수명 기준)의 비용을 비교한다.
 * 예측은 엔진별 실제 예측 곡선을, 정답은 시험 데이터의 실제 남은 수명을 쓴다. 정기 정비는 가장 유리한 주기를 찾아 보여 줘서 공정하게 겨룬다.
 */
export function PolicyCompare() {
  const curves = useCurves()
  const { settings } = useSettings()
  const b = settings.cost
  const prep = settings.prepDays * settings.cyclesPerDay
  const [safety, setSafety] = useState(20)
  const [interval, setInterval_] = useState<number | null>(null)

  const lives = useMemo(() => (curves ? buildLives(curves) : []), [curves])
  const perRows = useMemo(() => sweep(INTERVALS, (T) => runPeriodic(lives, T, b)), [lives, b])
  const preRows = useMemo(() => sweep(SAFETIES, (s) => runPredictive(lives, prep, s, b)), [lives, prep, b])

  if (!curves) return <Panel title="정비 방식 비교"><FlyLoading height="220px" /></Panel>
  if (!lives.length) return null

  const bestPer = best(perRows)
  const T = interval ?? bestPer.v
  const bestPre = best(preRows)
  const react = runReactive(lives, b)
  const per = perRows.find((r) => r.v === T)?.s ?? bestPer.s
  const pre = preRows.find((r) => r.v === safety)?.s ?? bestPre.s
  const perData = perRows.map((r) => ({ v: r.v, y: r.s.perEngine }))
  const preData = preRows.map((r) => ({ v: r.v, y: r.s.perEngine }))

  return (
    <Panel title="정비 방식 비교" sub={`경보 구간에 들어온 엔진 ${lives.length}대를 고장 날 때까지 운용했다고 보고, 정비 방식에 따른 비용을 비교합니다 · 단가는 설정의 비용 기준`}>
      <SavingsHero react={react} per={per} pre={pre} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Card title="사후 정비" sub="고장 난 뒤에 처리" s={react} base={react} note="고장 때문에 계획 정비보다 추가 비용이 모두 듭니다." />
        <Card title="정기 정비" sub={`${T} cycle마다 교체`} s={per} base={react} note={`가장 유리한 주기(${bestPer.v} cycle)를 골라도 수명이 짧은 엔진은 고장 나고, 긴 엔진은 아깝게 교체합니다.`} />
        <Card title="예측 정비 (Sentinel)" sub={`예측 수명 ${prep + safety} cycle 이하에서 요청`} s={pre} base={react} hi note={`준비 기간 ${prep} cycle + 안전 여유 ${safety} cycle. 엔진마다 상태에 맞춰 시점을 정합니다.`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex flex-row justify-between">
            <span>정기 정비 주기</span>
            <span className="mono font-semibold" style={{ color: 'var(--text-primary)' }}>{T} cycle{interval == null && ' (최적)'}</span>
          </span>
          <input type="range" min={INTERVALS[0]} max={INTERVALS[INTERVALS.length - 1]} step={5} value={T} onChange={(e) => setInterval_(Number(e.target.value))} style={{ accentColor: 'var(--accent)' }} />
        </label>
        <label className="flex flex-col gap-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="flex flex-row justify-between">
            <span>예측 정비 안전 여유</span>
            <span className="mono font-semibold" style={{ color: 'var(--text-primary)' }}>{safety} cycle (최적 {bestPre.v})</span>
          </span>
          <input type="range" min={0} max={80} step={2} value={safety} onChange={(e) => setSafety(Number(e.target.value))} style={{ accentColor: 'var(--accent)' }} />
        </label>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
        <CostChart data={perData} x={T} cur={T} bestV={{ v: bestPer.v, y: bestPer.s.perEngine }} label="정기 정비: 주기에 따른 1대당 비용" unit=" cycle" />
        <CostChart data={preData} x={safety} cur={safety} bestV={{ v: bestPre.v, y: bestPre.s.perEngine }} label="예측 정비: 안전 여유에 따른 1대당 비용" unit=" cycle" />
      </div>
      <p className="mb-0 mt-3 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        초록 점은 비용이 가장 낮은 값, 포인트 색 점은 지금 고른 값입니다. 정기 정비는 이 엔진들에 가장 잘 맞는 주기를 미리 알고 있다고 가정해서 유리하게 계산했습니다.
        경보 구간에 한 번도 들어오지 않은 엔진은 예측 곡선이 없어 포함하지 않았고, 비용은 가정값(설정의 비용 기준)에 따라 달라집니다.
      </p>
    </Panel>
  )
}

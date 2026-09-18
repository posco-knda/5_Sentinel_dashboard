import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { survivalCurve, predictedRulMileage } from '../data/mock'

const data = survivalCurve.map((d) => ({ ...d, band: [d.lower, d.upper] as [number, number] }))

function CurveTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div
      className="border px-3 py-2 text-[12px]"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
    >
      <div style={{ color: 'var(--text-muted)' }}>
        누적 마일리지 <span className="mono">+{label}km</span>
      </div>
      <div className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
        생존확률 <span className="mono">{(row.median * 100).toFixed(0)}%</span>
      </div>
      <div style={{ color: 'var(--text-muted)' }}>
        신뢰구간 <span className="mono">{(row.lower * 100).toFixed(0)}–{(row.upper * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

/** Weibull AFT 기반 워크롤 잔존 마일리지(RUL) 예측 곡선 — 생존확률(S(mileage))이 누적
 *  마일리지에 따라 감소하는 형태를 신뢰구간 밴드와 함께 시각화. km=0이 현재 시점이고,
 *  예측 중앙값(median RUL)에 기준선 표시. */
export function SurvivalCurveChart() {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="km"
            type="number"
            domain={[0, 140]}
            ticks={[0, 20, 40, 60, 80, 100, 120, 140]}
            tickFormatter={(d) => `+${d}`}
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--axis)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 1]}
            ticks={[0, 0.5, 1]}
            tickFormatter={(v) => `${v * 100}%`}
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <ReferenceLine
            x={predictedRulMileage.median}
            stroke="var(--status-warning)"
            strokeDasharray="4 3"
            label={{ value: `예측 RUL +${predictedRulMileage.median}km`, position: 'top', fill: 'var(--status-warning)', fontSize: 11, fontWeight: 600 }}
          />
          <Tooltip content={<CurveTooltip />} cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} />
          <Area
            dataKey="band"
            stroke="none"
            fill="var(--series-1)"
            fillOpacity={0.14}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="median"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: 'var(--surface-1)', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

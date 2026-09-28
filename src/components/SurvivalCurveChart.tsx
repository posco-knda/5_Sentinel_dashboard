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

interface SurvivalPoint {
  cycle: number
  median: number
  lower: number
  upper: number
}

function CurveTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div
      className="border px-3 py-2 text-[12px]"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
    >
      <div style={{ color: 'var(--text-muted)' }}>
        앞으로 <span className="mono">+{label} cycle</span> 더
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

/** 엔진 잔존수명(RUL) 생존곡선 — 지금 엔진 나이(사이클)에서 "앞으로 X 사이클 더 가동될 때까지
 *  아직 고장나지 않을 확률"을, train 100개 엔진의 실제 수명 분포에서 부트스트랩으로 추정한
 *  신뢰구간 밴드와 함께 시각화. cycle=0이 현재 시점이고, 모델이 예측한 RUL 중앙값에 기준선 표시. */
export function SurvivalCurveChart({ data, predictedRul }: { data: SurvivalPoint[]; predictedRul: { median: number; lower: number; upper: number } }) {
  const chartData = data.map((d) => ({ ...d, band: [d.lower, d.upper] as [number, number] }))
  const maxCycle = Math.max(...data.map((d) => d.cycle))

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 12, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="cycle"
            type="number"
            domain={[0, maxCycle]}
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
            x={predictedRul.median}
            stroke="var(--status-warning)"
            strokeDasharray="4 3"
            label={{ value: `예측 RUL +${predictedRul.median}cycle`, position: 'top', fill: 'var(--status-warning)', fontSize: 11, fontWeight: 600 }}
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

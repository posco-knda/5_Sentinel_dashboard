import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, ReferenceArea, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import type { FleetPoint } from '../../data/detectionLog'

const CAP = 125

const SERIES = [
  { level: 'ok', label: '정상', color: 'var(--status-good)' },
  { level: 'warn', label: '주의', color: 'var(--status-warning)' },
  { level: 'red', label: '위험', color: 'var(--status-critical)' },
] as const

/** 예측 vs 실제 남은 수명 산점도 — 점이 대각선(예측=실제)에 붙을수록 정확. 실제 남은 수명은 학습과 같이 125에서 자름. */
export function PredActualScatter({ points, danger }: { points: FleetPoint[]; danger: number }) {
  const data = points.map((p) => ({ ...p, x: Math.min(CAP, p.actual) }))
  return (
    <div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 12, bottom: 22, left: 0 }}>
            <CartesianGrid stroke="var(--gridline)" />
            <ReferenceArea x1={0} x2={danger} y1={0} y2={danger} fill="var(--status-critical)" fillOpacity={0.1} />
            <XAxis
              type="number"
              dataKey="x"
              name="실제"
              domain={[0, CAP]}
              ticks={[0, 40, 80, 125]}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={{ stroke: 'var(--axis)' }}
              tickLine={false}
              label={{ value: '실제 남은 수명 (cycle)', position: 'insideBottom', offset: -12, fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="pred"
              name="예측"
              domain={[0, CAP]}
              ticks={[0, 40, 80, 125]}
              tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
              width={34}
            />
            <ZAxis range={[34, 34]} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: CAP, y: CAP }]} stroke="var(--text-muted)" strokeDasharray="5 4" strokeWidth={1.5} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3', stroke: 'var(--axis)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as FleetPoint & { x: number }
                return (
                  <div
                    className="border px-3 py-2 text-[12px]"
                    style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
                  >
                    <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>엔진 #{d.unit}</div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      예측 <span className="mono">{d.pred}</span> · 실제 <span className="mono">{d.actual}</span>
                    </div>
                  </div>
                )
              }}
            />
            {SERIES.map((s) => (
              <Scatter
                key={s.level}
                data={data.filter((d) => d.level === s.level)}
                fill={s.color}
                fillOpacity={0.78}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        {SERIES.map((s) => (
          <span key={s.level} className="flex flex-row items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            예측 {s.label}
          </span>
        ))}
        <span className="flex flex-row items-center gap-1.5">
          <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--text-muted)' }} />
          예측 = 실제
        </span>
      </div>
    </div>
  )
}

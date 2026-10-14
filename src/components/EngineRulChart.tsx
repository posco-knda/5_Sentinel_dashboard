import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { logSummary, type LogRow } from '../data/detectionLog'

export type Curve = { c: number[]; p: number[] }

/** 엔진 하나의 예측 RUL 곡선과 실제 남은 수명(125에서 자름), 위험·주의 구간 */
export function EngineRulChart({ row, curve }: { row: LogRow; curve: Curve | undefined }) {
  if (!curve) {
    return (
      <div className="flex h-[240px] items-center justify-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        불러오는 중…
      </div>
    )
  }
  const data = curve.c.map((c, i) => ({ c, p: curve.p[i], t: Math.min(125, row.trueEnd + (row.lastCycle - c)) }))
  const { red, yellow } = logSummary
  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <ReferenceArea y1={0} y2={red} fill="var(--status-critical)" fillOpacity={0.1} />
          <ReferenceArea y1={red} y2={yellow} fill="var(--status-warning)" fillOpacity={0.08} />
          <XAxis
            dataKey="c"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v) => `#${v}`}
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--axis)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 130]}
            ticks={[0, red, yellow, 125]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as { c: number; p: number; t: number }
              return (
                <div
                  className="border px-3 py-2 text-[12px]"
                  style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
                >
                  <div className="mono" style={{ color: 'var(--text-muted)' }}>cycle #{d.c}</div>
                  <div className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    예측 RUL <span className="mono">{d.p}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    실제 <span className="mono">{d.t}</span>
                  </div>
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="t" stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="p"
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

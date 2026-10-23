import type { ComponentProps } from 'react'
import { ComposedChart, Label, Line, XAxis, YAxis, CartesianGrid, ReferenceArea, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { WARN_N } from '../lib/settings'
import type { AlertRuns } from '../lib/fleet'
import type { Curve } from '../lib/curves'

const TICK = { fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }

/** 경보 시점 이름표 — 두 시점이 가까워도 겹치지 않게 줄을 달리해 선 왼쪽에 둔다(왼쪽 끝에 붙은 선만 오른쪽에 둔다) */
const markLabel = (text: string, color: string, row: number) =>
  function MarkLabel({ viewBox }: ComponentProps<typeof Label>) {
    const x = (viewBox as { x?: number } | undefined)?.x ?? 0
    const left = x < 70
    return (
      <text x={x + (left ? 5 : -5)} y={14 + row * 15} textAnchor={left ? 'start' : 'end'} fill={color} fontSize={11} fontWeight={600} stroke="var(--surface-1)" strokeWidth={3} paintOrder="stroke">
        {text}
      </text>
    )
  }

/** 엔진 하나의 예측 남은 수명 추이 — 위험·주의 구간과 경보가 켜진 시점을 함께 보여 준다 */
export function EngineRulChart({ curve, runs, dangerN, height = 240 }: { curve: Curve | undefined; runs: AlertRuns | null; dangerN: number; height?: number }) {
  if (!curve) {
    return (
      <div className="flex items-center justify-center text-[12.5px]" style={{ height, color: 'var(--text-muted)' }}>
        불러오는 중…
      </div>
    )
  }
  const data = curve.c.map((c, i) => ({ c, p: curve.p[i] }))
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 26, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <ReferenceArea y1={0} y2={dangerN} fill="var(--status-critical)" fillOpacity={0.1} />
          <ReferenceArea y1={dangerN} y2={WARN_N} fill="var(--status-warning)" fillOpacity={0.08} />
          <XAxis dataKey="c" type="number" domain={['dataMin', 'dataMax']} tickFormatter={(v) => `#${v}`} tick={TICK} axisLine={{ stroke: 'var(--axis)' }} tickLine={false} />
          <YAxis domain={[0, 130]} ticks={[0, dangerN, WARN_N, 125]} tick={TICK} axisLine={false} tickLine={false} width={36} />
          {runs?.warnSince != null && (
            <ReferenceLine x={runs.warnSince} stroke="var(--status-warning)" strokeDasharray="4 3" label={{ content: markLabel('주의 시작', 'var(--status-warning)', 0) }} />
          )}
          {runs?.dangerSince != null && (
            <ReferenceLine x={runs.dangerSince} stroke="var(--status-critical)" strokeDasharray="4 3" label={{ content: markLabel('위험 시작', 'var(--status-critical)', 1) }} />
          )}
          <Tooltip
            cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as { c: number; p: number }
              return (
                <div className="border px-3 py-2 text-[12px]" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
                  <div className="mono" style={{ color: 'var(--text-muted)' }}>cycle #{d.c}</div>
                  <div className="mt-0.5 font-semibold" style={{ color: 'var(--text-primary)' }}>
                    예측 남은 수명 <span className="mono">{d.p}</span> cycle
                  </div>
                </div>
              )
            }}
          />
          <Line type="monotone" dataKey="p" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: 'var(--surface-1)', strokeWidth: 2 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

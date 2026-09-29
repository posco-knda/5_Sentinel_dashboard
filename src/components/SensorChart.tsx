import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceArea,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { sensorSeries, anomalyWindow, getRulAtHour, formatHour } from '../data/mock'

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const v = payload[0].value as number
  const inAnomaly = label >= anomalyWindow.start && label <= anomalyWindow.end
  return (
    <div
      className="border px-3 py-2 text-[12px]"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
    >
      <div className="mono" style={{ color: 'var(--text-muted)' }}>
        {formatHour(label)}
      </div>
      <div className="mt-0.5 font-semibold" style={{ color: inAnomaly ? 'var(--status-critical)' : 'var(--text-primary)' }}>
        예측 RUL <span className="mono">{v.toFixed(1)} cycle</span>
        {inAnomaly ? ' · 위험 임계값 이하' : ''}
      </div>
    </div>
  )
}

export function SensorChart({ hour }: { hour: number }) {
  // hour까지의 확정된 포인트 + 현재 스크러버 위치의 보간값 하나를 이어붙여서
  // 드래그할 때 끝점이 뚝뚝 끊기지 않고 부드럽게 따라오게 만듭니다.
  const visible = sensorSeries.filter((p) => p.h <= hour)
  const current = { h: hour, v: getRulAtHour(hour) }
  const data = visible.length && visible[visible.length - 1].h === hour ? visible : [...visible, current]

  const bandEnd = Math.min(hour, anomalyWindow.end)
  const showBand = hour > anomalyWindow.start

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="h"
            type="number"
            domain={[0, 24]}
            ticks={[0, 8, 16, 24]}
            tickFormatter={formatHour}
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--axis)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 125]}
            ticks={[0, 25, 50, 75, 100, 125]}
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          {showBand && (
            <ReferenceArea
              x1={anomalyWindow.start}
              x2={bandEnd}
              fill="var(--status-critical)"
              fillOpacity={0.12}
              label={{ value: '위험 구간', position: 'insideTop', fill: 'var(--status-serious)', fontSize: 11, fontWeight: 600 }}
            />
          )}
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="v"
            stroke="none"
            fill="var(--series-1)"
            fillOpacity={0.1}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="v"
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

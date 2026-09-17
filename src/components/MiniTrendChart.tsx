import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function MiniTooltip({ active, payload, unit }: any) {
  if (!active || !payload?.length) return null
  const v = payload[0].value as number
  return (
    <div
      className="mono border px-2.5 py-1.5 text-[11.5px]"
      style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)' }}
    >
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {v.toFixed(1)}
      </span>
      <span style={{ color: 'var(--text-muted)' }}> {unit}</span>
    </div>
  )
}

/** 설비 상세용 소형 추이 차트 (small multiple) — 각각 자기 축을 가진 단일 시리즈 카드 하나. */
export function MiniTrendChart({
  data,
  color,
  unit,
  domain,
}: {
  data: { h: number; v: number }[]
  color: string
  unit: string
  domain: [number, number]
}) {
  return (
    <div className="h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
          <XAxis dataKey="h" type="number" domain={[0, 72]} hide />
          <YAxis domain={domain} hide />
          <Tooltip content={<MiniTooltip unit={unit} />} cursor={{ stroke: 'var(--axis)', strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            fill={color}
            fillOpacity={0.14}
            isAnimationActive={false}
            activeDot={{ r: 3, stroke: 'var(--surface-1)', strokeWidth: 1.5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

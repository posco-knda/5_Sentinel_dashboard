import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const LEVELS = [
  { key: 'red', label: '위험', color: 'var(--status-critical)' },
  { key: 'warn', label: '주의', color: 'var(--status-warning)' },
  { key: 'ok', label: '정상', color: 'var(--status-good)' },
] as const

/** 엔진 등급 분포 도넛 — 가운데에 전체 대수, 아래에 등급별 대수와 비율 */
export function LevelDonut({ levels, total }: { levels: Record<'red' | 'warn' | 'ok', number>; total: number }) {
  const data = LEVELS.map((l) => ({ ...l, value: levels[l.key] }))
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={60}
              outerRadius={88}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="var(--surface-1)"
              strokeWidth={2}
              animationDuration={900}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="mono text-[28px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
            {total}
          </span>
          <span className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            전체 엔진
          </span>
        </div>
      </div>
      <div className="flex w-full min-w-0 max-w-[260px] flex-col gap-2.5">
        {data.map((d) => (
          <div key={d.key} className="flex flex-row items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: d.color }} />
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              {d.label}
            </span>
            <span className="mono ml-auto text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {d.value}
            </span>
            <span className="mono w-11 text-right text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

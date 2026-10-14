import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'

const BIN = 2

/** 경보 선행 시간 분포 — 위험 경보가 켜진 시점부터 실제 고장까지 남은 사이클의 히스토그램.
 *  기준(danger)보다 일찍 켜진 경보(선행 시간 > danger)는 옅게 표시. */
export function LeadTimeHistogram({ leads, median, danger }: { leads: number[]; median: number; danger: number }) {
  const lo = Math.floor(Math.min(...leads) / BIN) * BIN
  const hi = Math.floor(Math.max(...leads) / BIN) * BIN
  const bins = []
  for (let b = lo; b <= hi; b += BIN) {
    bins.push({ lo: b, label: `${b}`, n: leads.filter((v) => v >= b && v < b + BIN).length })
  }
  const medianBin = String(Math.floor(median / BIN) * BIN)
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bins} margin={{ top: 22, right: 8, bottom: 22, left: -14 }} barCategoryGap={3}>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={{ stroke: 'var(--axis)' }}
            tickLine={false}
            interval={1}
            label={{ value: '선행 시간 (cycle)', position: 'insideBottom', offset: -12, fill: 'var(--text-muted)', fontSize: 11 }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={34}
          />
          <ReferenceLine
            x={medianBin}
            stroke="var(--status-warning)"
            strokeDasharray="4 3"
            label={{ value: `중앙값 ${median}`, position: 'top', fill: 'var(--status-warning)', fontSize: 11, fontWeight: 600 }}
          />
          <Tooltip
            cursor={{ fill: 'var(--border-soft)' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const d = payload[0].payload as { lo: number; n: number }
              return (
                <div
                  className="border px-3 py-2 text-[12px]"
                  style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
                >
                  <div style={{ color: 'var(--text-muted)' }}>
                    고장 <span className="mono">{d.lo}~{d.lo + BIN - 1}</span> cycle 전
                  </div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    <span className="mono">{d.n}</span>대
                  </div>
                </div>
              )
            }}
          />
          <Bar dataKey="n" radius={[3, 3, 0, 0]} animationDuration={800}>
            {bins.map((b) => (
              <Cell key={b.lo} fill="var(--series-1)" fillOpacity={b.lo >= danger ? 0.4 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

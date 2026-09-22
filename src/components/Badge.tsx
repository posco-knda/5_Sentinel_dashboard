import type { Status } from '../data/mock'
import { statusLabel } from '../data/mock'

const statusColor: Record<Status, string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
}

const statusWash: Record<Status, string> = {
  good: 'var(--status-good-wash)',
  warning: 'var(--status-warning-wash)',
  serious: 'var(--status-serious-wash)',
  critical: 'var(--status-critical-wash)',
}

export function Badge({ status }: { status: Status }) {
  const color = statusColor[status]
  const critical = status === 'critical'
  return (
    <span
      className="inline-flex flex-row items-center gap-1.5 border px-2.5 py-[3px] text-[11px] font-medium tracking-[0.01em]"
      style={{
        background: statusWash[status],
        color,
        borderColor: 'color-mix(in oklab, ' + color + ' 30%, transparent)',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      <span
        className="inline-block h-[6px] w-[6px] shrink-0 rounded-full"
        style={{
          background: color,
          animation: critical ? 'led-pulse 1.8s ease-in-out infinite' : 'none',
        }}
      />
      {statusLabel[status]}
    </span>
  )
}

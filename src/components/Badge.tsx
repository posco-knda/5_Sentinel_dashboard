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

/** 파스텔 배지 대신 계측 장비의 상태등(LED)을 참조한 인디케이터. */
export function Badge({ status }: { status: Status }) {
  const color = statusColor[status]
  const critical = status === 'critical'
  return (
    <span
      className="inline-flex flex-row items-center gap-1.5 border px-2 py-[3px] text-[11px] font-semibold tracking-[0.02em]"
      style={{ background: statusWash[status], color, borderColor: 'color-mix(in oklab, ' + color + ' 35%, transparent)', borderRadius: 'var(--radius)' }}
    >
      <span
        className="inline-block h-[6px] w-[6px] shrink-0 rounded-full"
        style={{
          background: color,
          boxShadow: critical ? `0 0 6px ${color}` : 'none',
          animation: critical ? 'led-pulse 1.6s ease-in-out infinite' : 'none',
        }}
      />
      {statusLabel[status]}
    </span>
  )
}

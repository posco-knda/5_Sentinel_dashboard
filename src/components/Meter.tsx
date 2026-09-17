import { motion } from 'framer-motion'
import type { Status } from '../data/mock'

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

export function Meter({ value, status, delay = 0 }: { value: number; status: Status; delay?: number }) {
  return (
    <div className="h-[3px] w-full overflow-hidden" style={{ background: statusWash[status] }}>
      <motion.div
        className="h-full"
        style={{ background: statusColor[status] }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.8, delay, ease: 'easeOut' }}
      />
    </div>
  )
}

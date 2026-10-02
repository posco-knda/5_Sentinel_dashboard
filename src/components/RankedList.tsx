import { motion } from 'framer-motion'
import { equipmentRanking } from '../data/mock'
import { Badge } from './Badge'
import { Meter } from './Meter'

export function RankedList() {
  return (
    <div className="flex flex-col">
      {equipmentRanking.map((eq, i) => (
        <motion.div
          key={eq.id}
          layout
          className="flex flex-row items-center gap-3 py-3"
          style={{ borderBottom: i < equipmentRanking.length - 1 ? '1px solid var(--border-soft)' : 'none' }}
          transition={{ duration: 0.35 }}
        >
          <span className="mono w-4 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {String(i + 1).padStart(2, '0')}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-row items-center justify-between gap-2">
              <span className="truncate text-[13.5px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {eq.name}
              </span>
              <Badge status={eq.status} />
            </div>
            <Meter value={eq.health} status={eq.status} />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

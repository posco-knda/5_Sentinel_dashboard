import { motion, AnimatePresence } from 'framer-motion'
import { getAlertsUpToHour } from '../data/mock'
import { Badge } from './Badge'

export function AlertsTable({ hour }: { hour: number }) {
  const rows = getAlertsUpToHour(hour)

  if (!rows.length) {
    return (
      <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
        아직 이 시각까지 발생한 이상탐지 로그가 없습니다
      </div>
    )
  }

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {['발생 시각', '설비', '센서', '심각도', '조치 상태'].map((h) => (
            <th
              key={h}
              className="border-b pb-2.5 pr-3 text-left text-[11.5px] font-semibold tracking-[0.02em]"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        <AnimatePresence initial={false}>
          {rows.map((row) => (
            <motion.tr
              key={row.time + row.equipment}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <td className="mono py-3.5 pr-3 text-[13px]" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-soft)' }}>
                {row.time}
              </td>
              <td className="py-3.5 pr-3 text-[13.5px]" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-soft)' }}>
                {row.equipment}
              </td>
              <td className="py-3.5 pr-3 text-[13.5px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-soft)' }}>
                {row.sensor}
              </td>
              <td className="py-3.5 pr-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <Badge status={row.severity} />
              </td>
              <td className="py-3.5 pr-3 text-[13.5px]" style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-soft)' }}>
                {row.action}
              </td>
            </motion.tr>
          ))}
        </AnimatePresence>
      </tbody>
    </table>
  )
}

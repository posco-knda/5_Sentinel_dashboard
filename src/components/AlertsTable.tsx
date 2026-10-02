import { motion, AnimatePresence } from 'framer-motion'
import { alertLog } from '../data/mock'
import { Badge } from './Badge'

export function AlertsTable({ compact = false }: { compact?: boolean }) {
  const rows = alertLog

  if (!rows.length) {
    return (
      <div className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
        발생한 이상탐지 로그가 없습니다
      </div>
    )
  }

  if (compact) {
    return (
      <div className="flex flex-col">
        <AnimatePresence initial={false}>
          {rows.map((row, i) => (
            <motion.div
              key={row.time + row.equipment}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex flex-row items-start gap-3 py-3"
              style={{ borderBottom: i < rows.length - 1 ? '1px solid var(--border-soft)' : 'none' }}
            >
              <span className="mono mt-0.5 shrink-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                {row.time}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-row items-center justify-between gap-2">
                  <span className="truncate text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {row.equipment} · {row.sensor}
                  </span>
                  <Badge status={row.severity} />
                </div>
                <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  {row.action}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
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

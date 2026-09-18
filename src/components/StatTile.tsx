import { useEffect, useRef, useState, type ReactNode } from 'react'
import { animate, motion } from 'framer-motion'

function useCountUp(target: number, decimals = 0, duration = 1) {
  const [value, setValue] = useState(0)
  const isFirst = useRef(true)
  const valueRef = useRef(0)
  useEffect(() => {
    // 최초 마운트 시에는 0에서 카운트업, 이후(스크러버 드래그 등)에는 현재 값에서
    // 짧게 이어서 애니메이션 — 매번 0부터 다시 세는 것을 방지합니다.
    const from = isFirst.current ? 0 : valueRef.current
    const d = isFirst.current ? duration : 0.2
    isFirst.current = false
    const controls = animate(from, target, {
      duration: d,
      ease: 'easeOut',
      onUpdate: (v) => {
        valueRef.current = v
        setValue(v)
      },
    })
    return () => controls.stop()
  }, [target, duration])
  return value.toFixed(decimals)
}

export function StatTile({
  label,
  value,
  decimals = 0,
  suffix,
  icon,
  foot,
  delay = 0,
}: {
  label: string
  value: number
  decimals?: number
  suffix?: string
  icon?: ReactNode
  foot?: ReactNode
  delay?: number
}) {
  const display = useCountUp(value, decimals, 1)

  return (
    <motion.div
      className="surface-card surface-card--interactive flex flex-col gap-2.5 border p-5"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <span className="text-[12px] tracking-[0.02em]" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div className="flex flex-row items-baseline gap-2">
        {icon}
        <span className="mono text-3xl font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
          {display}
        </span>
        {suffix && (
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            {suffix}
          </span>
        )}
      </div>
      {foot && (
        <div className="flex flex-row items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          {foot}
        </div>
      )}
    </motion.div>
  )
}

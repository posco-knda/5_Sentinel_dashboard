import { useEffect, useState, type ReactNode } from 'react'

const START = 9 // 출근
const END = 18 // 퇴근

/** 오늘 업무 시간(09~18시) 중 얼마나 지났는지 0~1 — 30초마다 갱신 */
function useDayProgress(): { p: number; left: string } {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])
  const d = new Date(now)
  const h = d.getHours() + d.getMinutes() / 60
  const p = Math.min(1, Math.max(0, (h - START) / (END - START)))
  const rest = Math.round((END - START) * (1 - p) * 60)
  const left = h < START ? '업무 시작 전' : h >= END ? '오늘 업무 종료' : `퇴근까지 ${Math.floor(rest / 60) ? `${Math.floor(rest / 60)}시간 ` : ''}${rest % 60}분`
  return { p, left }
}

/** 화면 맨 위 제목 줄 — 오른쪽 빈 곳에서 비행기가 오늘 업무 시간(출근→퇴근)에 맞춰 목적지로 날아간다 */
export function PageHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  const { p, left } = useDayProgress()
  const pct = `${(p * 100).toFixed(1)}%`
  return (
    <div className="no-print flex shrink-0 flex-row items-start gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">{title}</h1>
        {sub && (
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
      <div className="mt-[3px] hidden min-w-[120px] flex-1 flex-row items-center gap-2.5 lg:flex" title={`${START}:00 → ${END}:00 · ${left}`} style={{ color: 'var(--accent)' }}>
        <span className="mono shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{String(START).padStart(2, '0')}:00</span>
        <div className="relative h-6 flex-1" aria-hidden="true">
          <span className="absolute left-0 top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full" style={{ background: 'currentColor' }} />
          {/* 지나온 길은 실선, 남은 길은 점선 */}
          <span className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full" style={{ width: pct, background: 'currentColor', opacity: 0.55, transition: 'width 1s linear' }} />
          <span className="absolute right-0 top-1/2 h-px -translate-y-1/2" style={{ left: pct, opacity: 0.5, backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 5px, transparent 5px 11px)' }} />
          <span className="absolute right-0 top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full border-2" style={{ borderColor: 'currentColor', background: 'var(--page)' }} />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className="absolute top-1/2" style={{ left: pct, transform: 'translate(-50%, -50%) rotate(45deg)', transition: 'left 1s linear' }}>
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
        </div>
        <span className="flex shrink-0 flex-col items-end leading-tight">
          <span className="mono text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{END}:00</span>
          <span className="whitespace-nowrap text-[10.5px]" style={{ color: 'var(--text-secondary)' }}>{left}</span>
        </span>
      </div>
      {action}
    </div>
  )
}

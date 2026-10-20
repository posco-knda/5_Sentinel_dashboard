import { useEffect, useState } from 'react'

const FOCUS = 50 // 분 — 매 시각 정각부터 집중
const CYCLE = 60 // 분 — 뒤 10분은 쉬는 시간

const mmss = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

/** 사이드바의 집중 타이머 — 정각부터 50분은 집중, 남은 10분은 쉬는 시간. 비행기가 다음 쉬는 시간(착륙)까지 날아간다 */
export function FocusTimer() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const d = new Date(now)
  const sec = d.getMinutes() * 60 + d.getSeconds()
  const onBreak = sec >= FOCUS * 60
  const left = onBreak ? CYCLE * 60 - sec : FOCUS * 60 - sec
  const p = onBreak ? 1 : sec / (FOCUS * 60)
  const pct = `${(p * 100).toFixed(2)}%`
  return (
    <div className="mb-2.5 flex flex-col gap-1.5 border px-3 py-2.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)' }} aria-label={onBreak ? '쉬는 시간' : '집중 시간'}>
      <div className="flex flex-row items-baseline justify-between gap-2">
        <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{onBreak ? '다음 집중까지' : '다음 쉬는 시간까지'}</span>
        <span className="mono text-[17px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{mmss(left)}</span>
      </div>
      <div className="relative h-5" aria-hidden="true">
        <span className="absolute left-0 top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full" style={{ background: 'currentColor' }} />
        <span className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full" style={{ width: pct, background: 'currentColor', opacity: 0.55, transition: 'width 1s linear' }} />
        <span className="absolute right-0 top-1/2 h-px -translate-y-1/2" style={{ left: pct, opacity: 0.5, backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 9px)' }} />
        <span className="absolute right-0 top-1/2 h-[8px] w-[8px] -translate-y-1/2 rounded-full border-2" style={{ borderColor: 'currentColor', background: onBreak ? 'currentColor' : 'var(--surface-2)' }} />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className="absolute top-1/2" style={{ left: pct, transform: `translate(${onBreak ? '-70%' : '-50%'}, -50%) rotate(45deg)`, transition: 'left 1s linear' }}>
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </svg>
      </div>
      <div className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{onBreak ? '쉬는 시간 · 잠깐 숨 돌리세요' : '집중 시간 · 매시 50분에 쉬는 시간'}</div>
    </div>
  )
}

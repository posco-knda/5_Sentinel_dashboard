import type { ReactNode } from 'react'
import { useAuth } from '../lib/auth'
import { useTodos } from '../lib/todos'

/**
 * 화면 맨 위 제목 줄 — 제목과 설명 오른쪽의 빈 곳에 항로(출발 ····· 도착)를 두고,
 * 비행기가 오늘 할 일을 끝낸 비율만큼 오른쪽으로 날아간다. 할 일을 체크하는 연출 동안은 사라졌다가 끝나면 새 위치에 나타난다.
 */
export function PageHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
  const { user } = useAuth()
  const { ratio, shown, busy, todos } = useTodos(user?.role)
  const pct = `${(shown * 100).toFixed(1)}%`
  const done = Math.round(ratio * todos.length)
  return (
    <div className="no-print flex shrink-0 flex-row flex-wrap items-start gap-x-4 gap-y-2 lg:flex-nowrap">
      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:flex-none">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">{title}</h1>
        {sub && (
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
      <div className="min-w-[96px] basis-full pr-2.5 max-lg:order-last lg:mt-[4px] lg:flex-1 lg:basis-auto" style={{ color: 'var(--accent)' }} title={todos.length ? `오늘 할 일 ${done}/${todos.length} 완료` : '오늘 할 일'}>
        <div className="relative h-6" aria-hidden="true">
          <span className="absolute left-0 top-1/2 h-[7px] w-[7px] -translate-y-1/2 rounded-full" style={{ background: 'currentColor', opacity: shown <= 0 ? 0 : 0.6, transition: 'opacity 0.3s' }} />
          {/* 지나온 길은 실선, 남은 길은 점선 */}
          <span className="absolute left-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full" style={{ width: pct, background: 'currentColor', opacity: 0.55, transition: 'width 1.1s ease-in-out' }} />
          <span className="absolute right-0 top-1/2 h-px -translate-y-1/2" style={{ left: pct, opacity: 0.45, backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 5px, transparent 5px 11px)', transition: 'left 1.1s ease-in-out' }} />
          <span className="absolute right-0 top-1/2 h-[9px] w-[9px] -translate-y-1/2 rounded-full border-2" style={{ borderColor: 'currentColor', background: 'var(--page)', opacity: shown >= 1 ? 0 : 0.7, transition: `opacity 0.3s ${shown >= 1 ? '0.9s' : '0s'}` }} />
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinejoin="round"
            className="absolute top-1/2"
            style={{ left: pct, transform: 'translate(-50%, -50%) rotate(45deg)', opacity: busy ? 0 : 1, transition: busy ? 'opacity 0.15s' : 'left 1.1s ease-in-out, opacity 0.3s 0.05s' }}
          >
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
        </div>
      </div>
      {action}
    </div>
  )
}

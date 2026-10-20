import type { ReactNode } from 'react'

/** 화면 맨 위 제목 줄 — 제목과 설명 오른쪽의 빈 곳에 점선 항로와 작은 비행기를 둔다 */
export function PageHead({ title, sub, action }: { title: string; sub?: ReactNode; action?: ReactNode }) {
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
      <div className="mt-[9px] hidden min-w-[48px] flex-1 flex-row items-center lg:flex" style={{ color: 'var(--accent)', opacity: 0.55 }} aria-hidden="true">
        <span className="h-px flex-1" style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 5px, transparent 5px 11px)' }} />
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" style={{ transform: 'rotate(45deg)', marginLeft: 2 }}>
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </svg>
      </div>
      {action}
    </div>
  )
}

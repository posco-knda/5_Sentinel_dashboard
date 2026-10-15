import type { ReactNode } from 'react'

export function Panel({
  title,
  sub,
  action,
  dense,
  fill,
  children,
}: {
  title?: string
  sub?: string
  action?: ReactNode
  dense?: boolean
  /** 부모의 남은 높이를 채운다 (목록 화면용) */
  fill?: boolean
  children: ReactNode
}) {
  return (
    <div className={`surface-card flex flex-col border ${dense ? 'p-4' : 'p-6'} ${fill ? 'min-h-0 flex-1' : ''}`} style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      {(title || action) && (
        <div className={`${dense ? 'mb-2' : 'mb-3.5'} flex flex-row items-start justify-between gap-3`}>
          <div className="min-w-0">
            {title && (
              <p className="m-0 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {title}
              </p>
            )}
            {sub && (
              <p className="m-0 mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {sub}
              </p>
            )}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

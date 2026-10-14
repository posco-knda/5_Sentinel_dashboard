import type { ReactNode } from 'react'

export function Panel({
  title,
  sub,
  action,
  children,
}: {
  title?: string
  sub?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      {(title || action) && (
        <div className="mb-3.5 flex flex-row items-start justify-between gap-3">
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

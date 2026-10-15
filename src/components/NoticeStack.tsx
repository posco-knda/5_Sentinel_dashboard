import { dismissNotice, useNotices } from '../lib/notice'

export function NoticeStack() {
  const notices = useNotices()
  if (!notices.length) return null
  return (
    <div className="no-print pointer-events-none fixed bottom-4 right-4 z-[70] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2" role="status" aria-live="polite">
      {notices.map((n) => (
        <div
          key={n.id}
          className="pointer-events-auto flex flex-row items-start gap-2.5 border px-3.5 py-2.5 text-[12.5px]"
          style={{ background: 'var(--surface-raised)', borderColor: n.tone === 'error' ? 'var(--status-critical)' : 'var(--border-strong)', borderRadius: 'var(--radius-sm)', boxShadow: '0 6px 24px rgba(0,0,0,0.25)' }}
        >
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: n.tone === 'error' ? 'var(--status-critical)' : 'var(--status-good)' }} />
          <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{n.text}</span>
          {n.action && (
            <button
              onClick={() => {
                n.action?.run()
                dismissNotice(n.id)
              }}
              className="shrink-0 text-[12.5px] font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {n.action.label}
            </button>
          )}
          <button onClick={() => dismissNotice(n.id)} aria-label="닫기" className="shrink-0 text-[13px] leading-none" style={{ color: 'var(--text-muted)' }}>
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

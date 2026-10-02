import { AnimatePresence, motion } from 'framer-motion'

export function Toast({
  show,
  title,
  body,
  onDismiss,
}: {
  show: boolean
  title: string
  body: string
  onDismiss?: () => void
}) {
  return (
    <div className="pointer-events-none fixed right-6 top-20 z-50 w-[320px]">
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="pointer-events-auto flex flex-row gap-3 border p-4"
            style={{
              background: 'var(--surface-raised)',
              borderColor: 'var(--border)',
              borderLeft: '3px solid var(--status-critical)',
              borderRadius: 'var(--radius-sm)',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--status-critical)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="mt-0.5 shrink-0"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold" style={{ color: 'var(--status-critical)' }}>
                {title}
              </div>
              <div className="mt-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                {body}
              </div>
            </div>
            {onDismiss && (
              <button
                onClick={onDismiss}
                aria-label="닫기"
                className="icon-btn -mr-1 -mt-1 flex h-5 w-5 shrink-0 items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

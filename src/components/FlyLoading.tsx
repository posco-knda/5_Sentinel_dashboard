const PLANE = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'

/** 불러오는 동안 보여 주는 표시 — 비행기가 항로 위를 슉 지나간다 */
export function FlyLoading({ label = '불러오는 중…', height = '40vh' }: { label?: string; height?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height, color: 'var(--accent)' }} role="status" aria-label={label}>
      <div className="fly-track relative h-8 w-[min(340px,70%)] overflow-hidden" aria-hidden="true">
        <span className="absolute left-0 right-0 top-1/2 h-px" style={{ backgroundImage: 'repeating-linear-gradient(90deg, currentColor 0 5px, transparent 5px 11px)', opacity: 0.3 }} />
        <div className="fly-plane">
          <span className="fly-trail" />
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" style={{ transform: 'rotate(45deg)', flexShrink: 0 }}>
            <path d={PLANE} />
          </svg>
        </div>
      </div>
      <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
    </div>
  )
}

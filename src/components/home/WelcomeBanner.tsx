import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/**
 * 직접 그린 여객기 — 위에서 내려다본 모양(오른쪽이 기수)이라 날개 아래에 엔진이 하나씩 달린 구조가 한눈에 보인다.
 * 색은 역할별 포인트 색(--accent)과 그 위 글자색(--accent-ink)을 따른다.
 */
function Airliner() {
  // 날개에 매달린 엔진: 앞날개 가장자리보다 앞으로 튀어나오고, 흡입구(밝은 타원)는 진행 방향(오른쪽)
  const pod = (cy: number) => (
    <g key={cy}>
      <rect x="330" y={cy - 8} width="62" height="16" rx="8" fill="var(--accent-ink)" />
      <ellipse cx="389" cy={cy} rx="3.5" ry="6.5" fill="var(--accent)" fillOpacity="0.85" />
      <path d={`M 338 ${cy - 8} L 352 ${cy - 8}`} stroke="var(--accent)" strokeOpacity="0.35" strokeWidth="2" />
    </g>
  )
  return (
    <svg viewBox="0 0 640 220" className="airliner-float h-full w-full" preserveAspectRatio="xMaxYMid meet" fill="none" aria-hidden="true">
      <g transform="translate(372 112) rotate(-12) scale(0.74) translate(-330 -110)">
        {/* 꼬리에서 길게 이어지는 비행운 */}
        <path className="contrail" d="M 36 106 L -900 106" stroke="var(--accent-ink)" strokeOpacity="0.55" strokeWidth="5" strokeLinecap="round" strokeDasharray="3 20" />
        <path d="M 36 114 L -900 114" stroke="var(--accent-ink)" strokeOpacity="0.28" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 26" />

        {/* 수평 꼬리날개 */}
        <path d="M 126 98 L 74 62 L 52 62 L 96 98 Z" fill="var(--accent-ink)" fillOpacity="0.85" />
        <path d="M 126 122 L 74 158 L 52 158 L 96 122 Z" fill="var(--accent-ink)" fillOpacity="0.85" />

        {/* 주날개: 뒤로 젖혀진 후퇴익 */}
        <path d="M 436 98 L 274 8 L 238 8 L 338 98 Z" fill="var(--accent-ink)" fillOpacity="0.93" />
        <path d="M 436 122 L 274 212 L 238 212 L 338 122 Z" fill="var(--accent-ink)" fillOpacity="0.93" />

        {/* 엔진 */}
        {pod(56)}
        {pod(164)}

        {/* 동체 */}
        <path d="M 38 110 C 38 102 58 97 92 97 L 500 97 C 562 97 602 103 622 110 C 602 117 562 123 500 123 L 92 123 C 58 123 38 118 38 110 Z" fill="var(--accent-ink)" />
        {/* 조종석 창 */}
        <path d="M 568 103 C 586 104 600 107 606 110 C 600 113 586 116 568 117 Z" fill="var(--accent)" fillOpacity="0.85" />
        {/* 동체 중심선 */}
        <path d="M 110 110 L 540 110" stroke="var(--accent)" strokeOpacity="0.32" strokeWidth="2.5" strokeDasharray="1 9" strokeLinecap="round" />
      </g>
    </svg>
  )
}

/** 로그인 직후 첫 화면 위쪽의 환영 배너 — 항공 기체 그림과 오늘의 핵심 숫자를 보여 준다 */
export function WelcomeBanner({ eyebrow, title, chips, action }: { eyebrow: string; title: string; chips: { label: string; value: string; warn?: boolean }[]; action?: { to: string; label: string } }) {
  return (
    <section
      className="no-print relative overflow-hidden"
      style={{ borderRadius: 'var(--radius-sm)', color: 'var(--accent-ink)', background: 'linear-gradient(112deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 62%, #0a1222) 100%)' }}
      aria-label="환영"
    >
      {/* 배경: 레이더 같은 동심원과 옅은 격자 */}
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMaxYMid slice" viewBox="0 0 800 160" fill="none" aria-hidden="true">
        {[60, 110, 160, 210].map((r) => (
          <circle key={r} cx="640" cy="90" r={r} stroke="var(--accent-ink)" strokeOpacity={0.12 - r / 3000} />
        ))}
        <path d="M 0 140 L 800 140" stroke="var(--accent-ink)" strokeOpacity="0.1" />
      </svg>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[62%] items-center sm:flex" style={{ opacity: 0.96 }}>
        <Airliner />
      </div>
      <div className="relative flex min-h-[148px] flex-col justify-center gap-3 px-6 py-5">
        <div>
          <p className="m-0 text-[12px] font-medium tracking-[0.04em]" style={{ opacity: 0.8 }}>{eyebrow}</p>
          <h1 className="m-0 mt-0.5 text-[26px] font-semibold tracking-[-0.01em]">{title}</h1>
        </div>
        <div className="flex flex-row flex-wrap items-center gap-2">
          {chips.map((c): ReactNode => (
            <span key={c.label} className="flex flex-row items-baseline gap-1.5 px-3 py-1.5 text-[12.5px]" style={{ background: 'color-mix(in oklab, var(--accent-ink) 18%, transparent)', borderRadius: 999, boxShadow: c.warn ? 'inset 0 0 0 1.5px color-mix(in oklab, var(--accent-ink) 70%, transparent)' : undefined }}>
              <span style={{ opacity: 0.85 }}>{c.label}</span>
              <span className="mono text-[15px] font-semibold">{c.value}</span>
            </span>
          ))}
          {action && (
            <Link to={action.to} className="ml-1 px-3 py-1.5 text-[12.5px] font-semibold no-underline" style={{ background: 'var(--accent-ink)', color: 'var(--accent)', borderRadius: 999 }}>
              {action.label} →
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

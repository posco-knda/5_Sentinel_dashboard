import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** 직접 그린 여객기(옆모습) — 색은 역할별 포인트 색(--accent)과 그 위 글자색(--accent-ink)을 따른다 */
function Airliner() {
  return (
    <svg viewBox="0 0 640 220" className="airliner-float h-full w-full" preserveAspectRatio="xMaxYMid meet" fill="none" aria-hidden="true">
      <g transform="rotate(-6 330 115)">
        {/* 꼬리에서 길게 이어지는 비행운 */}
        <path className="contrail" d="M 44 118 C -40 126 -150 136 -330 146" stroke="var(--accent-ink)" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
        <path d="M 44 124 C -50 134 -160 146 -330 160" stroke="var(--accent-ink)" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 16" />

        {/* 먼 쪽 날개 (동체 뒤에 살짝 보이는 부분) */}
        <path d="M 330 104 L 262 74 L 292 74 L 392 102 Z" fill="var(--accent-ink)" fillOpacity="0.55" />

        {/* 수직 꼬리날개 */}
        <path d="M 74 96 L 36 30 L 82 30 L 148 96 Z" fill="var(--accent-ink)" fillOpacity="0.95" />
        <path d="M 52 52 L 66 52" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />

        {/* 수평 꼬리날개 */}
        <path d="M 96 108 L 34 124 L 70 128 L 168 114 Z" fill="var(--accent-ink)" fillOpacity="0.75" />

        {/* 동체 */}
        <path d="M 30 100 C 30 94 36 90 46 90 L 478 90 C 540 90 592 100 616 114 C 592 128 540 136 478 136 L 74 136 C 48 136 30 122 30 100 Z" fill="var(--accent-ink)" />
        {/* 조종석 창 */}
        <path d="M 556 100 L 588 106 C 580 110 566 112 552 110 Z" fill="var(--accent)" fillOpacity="0.85" />
        {/* 객실 창 */}
        <g fill="var(--accent)" fillOpacity="0.55">
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={128 + i * 16} cy={108} r={3} />
          ))}
        </g>
        {/* 동체 띠 */}
        <path d="M 74 124 L 500 124" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="3" />

        {/* 주날개 */}
        <path d="M 300 128 L 196 196 L 252 196 L 408 128 Z" fill="var(--accent-ink)" fillOpacity="0.95" />
        <path d="M 196 196 L 252 196 L 262 188 L 206 188 Z" fill="var(--accent)" fillOpacity="0.5" />

        {/* 엔진 (기둥 + 나셀 + 팬) */}
        <path d="M 318 130 L 346 130 L 342 146 L 322 146 Z" fill="var(--accent-ink)" fillOpacity="0.8" />
        <rect x="288" y="142" width="104" height="34" rx="17" fill="var(--accent-ink)" />
        <ellipse cx="296" cy="159" rx="9" ry="15" fill="var(--accent)" fillOpacity="0.9" />
        <g className="fan-spin" style={{ transformOrigin: '296px 159px' }} stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <line key={i} x1={296 + Math.cos(a) * 2} y1={159 + Math.sin(a) * 3} x2={296 + Math.cos(a) * 8} y2={159 + Math.sin(a) * 13} />
          })}
        </g>
        <path d="M 392 152 L 410 158 L 392 164 Z" fill="var(--accent-ink)" fillOpacity="0.7" />
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

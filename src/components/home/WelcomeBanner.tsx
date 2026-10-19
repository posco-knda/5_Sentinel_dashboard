import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

/** 직접 그린 여객기(옆모습, 오른쪽이 기수) — 색은 역할별 포인트 색(--accent)과 그 위 글자색(--accent-ink)을 따른다 */
function Airliner() {
  return (
    <svg viewBox="0 0 640 220" className="airliner-float h-full w-full" preserveAspectRatio="xMaxYMid meet" fill="none" aria-hidden="true">
      <g transform="rotate(-5 330 112)">
        {/* 꼬리에서 길게 이어지는 비행운 */}
        <path className="contrail" d="M 40 104 C -40 112 -150 122 -330 132" stroke="var(--accent-ink)" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
        <path d="M 40 112 C -50 122 -160 134 -330 148" stroke="var(--accent-ink)" strokeOpacity="0.28" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 16" />

        {/* 먼 쪽 날개 (동체 위로 살짝 보이는 부분) */}
        <path d="M 420 88 L 350 62 L 376 62 L 462 88 Z" fill="var(--accent-ink)" fillOpacity="0.5" />

        {/* 수직 꼬리날개와 수평 꼬리날개 */}
        <path d="M 92 84 L 50 22 L 94 22 L 156 84 Z" fill="var(--accent-ink)" />
        <path d="M 62 40 L 76 40" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
        <path d="M 110 104 L 62 114 L 94 118 L 168 108 Z" fill="var(--accent-ink)" fillOpacity="0.7" />

        {/* 동체: 꼬리 쪽 아랫면이 위로 치켜 올라가고 기수는 오른쪽 */}
        <path d="M 40 94 C 40 86 48 82 60 82 L 470 82 C 538 82 590 92 614 104 C 590 116 538 124 470 124 L 100 124 C 60 124 40 112 40 94 Z" fill="var(--accent-ink)" />
        {/* 조종석 창 */}
        <path d="M 552 92 L 586 99 C 578 103 566 105 548 103 Z" fill="var(--accent)" fillOpacity="0.85" />
        {/* 객실 창 */}
        <g fill="var(--accent)" fillOpacity="0.5">
          {Array.from({ length: 22 }, (_, i) => (
            <circle key={i} cx={128 + i * 16} cy={100} r={3} />
          ))}
        </g>
        {/* 동체 띠 */}
        <path d="M 100 114 L 520 114" stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="3" />

        {/* 주날개: 동체 아래에서 뒤쪽·아래로 뻗는 후퇴익 */}
        <path d="M 330 120 L 236 170 L 270 170 L 444 120 Z" fill="var(--accent-ink)" fillOpacity="0.92" />

        {/* 엔진: 날개 앞쪽 아래에 기둥으로 매달리고, 흡입구(팬)는 오른쪽(진행 방향) */}
        <path d="M 318 140 L 352 148 L 368 160 L 324 160 Z" fill="var(--accent-ink)" fillOpacity="0.8" />
        <path d="M 292 168 L 276 173 L 292 182 Z" fill="var(--accent-ink)" fillOpacity="0.7" />
        <rect x="292" y="160" width="106" height="30" rx="15" fill="var(--accent-ink)" />
        <ellipse cx="392" cy="175" rx="8" ry="13" fill="var(--accent)" fillOpacity="0.9" />
        <g className="fan-spin" style={{ transformOrigin: '392px 175px' }} stroke="var(--accent-ink)" strokeWidth="2" strokeLinecap="round">
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i * Math.PI) / 4
            return <line key={i} x1={392 + Math.cos(a) * 1.5} y1={175 + Math.sin(a) * 2.5} x2={392 + Math.cos(a) * 6.5} y2={175 + Math.sin(a) * 11} />
          })}
        </g>
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

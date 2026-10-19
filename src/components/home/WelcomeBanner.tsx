import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

const FAN = { cx: 430, cy: 80 }
const BLADES = 18

/** 터보팬 엔진을 정면에서 본 모양 — 바깥 덮개, 휘어진 팬 날개 18장, 중앙 스피너. 천천히 돈다 */
function FanFace() {
  const polar = (r: number, deg: number) => `${(FAN.cx + Math.cos((deg * Math.PI) / 180) * r).toFixed(1)} ${(FAN.cy + Math.sin((deg * Math.PI) / 180) * r).toFixed(1)}`
  return (
    <g>
      <circle cx={FAN.cx} cy={FAN.cy} r="112" stroke="var(--accent-ink)" strokeOpacity="0.2" strokeWidth="2" />
      <circle cx={FAN.cx} cy={FAN.cy} r="104" fill="var(--accent-ink)" fillOpacity="0.1" stroke="var(--accent-ink)" strokeOpacity="0.9" strokeWidth="7" />
      <g className="fan-slow" style={{ transformOrigin: `${FAN.cx}px ${FAN.cy}px` }}>
        {Array.from({ length: BLADES }, (_, i) => {
          const a = (360 / BLADES) * i
          // 날개 뿌리에서 끝으로 갈수록 휘어지며 넓어지는 모양
          return <path key={i} d={`M ${polar(26, a)} Q ${polar(60, a + 4)} ${polar(98, a + 15)} L ${polar(98, a + 30)} Q ${polar(62, a + 22)} ${polar(28, a + 12)} Z`} fill="var(--accent-ink)" fillOpacity={i % 2 ? 0.88 : 0.62} />
        })}
      </g>
      <circle cx={FAN.cx} cy={FAN.cy} r="27" fill="var(--accent-ink)" />
      <circle cx={FAN.cx} cy={FAN.cy} r="17" fill="var(--accent)" fillOpacity="0.85" />
      <circle cx={FAN.cx} cy={FAN.cy} r="5" fill="var(--accent-ink)" />
    </g>
  )
}

// 항로 위를 지나가는 작은 비행기 모양(위에서 본 모양, 위쪽이 기수 → 오른쪽을 보게 돌린다)
const PLANE_GLYPH = 'M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z'
const ROUTE = 'M 8 138 C 110 40 230 6 340 26'

/** 로그인 직후 첫 화면 위쪽에 깔리는 그림: 항로와 그 위의 비행기, 그리고 터보팬 엔진 정면 */
function BannerArt() {
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  return (
    <svg viewBox="0 0 520 160" className="h-full w-full" preserveAspectRatio="xMaxYMid slice" fill="none" aria-hidden="true">
      <path id="banner-route" d={ROUTE} stroke="var(--accent-ink)" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
      <path d="M 8 150 C 130 70 250 36 350 52" stroke="var(--accent-ink)" strokeOpacity="0.22" strokeWidth="1.5" strokeDasharray="2 12" strokeLinecap="round" />
      {[[8, 138], [340, 26]].map(([x, y]) => (
        <circle key={x} cx={x} cy={y} r="3.5" fill="var(--accent-ink)" fillOpacity="0.7" />
      ))}
      <FanFace />
      {/* 항로 위의 비행기: 움직이는 동안은 경로를 따라 날고, '동작 줄이기' 설정이면 경로 중간에 멈춰 있다 */}
      <g fill="var(--accent-ink)" transform={reduced ? 'translate(171 38) rotate(-18)' : undefined}>
        {!reduced && (
          <animateMotion dur="7s" repeatCount="indefinite" rotate="auto">
            <mpath href="#banner-route" />
          </animateMotion>
        )}
        <path d={PLANE_GLYPH} transform="scale(1.35) translate(-12 -12) rotate(90 12 12)" />
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
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[58%] sm:block">
        <BannerArt />
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

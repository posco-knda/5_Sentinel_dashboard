import { partTone } from '../lib/parts'

export interface SchematicPart {
  id: string
  label: string
  /** 그 모듈 센서들의 평균 변화 배수 (없으면 아직 계산 전) */
  score: number | null
}

/** 모듈 도형 — 좌표는 viewBox 900×260 기준, 엔진 축(y=130)을 중심으로 위아래 대칭 */
const SHAPES: Record<string, { d: string; lx: number }> = {
  fan: { d: 'M 70 52 Q 88 46 106 52 L 106 208 Q 88 214 70 208 Q 62 130 70 52 Z', lx: 88 },
  lpc: { d: 'M 114 92 L 190 100 L 190 160 L 114 168 Z', lx: 152 },
  hpc: { d: 'M 198 100 L 348 112 L 348 148 L 198 160 Z', lx: 273 },
  core: { d: 'M 356 104 Q 356 100 362 100 L 452 100 Q 458 100 458 104 L 458 156 Q 458 160 452 160 L 362 160 Q 356 160 356 156 Z', lx: 407 },
  hpt: { d: 'M 466 106 L 524 98 L 524 162 L 466 154 Z', lx: 495 },
  lpt: { d: 'M 532 96 L 660 82 L 660 178 L 532 164 Z', lx: 596 },
}

const SHORT: Record<string, string> = { fan: '팬', lpc: 'LPC', hpc: 'HPC', core: '연소실', hpt: 'HPT', lpt: 'LPT' }

/** 엔진 단면 구조도 — 모듈을 누르면 선택되고, 색은 센서 변화 정도를 뜻한다 */
export function EngineSchematic({ parts, selected, onSelect, topId }: { parts: SchematicPart[]; selected: string; onSelect: (id: string) => void; topId?: string | null }) {
  const byId = Object.fromEntries(parts.map((p) => [p.id, p]))
  return (
    <svg viewBox="0 0 900 260" className="block h-auto w-full" role="group" aria-label="엔진 구조도">
      {/* 외부 케이스(나셀)와 바이패스 통로 */}
      <path d="M 52 34 L 700 34 Q 770 40 840 92 L 840 168 Q 770 220 700 226 L 52 226 Q 40 130 52 34 Z" fill="color-mix(in oklab, var(--text-muted) 6%, transparent)" stroke="var(--border-strong)" strokeWidth="1.5" />
      <path d="M 114 52 L 690 52 Q 740 56 790 100 M 114 208 L 690 208 Q 740 204 790 160" fill="none" stroke="var(--border)" strokeWidth="1" strokeDasharray="4 6" />
      {/* 엔진 축과 공기 흐름 방향 */}
      <line x1="40" y1="130" x2="860" y2="130" stroke="var(--border)" strokeWidth="1" strokeDasharray="2 5" />
      <path d="M 660 82 L 780 112 L 780 148 L 660 178 Z" fill="none" stroke="var(--border-strong)" strokeWidth="1.2" />
      <path d="M 14 130 L 40 130 M 32 124 L 40 130 L 32 136" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 840 130 L 880 130 M 872 124 L 880 130 L 872 136" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {Object.entries(SHAPES).map(([id, s]) => {
        const p = byId[id]
        if (!p) return null
        const tone = partTone(p.score)
        const on = selected === id
        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-pressed={on}
            aria-label={`${p.label}${p.score != null ? ` 변화 ×${p.score.toFixed(1)}` : ''}`}
            onClick={() => onSelect(id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(id)
              }
            }}
            style={{ cursor: 'pointer', outline: 'none' }}
          >
            <path d={s.d} fill={`color-mix(in oklab, ${tone.color} ${on ? 38 : 22}%, var(--surface-1))`} stroke={on ? 'var(--accent)' : tone.color} strokeWidth={on ? 3 : 1.6} strokeLinejoin="round" />
            {id === 'fan' && [78, 100, 122, 144, 166, 188].map((y) => <line key={y} x1="74" y1={y} x2="102" y2={y} stroke={tone.color} strokeOpacity="0.55" strokeWidth="1.5" />)}
            {id === 'hpc' && [225, 255, 285, 315].map((x) => <line key={x} x1={x} y1={112 - (x - 198) * 0.05} x2={x} y2={148 + (x - 198) * 0.05} stroke={tone.color} strokeOpacity="0.4" strokeWidth="1.2" />)}
            {id === 'core' && <circle cx="407" cy="130" r="22" fill={tone.color} fillOpacity="0.2" />}
            {p.score != null && (
              <text x={s.lx} y="130" textAnchor="middle" dominantBaseline="middle" fontSize="16" fontWeight="700" className="mono" fill="var(--text-primary)" style={{ pointerEvents: 'none' }}>
                ×{p.score.toFixed(1)}
              </text>
            )}
            <text x={s.lx} y={id === 'fan' ? 248 : 252} textAnchor="middle" fontSize="19" fontWeight={on ? 700 : 500} fill={on ? 'var(--text-primary)' : 'var(--text-secondary)'}>
              {SHORT[id] ?? p.label}
            </text>
            {topId === id && (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={s.lx - 26} y={id === 'fan' ? 12 : 56} width="52" height="21" rx="10.5" fill="var(--status-critical)" />
                <text x={s.lx} y={id === 'fan' ? 27 : 71} textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">점검</text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}

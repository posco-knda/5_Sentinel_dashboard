import { motion } from 'framer-motion'
import { scenarioCompare } from '../data/mock'

function CompareChart({ metric, asIs, toBe, delay }: { metric: string; asIs: number; toBe: number; delay: number }) {
  const max = Math.max(asIs, toBe)
  const asIsH = (asIs / max) * 90
  const toBeH = (toBe / max) * 90

  return (
    <div className="flex flex-col items-center surface-card border p-5" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <span className="mb-3 text-center text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
        {metric}
      </span>
      <svg viewBox="0 0 160 140" width={140} height={122}>
        <text x={52} y={120 - asIsH - 6} textAnchor="middle" fontSize="13" fontWeight={600} fontFamily="var(--font-mono)" fill="var(--text-secondary)">
          {asIs}
        </text>
        <motion.rect
          x={40}
          width={24}
          rx={1}
          fill="var(--series-2)"
          initial={{ y: 120, height: 0 }}
          animate={{ y: 120 - asIsH, height: asIsH }}
          transition={{ duration: 0.8, delay }}
        />

        <text x={108} y={120 - toBeH - 6} textAnchor="middle" fontSize="13" fontWeight={600} fontFamily="var(--font-mono)" fill="var(--accent)">
          {toBe}
        </text>
        <motion.rect
          x={96}
          width={24}
          rx={1}
          fill="var(--accent)"
          initial={{ y: 120, height: 0 }}
          animate={{ y: 120 - toBeH, height: toBeH }}
          transition={{ duration: 0.8, delay: delay + 0.15 }}
        />

        <line x1={24} y1={120} x2={136} y2={120} stroke="var(--axis)" strokeWidth={1} />
      </svg>
    </div>
  )
}

export function Simulation() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="m-0 text-xl font-semibold">정비 시나리오 비교 시뮬레이션</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          문제 생긴 뒤 고침(AS-IS)과 미리 알고 대비함(TO-BE)을 같은 조건에서 비교합니다
        </p>
      </div>

      <div className="flex flex-row items-center gap-5">
        <span className="flex flex-row items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          <span className="h-2.5 w-2.5" style={{ background: 'var(--series-2)' }} />
          AS-IS · 문제 생긴 뒤 고침
        </span>
        <span className="flex flex-row items-center gap-1.5 text-[13px]" style={{ color: 'var(--accent)' }}>
          <span className="h-2.5 w-2.5" style={{ background: 'var(--accent)' }} />
          TO-BE · 미리 알고 대비함
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {scenarioCompare.map((s, i) => (
          <CompareChart key={s.metric} metric={s.metric} asIs={s.asIs} toBe={s.toBe} delay={i * 0.1} />
        ))}
      </div>

      <div className="grid grid-cols-[1.2fr_1fr] gap-4">
        <div className="flex flex-col justify-center gap-1.5 surface-card border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            예상 연간 절감 효과
          </span>
          <span className="text-[36px] font-bold" style={{ color: 'var(--accent)' }}>[ XX ] 백만원 · ROI [ XX ]%</span>
          <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            위 3개 지표의 월간 절감분을 연 환산한 예시 값입니다
          </span>
        </div>
        <div className="flex flex-col justify-center gap-2 surface-card border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <span className="mb-1 text-[12.5px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
            시뮬레이션 가정
          </span>
          <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            · 대상 스탠드 5개, 평균 가동률 92%
          </span>
          <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            · 정비 인건비 [ ] 만원/시간 기준
          </span>
          <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
            · 생산차질 손실은 라인 정지 시간당 환산치
          </span>
        </div>
      </div>

      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        ※ 위 수치는 시뮬레이션을 위한 예시 값이며, 파일럿 운영 데이터 확보 후 실측치로 교체될 예정입니다.
      </p>
    </div>
  )
}

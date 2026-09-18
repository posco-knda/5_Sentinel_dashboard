import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { scenarioCompare } from '../data/mock'

/** 백만원 단위 숫자를 1억 이상이면 "N.NN억원", 미만이면 "N백만원"으로 표시 */
function formatWon(millionWon: number): string {
  if (Math.abs(millionWon) >= 100) {
    const eok = Math.round((millionWon / 100) * 100) / 100
    return `${eok.toLocaleString('ko-KR', { maximumFractionDigits: 2 })}억원`
  }
  return `${Math.round(millionWon).toLocaleString('ko-KR')}백만원`
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  format: (v: number) => string
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-start justify-between gap-3">
        <span className="text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span className="mono shrink-0 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        className="range-input"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

function CompareChart({ metric, asIs, toBe, delay }: { metric: string; asIs: number; toBe: number; delay: number }) {
  const max = Math.max(asIs, toBe, 1)
  const asIsH = (asIs / max) * 90
  const toBeH = (toBe / max) * 90

  return (
    <div className="flex flex-col items-center surface-card border p-5" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <span className="mb-3 text-center text-[13px]" style={{ color: 'var(--text-secondary)' }}>
        {metric}
      </span>
      <svg viewBox="0 0 160 140" width={140} height={122}>
        <text x={52} y={120 - asIsH - 6} textAnchor="middle" fontSize="13" fontWeight={600} fontFamily="var(--font-mono)" fill="var(--text-secondary)">
          {asIs}
        </text>
        <motion.rect
          x={40}
          width={24}
          rx={4}
          fill="var(--series-2)"
          initial={{ y: 120, height: 0 }}
          animate={{ y: 120 - asIsH, height: asIsH }}
          transition={{ duration: 0.4, delay }}
        />

        <text x={108} y={120 - toBeH - 6} textAnchor="middle" fontSize="13" fontWeight={600} fontFamily="var(--font-mono)" fill="var(--accent)">
          {toBe}
        </text>
        <motion.rect
          x={96}
          width={24}
          rx={4}
          fill="var(--accent)"
          initial={{ y: 120, height: 0 }}
          animate={{ y: 120 - toBeH, height: toBeH }}
          transition={{ duration: 0.4, delay: delay + 0.05 }}
        />

        <line x1={24} y1={120} x2={136} y2={120} stroke="var(--axis)" strokeWidth={1} />
      </svg>
    </div>
  )
}

const BASE_STANDS = 5

export function Simulation() {
  const [standCount, setStandCount] = useState(5)
  const [laborMult, setLaborMult] = useState(1)
  const [lossMult, setLossMult] = useState(1)
  const [systemCost, setSystemCost] = useState(60)

  const scaled = useMemo(() => {
    const standFactor = standCount / BASE_STANDS
    return scenarioCompare.map((s, i) => {
      let mult = standFactor
      if (i === 1) mult *= laborMult
      if (i === 2) mult *= lossMult
      return { metric: s.metric, asIs: Math.round(s.asIs * mult), toBe: Math.round(s.toBe * mult) }
    })
  }, [standCount, laborMult, lossMult])

  const monthlySavings = (scaled[1].asIs - scaled[1].toBe) + (scaled[2].asIs - scaled[2].toBe)
  const annualSavings = monthlySavings * 12
  const roi = systemCost > 0 ? Math.round((annualSavings / systemCost) * 100) : 0

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="m-0 text-xl font-semibold">정비 시나리오 비교 시뮬레이션</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          아래 가정을 조절하면 사후보전(고장 후 수리)과 예지보전(사전 예측 대응)의 비용 격차가 실시간으로 다시
          계산됩니다
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="surface-card flex flex-col gap-5 border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <p className="m-0 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            시뮬레이션 가정 조절
          </p>
          <Slider
            label="대상 스탠드 수"
            value={standCount}
            onChange={setStandCount}
            min={1}
            max={5}
            step={1}
            format={(v) => `${v}개`}
          />
          <Slider
            label="정비 인건비 배율"
            value={laborMult}
            onChange={setLaborMult}
            min={0.5}
            max={2}
            step={0.1}
            format={(v) => `×${v.toFixed(1)}`}
          />
          <Slider
            label="라인 정지 손실 단가 배율"
            value={lossMult}
            onChange={setLossMult}
            min={0.5}
            max={2}
            step={0.1}
            format={(v) => `×${v.toFixed(1)}`}
          />
          <Slider
            label="예지보전 시스템 연간 운영비용"
            value={systemCost}
            onChange={setSystemCost}
            min={20}
            max={150}
            step={5}
            format={formatWon}
          />
          <p className="m-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            · 기준값은 대상 스탠드 5개, 평균 가동률 92% 시나리오의 예시 수치입니다
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-row items-center gap-5">
            <span className="flex flex-row items-center gap-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--series-2)' }} />
              사후보전 · 고장 후 수리
            </span>
            <span className="flex flex-row items-center gap-1.5 text-[13px]" style={{ color: 'var(--accent)' }}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: 'var(--accent)' }} />
              예지보전 · 사전 예측 대응
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {scaled.map((s, i) => (
              <CompareChart key={s.metric} metric={s.metric} asIs={s.asIs} toBe={s.toBe} delay={i * 0.05} />
            ))}
          </div>

          <motion.div
            key={`${annualSavings}-${roi}`}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col justify-center gap-1.5 surface-card border p-6"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              예상 연간 절감 효과
            </span>
            <span className="text-[34px] font-bold" style={{ color: 'var(--accent)' }}>
              {formatWon(annualSavings)} · ROI {roi}%
            </span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              정비 비용·생산차질 손실의 월간 절감분을 연 환산 후, 시스템 운영비용 대비 수익률을 계산한 예시 값입니다
            </span>
          </motion.div>
        </div>
      </div>

      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        ※ 위 수치는 시뮬레이션을 위한 예시 값이며, 파일럿 운영 데이터 확보 후 실측치로 교체될 예정입니다.
      </p>
    </div>
  )
}

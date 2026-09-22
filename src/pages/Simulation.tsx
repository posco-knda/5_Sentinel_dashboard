import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { costModel, savingsSummary } from '../data/mock'

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

type Mult = { repair: number; loss: number; unplanned: number }

/** 시험 구간의 이상 사건 요약(costModel)에 비용 가정을 곱해서 AS-IS/TO-BE 비용을 다시 계산한다.
 *  계산식은 analysis/src/cost.py 와 같다. 금액 = 만원, 시간 = h */
function computeScenario(m: Mult) {
  const g = costModel.general
  const hourCost = g.downtimeCostPerHour * m.loss
  const acc = { asis: { hours: 0, repair: 0, coils: 0 }, tobe: { hours: 0, repair: 0, coils: 0 } }
  let coilsAsis3 = 0
  let coilsTobe3 = 0
  for (const [name, t] of Object.entries(costModel.types)) {
    const hu = t.hoursUnplanned * m.unplanned
    const repP = t.repairPlanned * m.repair
    const repU = repP * g.repairUnplannedRatio
    acc.asis.hours += t.episodes * hu
    acc.asis.repair += t.episodes * repU
    acc.asis.coils += t.anomalyCoils
    acc.tobe.hours += t.detected * t.hoursPlanned + t.missed * hu + t.falseAlarms * g.falseAlarmHours
    acc.tobe.repair += t.detected * repP + t.missed * repU + t.falseAlarms * g.falseAlarmLabor * m.repair
    acc.tobe.coils += t.detectedCoils + t.missedCoils
    if (name !== 'Reduction') {
      coilsAsis3 += t.anomalyCoils
      coilsTobe3 += t.detectedCoils + t.missedCoils
    }
  }
  const loss = (x: { hours: number; coils: number }) => x.hours * hourCost + x.coils * g.coilLoss
  const per1000 = 1000 / costModel.nCoils
  const asisTotal = acc.asis.repair + loss(acc.asis)
  const tobeTotal = acc.tobe.repair + loss(acc.tobe)
  const r1 = (v: number) => Math.round(v * 10) / 10
  return {
    metrics: [
      { metric: '평균 정지시간 (시간/1,000코일)', asIs: r1(acc.asis.hours * per1000), toBe: r1(acc.tobe.hours * per1000) },
      { metric: '정비 비용 (백만원/1,000코일)', asIs: r1((acc.asis.repair * per1000) / 100), toBe: r1((acc.tobe.repair * per1000) / 100) },
      { metric: '생산차질 손실 (백만원/1,000코일)', asIs: r1((loss(acc.asis) * per1000) / 100), toBe: r1((loss(acc.tobe) * per1000) / 100) },
    ],
    savingPer1000: Math.round(((asisTotal - tobeTotal) * per1000) / 100),
    savingRate: asisTotal > 0 ? Math.round(((asisTotal - tobeTotal) / asisTotal) * 1000) / 10 : 0,
    coilReduction: coilsAsis3 > 0 ? Math.round((1 - coilsTobe3 / coilsAsis3) * 100) : 0,
  }
}

export function Simulation() {
  const [repairMult, setRepairMult] = useState(1)
  const [lossMult, setLossMult] = useState(1)
  const [unplannedMult, setUnplannedMult] = useState(1)

  const result = useMemo(
    () => computeScenario({ repair: repairMult, loss: lossMult, unplanned: unplannedMult }),
    [repairMult, lossMult, unplannedMult],
  )
  const baseHourCost = costModel.general.downtimeCostPerHour

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="m-0 text-xl font-semibold">정비 시나리오 비교 시뮬레이션</p>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          아래 가정을 조절하면 사후보전(고장 후 수리)과 예지보전(사전 예측 대응)의 비용 격차가 실시간으로 다시
          계산됩니다. 사건 수·탐지율·탐지 지연은 시험 구간의 실제 결과이고, 정지시간·단가는 가정값입니다
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="surface-card flex flex-col gap-5 border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <p className="m-0 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            시뮬레이션 가정 조절
          </p>
          <Slider
            label={`라인 정지 손실 단가 (기준 ${baseHourCost.toLocaleString()}만원/시간)`}
            value={lossMult}
            onChange={setLossMult}
            min={0.1}
            max={4}
            step={0.1}
            format={(v) => `×${v.toFixed(1)} · ${Math.round(baseHourCost * v).toLocaleString()}만원`}
          />
          <Slider
            label="비계획 정지 시간 배율 (사후보전에서 고장 수리에 걸리는 시간)"
            value={unplannedMult}
            onChange={setUnplannedMult}
            min={0.5}
            max={2}
            step={0.1}
            format={(v) => `×${v.toFixed(1)}`}
          />
          <Slider
            label="수리·점검 비용 배율"
            value={repairMult}
            onChange={setRepairMult}
            min={0.5}
            max={2}
            step={0.1}
            format={(v) => `×${v.toFixed(1)}`}
          />
          <p className="m-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            · 기준값: 유형별 비계획 정지 작업롤 4h · 전동기 6h · 베어링 8h, 계획 정지 1~2h, 응급 수리비는 계획 수리비의 4.5배
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
            {result.metrics.map((s, i) => (
              <CompareChart key={s.metric} metric={s.metric} asIs={s.asIs} toBe={s.toBe} delay={i * 0.05} />
            ))}
          </div>

          <motion.div
            key={`${result.savingPer1000}-${result.savingRate}`}
            initial={{ opacity: 0.4 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col justify-center gap-1.5 surface-card border p-6"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
              예상 절감 효과 (코일 1,000개당)
            </span>
            <span className="text-[34px] font-bold" style={{ color: 'var(--accent)' }}>
              {result.savingPer1000.toLocaleString()}백만원 · 절감률 {result.savingRate}%
            </span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              정지가 필요한 이상(전동기·베어링·작업롤)에서 이상 상태로 가공되는 코일이 {result.coilReduction}% 줄어듭니다 (가정과
              무관한 실제 결과). 기준 가정의 절감률은 {savingsSummary.savingRatePct}%입니다
            </span>
          </motion.div>
        </div>
      </div>

      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        ※ 데이터에 비용·정지시간 정보가 없어서 금액과 정지시간은 가정값입니다. 시뮬레이션 데이터는 이상 발생 빈도가 실제 현장보다 훨씬
        높아서, 연간 환산이나 ROI는 계산하지 않았습니다.
      </p>
    </div>
  )
}

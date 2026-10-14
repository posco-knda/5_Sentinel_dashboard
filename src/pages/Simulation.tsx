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

/** 공식 test 엔진들의 실제 탐지/누락/오탐 건수(costModel)에 비용 가정을 곱해서 AS-IS/TO-BE 비용을 다시 계산한다.
 *  계산식은 scripts/08_export_dashboard_ts.py 의 compute_scenario()와 같다.
 *  내부 계산은 만원 단위, 화면에는 억원(1억원 = 10,000만원)으로 표시.
 *  터보팬 데이터는 정비 유형이 엔진 교체(EngineRemoval) 하나뿐이라 costModel.types에 항목이 하나뿐이지만,
 *  원래 대시보드처럼 여러 유형을 합산하는 구조는 그대로 남겨서 유형이 늘어도 고치지 않고 동작하게 했다. */
function computeScenario(m: Mult) {
  const g = costModel.general
  const hourCost = g.downtimeCostPerHour * m.loss
  const acc = { asis: { hours: 0, repair: 0, dangerCases: 0 }, tobe: { hours: 0, repair: 0, dangerCases: 0 } }
  for (const t of Object.values(costModel.types)) {
    const hu = t.hoursUnplanned * m.unplanned
    const repP = t.repairPlanned * m.repair
    const repU = repP * g.repairUnplannedRatio
    acc.asis.hours += t.episodes * hu
    acc.asis.repair += t.episodes * repU
    acc.asis.dangerCases += t.dangerCases
    acc.tobe.hours += t.detected * t.hoursPlanned + t.missed * hu + t.falseAlarms * g.falseAlarmHours
    acc.tobe.repair += t.detected * repP + t.missed * repU + t.falseAlarms * g.falseAlarmLabor * m.repair
    acc.tobe.dangerCases += t.dangerCasesDetected + t.dangerCasesMissed
  }
  const loss = (x: { hours: number; dangerCases: number }) => x.hours * hourCost + x.dangerCases * g.dangerCaseLoss
  const per1000 = 1000 / costModel.nEngines
  const asisTotal = acc.asis.repair + loss(acc.asis)
  const tobeTotal = acc.tobe.repair + loss(acc.tobe)
  const r1 = (v: number) => Math.round(v * 10) / 10
  return {
    metrics: [
      { metric: '가동중단 시간 (시간)', asIs: r1(acc.asis.hours * per1000), toBe: r1(acc.tobe.hours * per1000) },
      { metric: '정비 비용 (억원)', asIs: r1((acc.asis.repair * per1000) / 10000), toBe: r1((acc.tobe.repair * per1000) / 10000) },
      { metric: '가동중단 손실 (억원)', asIs: r1((loss(acc.asis) * per1000) / 10000), toBe: r1((loss(acc.tobe) * per1000) / 10000) },
    ],
    savingPer1000: r1(((asisTotal - tobeTotal) * per1000) / 10000),
    savingRate: asisTotal > 0 ? Math.round(((asisTotal - tobeTotal) / asisTotal) * 1000) / 10 : 0,
    dangerCaseReduction: acc.asis.dangerCases > 0 ? Math.round((1 - acc.tobe.dangerCases / acc.asis.dangerCases) * 100) : 0,
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
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">비용 분석</h1>
        <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          고장 난 뒤 수리하는 방식(사후 정비)과 예측으로 미리 정비하는 방식(예지 정비)의 비용을 비교합니다. 왼쪽 단가를 우리 기준으로 바꿔 보세요.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div className="surface-card flex flex-col gap-5 border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <p className="m-0 text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            시뮬레이션 가정 조절
          </p>
          <Slider
            label={`엔진 가동중단 손실 단가 (기준 ${(baseHourCost / 10000).toFixed(1)}억원/시간)`}
            value={lossMult}
            onChange={setLossMult}
            min={0.1}
            max={4}
            step={0.1}
            format={(v) => `×${v.toFixed(1)} · ${((baseHourCost * v) / 10000).toFixed(2)}억원`}
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
            · 기준값: 비계획 정지(고장 후 교체) 24h vs 계획 정지(RUL 기반 사전 교체) 4h, 오탐 1건당 점검 0.5h, 응급
            수리비는 계획 수리비의 3배
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
          <p className="m-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            엔진 1,000대를 운용한다고 보고 과거 검증에서의 탐지·누락·오경보 비율을 적용한 값입니다
          </p>

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
              예상 절감 효과 (엔진 1,000대 기준)
            </span>
            <span className="text-[34px] font-bold" style={{ color: 'var(--accent)' }}>
              {result.savingPer1000.toLocaleString()}억원 · 절감률 {result.savingRate}%
            </span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              위험 상태로 방치되는 엔진이 {result.dangerCaseReduction}% 줄어듭니다 (단가와 무관하게 탐지·누락 비율에서 나온 값). 기본 단가에서의 절감률은{' '}
              {savingsSummary.savingRatePct}%입니다
            </span>
          </motion.div>
        </div>
      </div>

      <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        ※ 금액과 가동중단 시간은 가정값입니다. 항공사·기종마다 단가가 다르므로 왼쪽 슬라이더를 운영 기준에 맞게 조정하세요. 탐지·누락·오경보 비율은 과거 검증
        결과이며, 검증 표본이 작아 연간 환산이나 투자 회수 기간은 계산하지 않았습니다.
      </p>
    </div>
  )
}

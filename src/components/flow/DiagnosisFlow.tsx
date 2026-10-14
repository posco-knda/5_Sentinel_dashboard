import { useEffect, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { EngineRulChart, type Curve } from '../EngineRulChart'
import { fleetPoints, logRows } from '../../data/detectionLog'
import { partMeta } from '../../data/partFlowMeta'
import type { PartFlow } from '../../data/partFlow'
import { riskThresholds } from '../../data/mock'

// 공기가 지나가는 순서(흡입 → 배기). 이 순서대로 부품 블록을 늘어놓는다.
const GAS_PATH = ['fan', 'lpc', 'hpc', 'core', 'hpt', 'lpt']
const PART_LABEL = Object.fromEntries(partMeta.parts.map((p) => [p.id, p.label])) as Record<string, string>
const SENSOR = Object.fromEntries(partMeta.parts.flatMap((p) => p.sensors.map((s) => [s.id, { ...s, part: p.id }]))) as Record<
  string,
  { id: string; name: string; unit: string; part: string }
>
const SCALE_MAX = 8 // 이 값 이상이면 색을 가장 진하게
const NOTABLE = 2 // 평소 흔들림의 2배 미만은 '뚜렷한 변화 없음'으로 본다 (정상 엔진에 최대 부품을 강조하지 않기 위해)

const intensity = (score: number) => Math.min(1, score / SCALE_MAX)

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children: ReactNode }) {
  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col items-center">
        <span
          className="mono flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 'var(--radius-pill)' }}
        >
          {n}
        </span>
        <span className="mt-1 w-px flex-1" style={{ background: 'var(--border)' }} />
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <p className="m-0 text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {sub && (
          <p className="m-0 mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </p>
        )}
        <div className="mt-3">{children}</div>
      </div>
    </div>
  )
}

/** 공기 흐름 순서로 늘어놓은 부품 블록 — 초기 상태에서 많이 벗어날수록 진하게 */
function PartStrip({ flow }: { flow: PartFlow }) {
  const top = GAS_PATH.reduce((a, b) => (flow.part[b] > flow.part[a] ? b : a))
  const showTop = flow.part[top] >= NOTABLE
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {GAS_PATH.map((id, i) => {
        const score = flow.part[id]
        const isTop = showTop && id === top
        return (
          <motion.div
            key={id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            className="relative flex flex-col gap-1 border p-3"
            style={{
              background: `color-mix(in oklab, var(--status-critical) ${Math.round(intensity(score) * 55)}%, var(--surface-2))`,
              borderColor: isTop ? 'var(--status-critical)' : 'var(--border)',
              borderWidth: isTop ? 2 : 1,
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <span className="text-[11.5px] leading-tight" style={{ color: 'var(--text-secondary)' }}>
              {PART_LABEL[id]}
            </span>
            <span className="mono text-[20px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
              ×{score.toFixed(1)}
            </span>
            <span className="mono text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              정상 평균 ×{partMeta.profile.ok[id].toFixed(1)}
            </span>
            {isTop && (
              <span
                className="absolute -top-2 right-2 px-1.5 text-[10px] font-semibold"
                style={{ background: 'var(--status-critical)', color: '#fff', borderRadius: 'var(--radius-xs)' }}
              >
                최대
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

function SensorTrendCard({ id, z, series }: { id: string; z: number; series: { c: number[]; v: number[]; base: number } }) {
  const s = SENSOR[id]
  const data = series.c.map((c, i) => ({ c, v: series.v[i] }))
  const vs = series.v.concat(series.base)
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const pad = (hi - lo) * 0.12 || 1
  const up = z >= 0
  return (
    <div className="flex min-w-0 flex-col border p-3.5" style={{ background: 'var(--page)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-xs)' }}>
      <div className="flex flex-row items-start justify-between gap-2">
        <span className="min-w-0 text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
          {s.name}
        </span>
        <span
          className="mono shrink-0 px-1.5 py-0.5 text-[11.5px] font-semibold"
          style={{
            background: Math.abs(z) >= NOTABLE ? 'var(--status-critical-wash)' : 'var(--border-soft)',
            color: Math.abs(z) >= NOTABLE ? 'var(--status-critical)' : 'var(--text-muted)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          {up ? '↑' : '↓'} ×{Math.abs(z).toFixed(1)}
        </span>
      </div>
      <div className="mt-1 h-[84px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
            <XAxis dataKey="c" type="number" domain={['dataMin', 'dataMax']} hide />
            <YAxis domain={[lo - pad, hi + pad]} hide />
            <ReferenceLine y={series.base} stroke="var(--text-muted)" strokeDasharray="4 3" />
            <Tooltip
              cursor={{ stroke: 'var(--axis)' }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const d = payload[0].payload as { c: number; v: number }
                return (
                  <div
                    className="mono border px-2.5 py-1.5 text-[11.5px]"
                    style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}
                  >
                    #{d.c} · <b>{d.v}</b> {s.unit}
                  </div>
                )
              }}
            />
            <Area type="monotone" dataKey="v" stroke="var(--series-1)" strokeWidth={2} fill="var(--series-1)" fillOpacity={0.14} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        점선 = 초기 평균 {series.base} {s.unit} · {PART_LABEL[s.part]}
      </span>
    </div>
  )
}

/** 고장 진단 플로우: ① 센서 변화 → ② 관련 부품 추정 → ③ 모델이 알아챈 시점 → ④ 권고 조치 */
export function DiagnosisFlow({ unit }: { unit: number }) {
  const [flow, setFlow] = useState<PartFlow | null>(null)
  const [curve, setCurve] = useState<Curve | undefined>()
  const logRow = logRows.find((r) => r.unit === unit)
  const point = fleetPoints.find((p) => p.unit === unit)

  useEffect(() => {
    let alive = true
    import('../../data/partFlow').then((m) => alive && setFlow(m.partFlow[unit] ?? null))
    if (logRow) import('../../data/detectionCurves').then((m) => alive && setCurve(m.detectionCurves[unit]))
    return () => {
      alive = false
    }
  }, [unit, logRow])

  if (!flow || !point) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        불러오는 중…
      </div>
    )
  }

  const topPart = GAS_PATH.reduce((a, b) => (flow.part[b] > flow.part[a] ? b : a))
  const topSensor = SENSOR[flow.top[0]]
  const notable = flow.part[topPart] >= NOTABLE
  const partClause = notable ? `${PART_LABEL[topPart]} 계통(${topSensor.name.split(' · ')[0]})` : null
  const lvl = point.level
  const action =
    lvl === 'red'
      ? `위험 — 다음 정비 슬롯에 배정하고 부품·인력을 준비합니다(준비 최소 7일, 논문 운영 조건 가정).${partClause ? ` ${partClause}부터 점검할 것을 권고합니다.` : ' 특정 부품에 치우친 변화는 뚜렷하지 않아 전체 점검을 권고합니다.'}`
      : lvl === 'warn'
        ? `주의 — 정비 계획을 준비하고, ${partClause ?? '센서'} 추이를 주기적으로 확인합니다.`
        : '정상 — 정기 모니터링을 유지합니다. 센서 변화는 정상 범위의 흔들림입니다.'

  return (
    <div className="flex flex-col">
      <Step n={1} title="센서 변화 포착" sub={`처음 ${partMeta.baselineCycles}사이클 평균 대비 최근 ${partMeta.recentCycles}사이클 평균 · ×N = 평소 흔들림의 N배`}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {flow.trend.map((t) => (
              <SensorTrendCard key={t.s} id={t.s} z={flow.z[t.s]} series={t} />
            ))}
          </div>
        </div>
      </Step>

      <Step n={2} title={notable ? `관련 부품 추정 — ${PART_LABEL[topPart]}` : '관련 부품 추정 — 뚜렷하게 변한 부품 없음'} sub="센서가 측정하는 위치 기준 · 부품 이탈도 = 소속 센서 이탈도(|×N|)의 평균">
        <PartStrip flow={flow} />
        <p className="mb-0 mt-2.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          공기가 지나가는 순서(왼쪽 흡입 → 오른쪽 배기). 고장 원인을 판정한 것이 아니라 가장 크게 변한 센서가 속한 부품을 추정한 값입니다
          (FD004에는 엔진별 고장 모드 정답이 없음).{flow.short && ' 관측이 짧은 엔진이라 참고용입니다.'}
        </p>
      </Step>

      <Step
        n={3}
        title={logRow ? '모델이 알아챈 시점' : '모델 판단'}
        sub={logRow ? '예측 남은 수명이 주의(<80)·위험(≤40) 구간에 계속 머무르기 시작한 사이클' : undefined}
      >
        {logRow ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <EngineRulChart row={logRow} curve={curve} />
            <div className="flex flex-col gap-3">
              {[
                { label: '주의 시작', value: logRow.warnSince == null ? '—' : `cycle #${logRow.warnSince} · 고장 ${logRow.trueEnd + (logRow.lastCycle - logRow.warnSince)}사이클 전` },
                { label: '위험 시작', value: logRow.dangerSince == null ? '—' : `cycle #${logRow.dangerSince} · 고장 ${logRow.leadDanger}사이클 전` },
                { label: '일시 경보', value: logRow.transientDanger + logRow.transientWarn === 0 ? '없음' : `위험 ${logRow.transientDanger}회 · 주의 ${logRow.transientWarn}회` },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{f.label}</div>
                  <div className="mt-0.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{f.value}</div>
                </div>
              ))}
              <p className="m-0 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                고장까지 남은 사이클은 평가용 정답으로 계산한 값입니다 (현장에서는 알 수 없음)
              </p>
            </div>
          </div>
        ) : (
          <p className="m-0 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            예측 남은 수명 {point.pred}사이클로 경보 구간(&lt;{riskThresholds.warningRul})에 들어간 적이 없습니다.
          </p>
        )}
      </Step>

      <div className="flex flex-row gap-4">
        <span
          className="mono flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-semibold"
          style={{ background: lvl === 'red' ? 'var(--status-critical)' : lvl === 'warn' ? 'var(--status-warning)' : 'var(--status-good)', color: '#fff', borderRadius: 'var(--radius-pill)' }}
        >
          4
        </span>
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[14.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
            권고 조치
          </p>
          <p className="m-0 mt-2 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {action}
          </p>
        </div>
      </div>
    </div>
  )
}

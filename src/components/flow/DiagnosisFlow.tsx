import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, ReferenceLine, Tooltip, ResponsiveContainer } from 'recharts'
import { EngineRulChart } from '../EngineRulChart'
import { partMeta } from '../../data/partFlowMeta'
import type { PartFlow } from '../../data/partFlow'
import { actionText } from '../../lib/diagnosis'
import { NOTABLE_Z, PART_LABEL, URGENCY, daysText } from '../../lib/fleet'
import { useSettings } from '../../lib/settings'
import type { EngineData } from '../../lib/useEngine'

// 공기가 지나가는 순서(흡입 → 배기). 이 순서대로 모듈 블록을 늘어놓는다.
const GAS_PATH = ['fan', 'lpc', 'hpc', 'core', 'hpt', 'lpt']
const SENSOR = Object.fromEntries(partMeta.parts.flatMap((p) => p.sensors.map((s) => [s.id, { ...s, part: p.id }]))) as Record<
  string,
  { id: string; name: string; unit: string; part: string }
>
const SCALE_MAX = 8 // 이 값 이상이면 색을 가장 진하게
const intensity = (score: number) => Math.min(1, score / SCALE_MAX)

function Step({ n, title, sub, children, last = false }: { n: number; title: string; sub?: string; children: ReactNode; last?: boolean }) {
  return (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col items-center">
        <span
          className="mono flex h-7 w-7 shrink-0 items-center justify-center text-[13px] font-semibold"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 'var(--radius-pill)' }}
        >
          {n}
        </span>
        {!last && <span className="mt-1 w-px flex-1" style={{ background: 'var(--border)' }} />}
      </div>
      <div className={`min-w-0 flex-1 ${last ? '' : 'pb-6'}`}>
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

/** 공기 흐름 순서로 늘어놓은 모듈 블록 — 초기 상태에서 많이 벗어날수록 진하게 */
export function PartStrip({ flow }: { flow: PartFlow }) {
  const top = GAS_PATH.reduce((a, b) => (flow.part[b] > flow.part[a] ? b : a))
  const showTop = flow.part[top] >= NOTABLE_Z
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
              <span className="absolute -top-2 right-2 px-1.5 text-[10px] font-semibold" style={{ background: 'var(--status-critical)', color: '#fff', borderRadius: 'var(--radius-xs)' }}>
                최대
              </span>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}

export function SensorTrendCard({ id, z, series }: { id: string; z: number; series: { c: number[]; v: number[]; base: number } }) {
  const s = SENSOR[id]
  const data = series.c.map((c, i) => ({ c, v: series.v[i] }))
  const vs = series.v.concat(series.base)
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const pad = (hi - lo) * 0.12 || 1
  const notable = Math.abs(z) >= NOTABLE_Z
  return (
    <div className="flex min-w-0 flex-col border p-3.5" style={{ background: 'var(--page)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-xs)' }}>
      <div className="flex flex-row items-start justify-between gap-2">
        <span className="min-w-0 text-[12px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
          {s.name}
        </span>
        <span
          className="mono shrink-0 px-1.5 py-0.5 text-[11.5px] font-semibold"
          style={{
            background: notable ? 'var(--status-critical-wash)' : 'var(--border-soft)',
            color: notable ? 'var(--status-critical)' : 'var(--text-muted)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          {z >= 0 ? '↑' : '↓'} ×{Math.abs(z).toFixed(1)}
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
                  <div className="mono border px-2.5 py-1.5 text-[11.5px]" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-xs)' }}>
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

/** 고장 진단 플로우: ① 센서 변화 → ② 점검 예상 모듈 → ③ 시스템이 알린 시점 → ④ 권고 조치 */
export function DiagnosisFlow({ data }: { data: EngineData }) {
  const { settings } = useSettings()
  const { facts, flow, curve, runs, engine } = data
  if (!facts || !engine || !data.ready || !flow) {
    return (
      <div className="flex h-[260px] items-center justify-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        불러오는 중…
      </div>
    )
  }
  const notable = !!facts.topPart
  const ago = (c: number) => `${c} cycle(${daysText(c / settings.cyclesPerDay)}) 전`
  const levelColor = engine.level === 'red' ? 'var(--status-critical)' : engine.level === 'warn' ? 'var(--status-warning)' : 'var(--status-good)'

  return (
    <div className="flex flex-col">
      <Step n={1} title="센서 변화 포착" sub={`처음 ${partMeta.baselineCycles}사이클 평균 대비 최근 ${partMeta.recentCycles}사이클 평균 · ×N = 평소 흔들림의 N배`}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {flow.trend.map((t) => (
            <SensorTrendCard key={t.s} id={t.s} z={flow.z[t.s]} series={t} />
          ))}
        </div>
      </Step>

      <Step n={2} title={notable ? `점검 예상 모듈 — ${facts.topPart!.label}` : '점검 예상 모듈 — 뚜렷하게 변한 모듈 없음'} sub="센서가 측정하는 위치 기준 · 모듈 이탈도 = 소속 센서 이탈도(|×N|)의 평균">
        <PartStrip flow={flow} />
        <p className="mb-0 mt-2.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          공기가 지나가는 순서(왼쪽 흡입 → 오른쪽 배기). 고장 원인을 확정한 것이 아니라 가장 크게 변한 센서가 속한 모듈을 점검 우선순위로 추정한 값입니다.
        </p>
      </Step>

      <Step n={3} title={runs && (runs.warnSince != null || runs.dangerSince != null) ? '시스템이 알린 시점' : '경보 이력'} sub="예측 남은 수명이 주의·위험 구간에 계속 머무르기 시작한 사이클">
        {curve ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
            <EngineRulChart curve={curve} runs={runs} dangerN={settings.dangerN} />
            <div className="flex flex-col gap-3">
              {[
                { label: '주의 시작', value: facts.warnAgo == null ? '—' : `cycle #${runs!.warnSince} · ${ago(facts.warnAgo)}` },
                { label: '위험 시작', value: facts.dangerAgo == null ? '—' : `cycle #${runs!.dangerSince} · ${ago(facts.dangerAgo)}` },
                { label: '일시 경보', value: facts.transientDanger + facts.transientWarn === 0 ? '없음' : `위험 ${facts.transientDanger}회 · 주의 ${facts.transientWarn}회 (켜졌다가 꺼짐)` },
              ].map((f) => (
                <div key={f.label}>
                  <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{f.label}</div>
                  <div className="mt-0.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{f.value}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="m-0 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            예측 남은 수명 {engine.pred} cycle — 경보 구간에 들어간 적이 없습니다.
          </p>
        )}
      </Step>

      <Step n={4} title="권고 조치" last>
        <p className="m-0 text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <b style={{ color: levelColor }}>{URGENCY[engine.urgency].label}</b> — {actionText(facts)}
        </p>
      </Step>
    </div>
  )
}

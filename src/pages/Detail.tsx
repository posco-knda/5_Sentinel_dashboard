import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { EngineSwitcher } from '../components/EngineSwitcher'
import { EngineRulChart } from '../components/EngineRulChart'
import { Panel } from '../components/Panel'
import { SurvivalCurveChart } from '../components/SurvivalCurveChart'
import { DiagnosisFlow, SensorTrendCard } from '../components/flow/DiagnosisFlow'
import { PlanControl } from '../components/ops/PlanControl'
import { UrgencyChip } from '../components/ops/UrgencyChip'
import { partMeta } from '../data/partFlowMeta'
import { actionText, ruleSummary } from '../lib/diagnosis'
import { LEVEL, NOTABLE_Z, daysText, deadlineText, limitDate, requestDate, useFleet, type FleetEngine } from '../lib/fleet'
import { ACTION_LABEL, usePlan } from '../lib/plan'
import { ROLE_LABEL } from '../lib/auth'
import { useSettings } from '../lib/settings'
import { useEngineData, type EngineData } from '../lib/useEngine'
import type { EquipmentRow } from '../data/mock'

const TABS = [
  { id: 'overview', label: '개요' },
  { id: 'diagnosis', label: '고장 진단' },
  { id: 'sensors', label: '센서' },
  { id: 'history', label: '이력' },
] as const
type TabId = (typeof TABS)[number]['id']

const mdy = (s: string) => s.slice(5).replace('-', '/')

function OverviewTab({ data }: { data: EngineData }) {
  const { settings } = useSettings()
  const { engine, facts, survival, interval, curve, runs } = data
  if (!engine || !facts) return null
  const cpd = settings.cyclesPerDay
  const color = LEVEL[engine.level].color
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-5">
        <Panel title="예측 남은 수명" sub="남은 수명 = 앞으로 더 비행할 수 있는 횟수(cycle) · 음영은 예측의 불확실성 범위">
          <div className="flex flex-row flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-[40px] font-bold leading-none" style={{ color }}>
              약 <span className="mono">{engine.pred}</span> cycle
            </span>
            <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{daysText(engine.daysLeft)} (하루 {cpd}회 비행 기준)</span>
          </div>
          {interval && (
            <p className="m-0 mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              90% 구간 {interval[0]}~{interval[1]} cycle ({daysText(interval[0] / cpd)}~{daysText(interval[1] / cpd)} 사이)
            </p>
          )}
          {survival && interval && (
            <div className="mt-4">
              <SurvivalCurveChart data={survival} predictedRul={{ median: engine.pred, lower: interval[0], upper: interval[1] }} />
            </div>
          )}
        </Panel>
        <Panel title="예측 남은 수명 추이" sub="비행할수록 줄어드는 과정 · 색 구간은 위험·주의">
          {curve ? <EngineRulChart curve={curve} runs={runs} dangerN={settings.dangerN} /> : <p className="m-0 text-[13px]" style={{ color: 'var(--text-secondary)' }}>경보 구간에 들어간 적이 없어 추이를 따로 보여 줄 필요가 없습니다.</p>}
        </Panel>
      </div>

      <Panel title="요약과 권고">
        <div className="mb-3 flex flex-row flex-wrap items-center gap-2">
          <UrgencyChip urgency={engine.urgency} />
          <span className="text-[12.5px]" style={{ color: engine.requestIn <= 0 ? 'var(--status-critical)' : 'var(--text-secondary)' }}>
            정비 요청 기한 {engine.requestIn <= 0 ? '지남' : deadlineText(engine.requestIn)}
          </span>
        </div>
        <p className="m-0 text-[13.5px] font-medium leading-relaxed" style={{ color: 'var(--text-primary)' }}>{actionText(facts)}</p>
        <ul className="m-0 mt-4 flex list-disc flex-col gap-1.5 pl-5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {ruleSummary(facts).slice(0, -2).map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <Link to={`/report/engine-${engine.unit}`} className="mt-4 inline-block border px-3.5 py-1.5 text-[12.5px] font-medium no-underline" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}>
          진단 리포트 열기 (PDF 저장)
        </Link>
      </Panel>
    </div>
  )
}

function SensorsTab({ data }: { data: EngineData }) {
  const { flow } = data
  if (!flow) return <div className="flex h-[200px] items-center justify-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>불러오는 중…</div>
  return (
    <div className="flex flex-col gap-5">
      <Panel title="모듈별 센서 변화" sub={`처음 ${partMeta.baselineCycles}사이클 평균 대비 최근 ${partMeta.recentCycles}사이클 평균 · ×N = 평소 흔들림의 N배, 빨강은 ×${NOTABLE_Z} 이상`}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {partMeta.parts.map((p) => {
            const score = p.sensors.reduce((s, x) => s + Math.abs(flow.z[x.id]), 0) / p.sensors.length
            return (
              <div key={p.id} className="border p-4" style={{ background: 'var(--page)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-xs)' }}>
                <div className="mb-2.5 flex flex-row items-center justify-between">
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{p.label}</span>
                  <span className="mono text-[12px]" style={{ color: score >= NOTABLE_Z ? 'var(--status-critical)' : 'var(--text-muted)' }}>×{score.toFixed(1)}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {p.sensors.map((s) => {
                    const z = flow.z[s.id]
                    const hot = Math.abs(z) >= NOTABLE_Z
                    return (
                      <div key={s.id} className="flex flex-col gap-1">
                        <div className="flex flex-row items-center justify-between gap-2 text-[11.5px]">
                          <span className="min-w-0 truncate" style={{ color: 'var(--text-secondary)' }} title={s.name}>{s.name}</span>
                          <span className="mono shrink-0" style={{ color: hot ? 'var(--status-critical)' : 'var(--text-muted)' }}>{z >= 0 ? '↑' : '↓'} ×{Math.abs(z).toFixed(1)}</span>
                        </div>
                        <div className="h-1.5" style={{ background: 'var(--surface-2)', borderRadius: 2 }}>
                          <div className="h-full" style={{ width: `${Math.min(100, (Math.abs(z) / 10) * 100)}%`, background: hot ? 'var(--status-critical)' : 'var(--text-muted)', borderRadius: 2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </Panel>
      <Panel title="가장 크게 변한 센서 3개" sub="점선은 초기 평균">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {flow.trend.map((t) => (
            <SensorTrendCard key={t.s} id={t.s} z={flow.z[t.s]} series={t} />
          ))}
        </div>
        <p className="mb-0 mt-3 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          센서값은 비행 조건(고도·속도·스로틀) 차이를 보정한 값입니다.
        </p>
      </Panel>
    </div>
  )
}

function HistoryTab({ data }: { data: EngineData }) {
  const { settings } = useSettings()
  const plan = usePlan()
  const { engine, runs, facts } = data
  if (!engine || !facts) return null
  const item = plan.get(engine.unit)
  const cpd = settings.cyclesPerDay
  const ago = (c: number) => `${c} cycle(${daysText(c / cpd)}) 전`
  const events = [
    runs?.dangerSince != null && { label: '위험 구간 진입', color: 'var(--status-critical)', cycle: runs.dangerSince, ago: runs.lastCycle - runs.dangerSince },
    runs?.warnSince != null && { label: '주의 구간 진입', color: 'var(--status-warning)', cycle: runs.warnSince, ago: runs.lastCycle - runs.warnSince },
  ].filter(Boolean) as { label: string; color: string; cycle: number; ago: number }[]
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Panel title="경보 이력" sub="시스템이 알린 시점 · 최근 것부터">
        {events.length ? (
          <div className="flex flex-col">
            {events.map((ev) => (
              <div key={ev.label} className="flex flex-row items-start gap-3 py-3" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ev.color }} />
                <div>
                  <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{ev.label}</div>
                  <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}><span className="mono">cycle #{ev.cycle}</span> · {ago(ev.ago)}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 text-[13px]" style={{ color: 'var(--text-secondary)' }}>경보 구간에 들어간 적이 없습니다.</p>
        )}
        {facts.transientDanger + facts.transientWarn > 0 && (
          <p className="mb-0 mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            앞서 경보가 켜졌다가 꺼진 일시 경보가 위험 {facts.transientDanger}회·주의 {facts.transientWarn}회 있었습니다.
          </p>
        )}
      </Panel>
      <Panel title="결재·처리 이력" sub="누가 언제 무엇을 판단했는지">
        <div className="flex flex-col gap-4">
          <PlanControl engine={engine} stacked />
          {item.history.length ? (
            <div className="flex flex-col">
              {[...item.history].reverse().map((ev) => (
                <div key={ev.at} className="flex flex-row items-start gap-3 py-3" style={{ borderTop: '1px solid var(--border-soft)' }}>
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: ev.action === 'reject' ? 'var(--status-critical)' : ev.action === 'approve' || ev.action === 'complete' ? 'var(--status-good)' : 'var(--accent)' }} />
                  <div className="min-w-0">
                    <div className="text-[13px]" style={{ color: 'var(--text-primary)' }}>
                      <span className="font-medium">{ACTION_LABEL[ev.action]}</span>
                      <span style={{ color: 'var(--text-muted)' }}> · {ev.by}({ROLE_LABEL[ev.role]})</span>
                      {ev.date && <span className="mono" style={{ color: 'var(--text-secondary)' }}> · {ev.date.slice(5).replace('-', '/')} 정비</span>}
                    </div>
                    <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{new Date(ev.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    {ev.note && <div className="mt-1 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>{ev.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>아직 처리 이력이 없습니다. AI 권고를 검토하고 결재를 올리면 여기에 남습니다.</p>
          )}
        </div>
      </Panel>
    </div>
  )
}

function EngineView({ unit }: { unit: number }) {
  const nav = useNavigate()
  const fleet = useFleet()
  const [params, setParams] = useSearchParams()
  const [jump, setJump] = useState('')
  const data = useEngineData(unit)
  const engine = data.engine as FleetEngine
  const tab = (TABS.find((t) => t.id === params.get('tab'))?.id ?? 'overview') as TabId
  const setTab = (id: TabId) => setParams(id === 'overview' ? {} : { tab: id }, { replace: true })

  const rows = useMemo<EquipmentRow[]>(() => fleet.map((e) => ({ id: `engine-${e.unit}`, name: e.name, health: e.health, status: LEVEL[e.level].badge })), [fleet])
  const search = params.toString() ? `?${params.toString()}` : ''
  const go = () => {
    const n = Number(jump.replace('#', ''))
    if (fleet.some((e) => e.unit === n)) {
      nav(`/equipment/engine-${n}${search}`)
      setJump('')
    }
  }

  const chips = [
    { label: '예측 남은 수명', value: `${engine.pred} cycle`, sub: daysText(engine.daysLeft) },
    { label: '정비 요청 기한', value: engine.requestIn <= 0 ? '기한 지남' : deadlineText(engine.requestIn), sub: requestDate(engine.requestIn).slice(5).replace('-', '/') },
    { label: '가동 한계 예상', value: mdy(limitDate(engine.daysLeft)), sub: '남은 수명이 다하는 날' },
    { label: '점검 예상 모듈', value: engine.topPart ? engine.topPart.label : '뚜렷한 변화 없음', sub: engine.topPart ? `센서 변화 ×${engine.topPart.score.toFixed(1)}` : '' },
    { label: '최근 관측', value: data.facts?.cycles != null ? `cycle #${data.facts.cycles}` : '—', sub: '비행 후 데이터' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <Link to="/equipment" className="back-link flex flex-row items-center gap-1.5 text-[13px] no-underline" style={{ color: 'var(--text-muted)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        엔진 목록
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-row flex-wrap items-center gap-2.5">
          <EngineSwitcher engines={rows} selectedId={`engine-${unit}`} onSelect={(id) => nav(`/equipment/${id}${search}`)} size="lg" />
          <Badge status={LEVEL[engine.level].badge} />
          <UrgencyChip urgency={engine.urgency} />
        </div>
        <div className="flex flex-row flex-wrap items-center gap-3">
          <PlanControl engine={engine} />
          <input
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && go()}
            placeholder="번호로 이동"
            inputMode="numeric"
            aria-label="엔진 번호로 이동"
            className="mono w-28 border px-3 py-1.5 text-[12.5px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}
          />
          <Link to={`/report/engine-${unit}`} className="border px-3 py-1.5 text-[12.5px] no-underline" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            진단 리포트
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {chips.map((c) => (
          <div key={c.label} className="border p-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', borderRadius: 'var(--radius-xs)' }}>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
            <div className="mt-0.5 truncate text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }} title={c.value}>{c.value}</div>
            {c.sub && <div className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="flex flex-row gap-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn shrink-0 ${tab === t.id ? 'is-active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'overview' && <OverviewTab data={data} />}
        {tab === 'diagnosis' && (
          <Panel title="고장 진단 플로우" sub="어떤 센서가 변했고, 어느 모듈을 점검해야 하며, 시스템이 언제 알렸는가">
            <DiagnosisFlow data={data} />
          </Panel>
        )}
        {tab === 'sensors' && <SensorsTab data={data} />}
        {tab === 'history' && <HistoryTab data={data} />}
      </motion.div>
    </div>
  )
}

export function Detail() {
  const { id } = useParams<{ id: string }>()
  const fleet = useFleet()
  const unit = Number((id ?? '').replace('engine-', ''))
  // 없는 엔진 번호면 엔진 목록으로 보낸다
  if (!fleet.some((e) => e.unit === unit)) return <Navigate to="/equipment" replace />
  return <EngineView key={unit} unit={unit} />
}

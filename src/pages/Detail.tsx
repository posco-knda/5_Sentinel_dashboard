import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { SurvivalCurveChart } from '../components/SurvivalCurveChart'
import { MiniTrendChart } from '../components/MiniTrendChart'
import {
  featureImportance,
  equipmentInfo,
  sensorTrend72h,
  predictedRulMileage,
  classifierMetrics,
  maintenanceHistory,
} from '../data/mock'

const trendCards = [
  { key: 'torque_3', label: 'Torque (토크)', unit: 'kN·m', color: 'var(--series-1)', domain: [0, 12] as [number, number], data: sensorTrend72h.torque_3 },
  { key: 'motor_power_3', label: 'Motor Power (모터파워)', unit: 'kW', color: 'var(--series-2)', domain: [50, 80] as [number, number], data: sensorTrend72h.motor_power_3 },
  { key: 'tension_3', label: 'Tension (텐션)', unit: 'kN', color: 'var(--series-3)', domain: [5, 8] as [number, number], data: sensorTrend72h.tension_3 },
]

const infoChips = [
  { label: '라인/공정', value: equipmentInfo.line },
  { label: '설치일', value: equipmentInfo.installedAt },
  { label: '워크롤 규격', value: equipmentInfo.modelNo },
  { label: '누적 마일리지', value: `${equipmentInfo.operatingHours.toLocaleString()} km` },
  { label: '최근 롤 교체일', value: equipmentInfo.lastMaintenance },
  { label: '담당팀', value: equipmentInfo.team },
]

const tabs = [
  { id: 'rul', label: 'RUL 예측' },
  { id: 'model', label: '이상탐지 요인' },
  { id: 'sensors', label: '센서 추이' },
  { id: 'history', label: '정비 이력' },
] as const

function RulTab() {
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="m-0 mb-3.5 text-[14px] font-semibold">워크롤 잔존 마일리지 예측 (RUL) · Weibull AFT</p>
      <div className="flex flex-row items-baseline gap-2.5">
        <span className="text-[40px] font-bold leading-none">
          약 <span className="mono">{predictedRulMileage.median}</span>km
        </span>
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          신뢰구간 {predictedRulMileage.lower}–{predictedRulMileage.upper}km
        </span>
      </div>
      <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        현재 force·torque 추세가 유지될 경우, 생존확률 S(mileage)이 누적 마일리지에 따라 감소하는 형태로 다음 롤
        교체까지 남은 마일리지를 추정합니다
      </p>

      <div className="mt-4">
        <SurvivalCurveChart />
      </div>

      <div
        className="mt-2 flex flex-row gap-3 border p-4"
        style={{
          background: 'var(--status-warning-wash)',
          borderColor: 'color-mix(in oklab, var(--status-warning) 40%, transparent)',
          borderRadius: 'var(--radius-sm)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <div className="mb-1 text-[13px] font-semibold" style={{ color: 'var(--status-warning)' }}>
            권장 조치
          </div>
          <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
            잔존 마일리지 소진이 임박했습니다. 워크롤 교체를 계획하세요. force·torque 동반 상승 패턴은 과거 워크롤
            마모 사례와 유사합니다.
          </div>
        </div>
      </div>
    </div>
  )
}

function ModelTab() {
  const maxImportance = Math.max(...featureImportance.map((f) => f.value))
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="m-0 mb-3.5 text-[14px] font-semibold">이상탐지 기여 요인 (모델 설명)</p>
      <div className="flex flex-col gap-2">
        {featureImportance.map((f, i) => (
          <div key={f.label} className="flex flex-row items-center gap-3">
            <span className="w-[104px] shrink-0 truncate text-[12.5px] sm:w-[200px]" style={{ color: 'var(--text-secondary)' }} title={f.label}>
              {f.label}
            </span>
            <div className="h-[3px] flex-1 overflow-hidden" style={{ background: 'color-mix(in oklab, var(--accent) 16%, transparent)' }}>
              <motion.div
                className="h-full"
                style={{ background: 'var(--accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${(f.value / maxImportance) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.08 }}
              />
            </div>
            <span className="mono w-11 text-right text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {f.value.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        Anomaly_Bearing_3 분류에 대한 특성 기여도 (예시 값)
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ['Precision', classifierMetrics.precision],
          ['Recall', classifierMetrics.recall],
          ['F1-score', classifierMetrics.f1],
        ].map(([m, v]) => (
          <div
            key={m as string}
            className="border p-3.5"
            style={{ background: 'var(--page)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-xs)' }}
          >
            <div className="mono text-[11px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
              {m}
            </div>
            <div className="mono text-xl font-semibold">{(v as number).toFixed(2)}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        ※ RandomForest(Anomaly_Bearing_3 라벨) 홀드아웃 테스트셋 기준 예시 값 — 실제 분석 결과 확보 후 교체 예정
      </p>
    </div>
  )
}

function SensorsTab() {
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="m-0 mb-3.5 text-[14px] font-semibold">공정변수별 최근 72시간 추이</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {trendCards.map((c) => {
          const last = c.data[c.data.length - 1].v
          return (
            <div
              key={c.key}
              className="border p-3.5"
              style={{ background: 'var(--page)', borderColor: 'var(--border)', borderRadius: 'var(--radius-xs)' }}
            >
              <div className="flex flex-row items-center justify-between">
                <span className="flex flex-row items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                  {c.label}
                </span>
                <span className="mono text-[13.5px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {last.toFixed(1)} {c.unit}
                </span>
              </div>
              <div className="mt-1.5">
                <MiniTrendChart data={c.data} color={c.color} unit={c.unit} domain={c.domain} />
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        72시간 전 대비 torque·motor power가 동반 상승하는 추세 — 잔존 마일리지 예측 모델의 핵심 입력 변수입니다
      </p>
    </div>
  )
}

function HistoryTab() {
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="m-0 mb-3.5 text-[14px] font-semibold">최근 롤 교체 이력</p>
      <div className="flex flex-col">
        {maintenanceHistory.map((m, i) => (
          <div key={m.date + m.type} className="flex flex-row gap-3 pb-3.5" style={{ borderLeft: i < maintenanceHistory.length - 1 ? '1px solid var(--border-soft)' : '1px solid transparent', marginLeft: 5 }}>
            <div
              className="-ml-[5px] mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2"
              style={{
                background: m.status === 'scheduled' ? 'var(--status-warning)' : 'var(--status-good)',
                borderColor: 'var(--surface-1)',
              }}
            />
            <div className="min-w-0 flex-1 pl-1.5">
              <div className="flex flex-row items-center gap-2 text-[12.5px]">
                <span className="mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {m.date}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>{m.type}</span>
              </div>
              <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                {m.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Detail() {
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('rul')

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/dashboard"
        className="back-link flex flex-row items-center gap-1.5 text-[13px] no-underline"
        style={{ color: 'var(--text-muted)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        전체 스탠드
      </Link>

      <div>
        <div className="flex flex-row items-center gap-2.5">
          <h1 className="m-0 text-xl font-semibold">Stand 3</h1>
          <Badge status="critical" />
        </div>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {equipmentInfo.line} · 설치일 {equipmentInfo.installedAt}
        </p>
      </div>

      {/* 설비 기본 정보 칩 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {infoChips.map((c) => (
          <div
            key={c.label}
            className="border p-3"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', borderRadius: 'var(--radius-xs)' }}
          >
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {c.label}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }} title={c.value}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-row gap-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-btn shrink-0 ${tab === t.id ? 'is-active' : ''}`}>
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'rul' && <RulTab />}
        {tab === 'model' && <ModelTab />}
        {tab === 'sensors' && <SensorsTab />}
        {tab === 'history' && <HistoryTab />}
      </motion.div>
    </div>
  )
}

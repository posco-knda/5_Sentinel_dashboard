import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { SurvivalCurveChart } from '../components/SurvivalCurveChart'
import { MiniTrendChart } from '../components/MiniTrendChart'
import {
  featureImportance,
  classifierMetrics,
  trendMeta,
  engineDetails,
  equipmentRanking,
  DEFAULT_ENGINE_ID,
  riskThresholds,
  dataMeta,
  type EngineDetail,
} from '../data/mock'

// 센서 이름·단위는 데이터셋마다 달라서(FD004: s3·s17·s8) mock.ts의 trendMeta에서 읽고, 색은 순서대로 배정
const SERIES_COLORS = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)']

const tabs = [
  { id: 'rul', label: 'RUL 예측' },
  { id: 'model', label: '위험 조기경보 요인' },
  { id: 'sensors', label: '센서 추이' },
  { id: 'history', label: '정비 권고' },
] as const

function RulTab({ detail }: { detail: EngineDetail }) {
  const rul = detail.predictedRulCycle
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="m-0 mb-3.5 text-[14px] font-semibold">엔진 잔존수명 예측 (RUL) · {dataMeta.model} Seq2Seq 회귀 + 생존곡선</p>
      <div className="flex flex-row items-baseline gap-2.5">
        <span className="text-[40px] font-bold leading-none">
          약 <span className="mono">{rul.median}</span> cycle
        </span>
        <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          90% 구간 {rul.lower}–{rul.upper} cycle
        </span>
      </div>
      <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        지금까지 관측된 센서 이력으로 남은 사이클 수를 회귀 예측합니다. 90% 구간과 생존곡선("앞으로 이만큼 더
        가동해도 아직 고장나지 않을 확률")은 검증 엔진에서 모델이 비슷한 값을 예측했던 순간들의 실제 잔존수명
        분포로 계산합니다 (음영 = 검증 엔진 단위 부트스트랩 90% 구간)
      </p>

      <div className="mt-4">
        <SurvivalCurveChart data={detail.survivalCurve} predictedRul={rul} />
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
            {rul.median <= riskThresholds.dangerRul
              ? '잔존수명 소진이 임박했습니다. 엔진 정비 일정을 지금 수립하세요.'
              : `아직 여유가 있습니다(예측 RUL 약 ${rul.median} cycle). 예측 RUL 추이를 주기적으로 확인하며, 위험 임계값(${riskThresholds.dangerRul} cycle) 근접 시 즉시 대응하세요.`}
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
      <p className="m-0 mb-3.5 text-[14px] font-semibold">위험 조기경보 기여 요인 (모델 설명)</p>
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
        RUL 예측(Random Forest)에 대한 센서별 기여도 (피처 종류별 합산)
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
        ※ {dataMeta.model} 회귀로 예측한 RUL이 {riskThresholds.dangerRul} cycle 이하면 '위험'으로 보는 조기경보 규칙의 성능입니다.
        공식 test {dataMeta.testEngines}개 엔진({dataMeta.dataset}) 기준 실제 결과입니다 (TP={classifierMetrics.tp}, FN={classifierMetrics.fn}, FP={classifierMetrics.fp}).
        C-MAPSS는 시뮬레이션 데이터라 실제 현장보다 쉬운 문제일 수 있습니다.
      </p>
    </div>
  )
}

function SensorsTab({ detail }: { detail: EngineDetail }) {
  const trendCards = Object.entries(detail.sensorTrend).map(([key, data], i) => ({
    key,
    label: trendMeta[key]?.label ?? key,
    unit: trendMeta[key]?.unit ?? '',
    color: SERIES_COLORS[i % SERIES_COLORS.length],
    domain: trendMeta[key]?.domain ?? ([0, 1] as [number, number]),
    data,
  }))
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="m-0 mb-3.5 text-[14px] font-semibold">센서별 관측 이력 추이 (전체 관측 사이클, 9구간 샘플 · {dataMeta.sensorValues})</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {trendCards.map((c) => {
          const last = c.data[c.data.length - 1]?.v ?? 0
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
        열화가 진행되면 이 센서들이 정상 수준에서 서서히 벗어납니다 —
        이 변화가 RUL 예측 모델의 핵심 입력입니다 (RF 피처 중요도 상위 센서, 비행 조건 차이를 뺀 운전조건 보정값)
      </p>
    </div>
  )
}

function HistoryTab({ detail }: { detail: EngineDetail }) {
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <p className="m-0 mb-3.5 text-[14px] font-semibold">정비 권고 (RUL 예측 기반)</p>
      <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        C-MAPSS는 엔진 1대당 1회 run-to-failure(가동 시작~고장)만 기록된 데이터라 실제 교체 이력은 없습니다.
        아래는 현재 예측을 바탕으로 한 향후 정비 권고입니다.
      </p>
      <div className="flex flex-col">
        {detail.maintenanceHistory.map((m, i) => (
          <div key={m.date + m.type} className="flex flex-row gap-3 pb-3.5" style={{ borderLeft: i < detail.maintenanceHistory.length - 1 ? '1px solid var(--border-soft)' : '1px solid transparent', marginLeft: 5 }}>
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
  const { id } = useParams<{ id: string }>()
  const engineId = id && engineDetails[id] ? id : DEFAULT_ENGINE_ID
  const detail = engineDetails[engineId]
  const displayName = equipmentRanking.find((e) => e.id === engineId)?.name ?? engineId
  const [tab, setTab] = useState<(typeof tabs)[number]['id']>('rul')

  const infoChips = [
    { label: '라인/공정', value: detail.equipmentInfo.line },
    { label: '설치일', value: detail.equipmentInfo.installedAt },
    { label: '엔진 모델', value: detail.equipmentInfo.modelNo },
    { label: '누적 사이클', value: `${detail.equipmentInfo.operatingCycles.toLocaleString()} cycle` },
    { label: '최근 정비 이력', value: detail.equipmentInfo.lastMaintenance },
    { label: '담당팀', value: detail.equipmentInfo.team },
  ]

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
        전체 엔진
      </Link>

      <div>
        <div className="flex flex-row items-center gap-2.5">
          <h1 className="m-0 text-xl font-semibold">{displayName}</h1>
          <Badge status={detail.status} />
        </div>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {detail.equipmentInfo.line} · 설치일 {detail.equipmentInfo.installedAt}
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

      <motion.div key={tab + engineId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {tab === 'rul' && <RulTab detail={detail} />}
        {tab === 'model' && <ModelTab />}
        {tab === 'sensors' && <SensorsTab detail={detail} />}
        {tab === 'history' && <HistoryTab detail={detail} />}
      </motion.div>
    </div>
  )
}

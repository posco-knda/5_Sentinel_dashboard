import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { SurvivalCurveChart } from '../components/SurvivalCurveChart'
import { MiniTrendChart } from '../components/MiniTrendChart'
import { EquipmentDiagram, type SensorCallout } from '../components/EquipmentDiagram'
import {
  featureImportance,
  equipmentInfo,
  sensorSeries,
  sensorTrend72h,
  predictedRulMileage,
  trendMeta,
  getEquipmentRankingAtHour,
  classifierMetrics,
  maintenanceHistory,
} from '../data/mock'

const equipmentSensors: SensorCallout[] = [
  {
    id: 'force',
    label: 'Force (압연력)',
    value: `${sensorSeries[sensorSeries.length - 1].v.toFixed(2)} ${trendMeta.force_3.unit}`,
    color: 'var(--series-1)',
    anchor: { x: 360, y: 94 },
    label_at: { x: 360, y: 34, anchor: 'middle' },
  },
  {
    id: 'tension',
    label: 'Tension (텐션)',
    value: `${sensorTrend72h.tension_3[sensorTrend72h.tension_3.length - 1].v.toFixed(0)} ${trendMeta.tension_3.unit}`,
    color: 'var(--series-3)',
    anchor: { x: 297, y: 110 },
    label_at: { x: 220, y: 34, anchor: 'middle' },
  },
  {
    id: 'torque',
    label: 'Torque (토크)',
    value: `${sensorTrend72h.torque_3[sensorTrend72h.torque_3.length - 1].v.toFixed(0)} ${trendMeta.torque_3.unit}`,
    color: 'var(--series-2)',
    anchor: { x: 328, y: 110 },
    label_at: { x: 430, y: 34, anchor: 'middle' },
  },
]

const trendCards = [
  { key: 'torque_3', label: 'Torque (토크)', unit: trendMeta.torque_3.unit, color: 'var(--series-1)', domain: trendMeta.torque_3.domain, data: sensorTrend72h.torque_3 },
  { key: 'motor_power_3', label: 'Motor Power (모터파워)', unit: trendMeta.motor_power_3.unit, color: 'var(--series-2)', domain: trendMeta.motor_power_3.domain, data: sensorTrend72h.motor_power_3 },
  { key: 'tension_3', label: 'Tension (텐션)', unit: trendMeta.tension_3.unit, color: 'var(--series-3)', domain: trendMeta.tension_3.domain, data: sensorTrend72h.tension_3 },
]

const infoChips = [
  { label: '라인/공정', value: equipmentInfo.line },
  { label: '설치일', value: equipmentInfo.installedAt },
  { label: '워크롤 규격', value: equipmentInfo.modelNo },
  { label: '누적 마일리지', value: `${equipmentInfo.operatingHours.toLocaleString()} km` },
  { label: '최근 롤 교체일', value: equipmentInfo.lastMaintenance },
  { label: '담당팀', value: equipmentInfo.team },
]

function Panel({ title, children, accent }: { title: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      className={`surface-card flex flex-col border p-6 ${accent ? 'bracket-panel' : ''}`}
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
    >
      <p className="m-0 mb-3.5 text-[14px] font-semibold">{title}</p>
      {children}
    </div>
  )
}

export function Detail() {
  const maxImportance = Math.max(...featureImportance.map((f) => f.value))

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
          <Badge status={getEquipmentRankingAtHour(24).find((e) => e.id === 'stand-3')?.status ?? 'good'} />
        </div>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-secondary)' }}>
          {equipmentInfo.line} · 설치일 {equipmentInfo.installedAt}
        </p>
      </div>

      {/* 설비 기본 정보 칩 */}
      <div className="grid grid-cols-6 gap-3">
        {infoChips.map((c) => (
          <div key={c.label} className="border p-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
            <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {c.label}
            </div>
            <div className="mt-0.5 truncate text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }} title={c.value}>
              {c.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        <Panel title="워크롤 잔존 마일리지 예측 (RUL) · RandomForest 회귀 + 생존곡선" accent>
          <div className="flex flex-row items-baseline gap-2.5">
            <span className="text-[40px] font-bold leading-none">
              약 <span className="mono">{predictedRulMileage.median}</span>km
            </span>
            <span className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>
              신뢰구간 {predictedRulMileage.lower}–{predictedRulMileage.upper}km
            </span>
          </div>
          <p className="mt-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            지금 롤의 나이(누적 마일리지)와 최근 공정변수로 남은 마일리지를 회귀 예측하고, 전체 롤 수명 분포로
            "앞으로 이만큼 더 쓸 때까지 아직 쓰고 있을 확률" 곡선을 그립니다 (음영 = 부트스트랩 90% 구간)
          </p>

          <div className="mt-4">
            <SurvivalCurveChart />
          </div>

          <div
            className="mt-2 flex flex-row gap-3 border p-4"
            style={{ background: 'var(--status-warning-wash)', borderColor: 'color-mix(in oklab, var(--status-warning) 40%, transparent)' }}
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
                {predictedRulMileage.median < 20
                  ? '잔존 마일리지 소진이 임박했습니다. 워크롤 교체를 계획하세요.'
                  : `교체 직후라 잔존 마일리지가 충분합니다(약 ${predictedRulMileage.median}). 다음 교체 예정: ${maintenanceHistory[0].date}. 정상 롤은 수명이 거의 일정해서 정기 교체 시점을 앞당길 이유는 크지 않고, 이상 경보 즉시 대응이 핵심입니다.`}
              </div>
            </div>
          </div>
        </Panel>

        <Panel title="이상탐지 기여 요인 (모델 설명)">
          <div className="flex flex-col gap-2">
            {featureImportance.map((f, i) => (
              <div key={f.label} className="flex flex-row items-center gap-3">
                <span className="w-[168px] shrink-0 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
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
            Anomaly_Bearing_3 분류에 대한 특성 기여도 (RandomForest, 특성 묶음별 합)
          </p>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              ['Precision', classifierMetrics.precision],
              ['Recall', classifierMetrics.recall],
              ['F1-score', classifierMetrics.f1],
            ].map(([m, v]) => (
              <div key={m as string} className="border p-3.5" style={{ background: 'var(--page)', borderColor: 'var(--border-soft)' }}>
                <div className="mono text-[11px] uppercase tracking-[0.06em]" style={{ color: 'var(--text-muted)' }}>
                  {m}
                </div>
                <div className="mono text-xl font-semibold">{(v as number).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            ※ RandomForest(Anomaly_Bearing_3 라벨), Stand 3 시험 구간(시간순 마지막 20%) 기준. 합성 시뮬레이션 데이터라 실제 현장보다 쉬운 문제입니다
          </p>

          {/* 정비 이력 타임라인 */}
          <p className="mt-5 mb-2.5 text-[13px] font-semibold">최근 롤 교체 이력</p>
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
        </Panel>
      </div>

      <Panel title="공정변수별 최근 72코일 추이">
        <div className="mb-4 border p-4" style={{ background: 'var(--page)', borderColor: 'var(--border)' }}>
          <EquipmentDiagram sensors={equipmentSensors} highlightStand={3} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {trendCards.map((c) => {
            const last = c.data[c.data.length - 1].v
            return (
              <div key={c.key} className="border p-3.5" style={{ background: 'var(--page)', borderColor: 'var(--border)' }}>
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
          이상이 생기면 토크(베어링)·전력(전동기)·압연력(작업롤)이 "조건 대비 기대값"보다 먼저 튑니다 — 이 잔차가 이상탐지 모델의 핵심 입력입니다
        </p>
      </Panel>
    </div>
  )
}

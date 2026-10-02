import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { StatTile } from '../components/StatTile'
import { SurvivalCurveChart } from '../components/SurvivalCurveChart'
import { RankedList } from '../components/RankedList'
import { AlertsTable } from '../components/AlertsTable'
import { EngineSwitcher } from '../components/EngineSwitcher'
import { Badge } from '../components/Badge'
import { Toast } from '../components/Toast'
import { kpis, equipmentRanking, engineDetails, dataMeta, riskThresholds, formatHour } from '../data/mock'

function Panel({ title, action, children }: { title?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      {(title || action) && (
        <div className="mb-3.5 flex flex-row items-center justify-between">
          {title && (
            <p className="m-0 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </p>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

const sideTabs = [
  { id: 'priority', label: '정비 우선순위' },
  { id: 'alerts', label: '알림 로그' },
] as const

const LATEST_CYCLE = 24

export function Dashboard() {
  const [sideTab, setSideTab] = useState<(typeof sideTabs)[number]['id']>('priority')
  const [toastDismissed, setToastDismissed] = useState(false)
  const [selectedEngineId, setSelectedEngineId] = useState(equipmentRanking[0].id)

  const selected = equipmentRanking.find((e) => e.id === selectedEngineId) ?? equipmentRanking[0]
  const selectedDetail = engineDetails[selectedEngineId]

  // 경보 배너는 고정된 엔진이 아니라 지금 플릿에서 실제로 가장 위험한 엔진을 가리켜야 한다
  const priorityEngine = equipmentRanking[0]
  const priorityMedianRul = engineDetails[priorityEngine.id].predictedRulCycle.median
  const hasCriticalAlert = priorityEngine.status === 'critical'

  return (
    <div className="flex flex-col gap-5">
      <Toast
        show={hasCriticalAlert && !toastDismissed}
        title={`${priorityEngine.name} 위험 감지`}
        body={`예측 RUL 약 ${priorityMedianRul}cycle · 위험 임계값(${riskThresholds.dangerRul} cycle) 이하로 떨어졌습니다`}
        onDismiss={() => setToastDismissed(true)}
      />

      <div className="flex flex-row items-center justify-between">
        <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em]">실시간 모니터링</h1>
        <span className="flex flex-row items-center gap-1.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          <span className="led-dot led-dot--live" />
          최근 갱신 · {formatHour(LATEST_CYCLE)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="모니터링 엔진"
          value={kpis.totalEquipment}
          suffix="개"
          foot="선택된 엔진 플릿 · 실시간 연동"
        />
        <StatTile
          label="위험 엔진"
          value={kpis.riskEquipment}
          suffix="개"
          delay={0.05}
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          foot="즉시 점검 필요"
        />
        <StatTile label="평균 헬스 스코어" value={kpis.avgHealth} decimals={1} delay={0.1} foot="모니터링 엔진 평균" />
        <StatTile
          label="누적 알림"
          value={kpis.todayAlerts}
          suffix="건"
          delay={0.15}
          foot="최근 25사이클 구간"
        />
      </div>

      <motion.div
        className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Panel
          title="예측 RUL · 생존곡선"
          action={
            <Link
              to={`/equipment/${selectedEngineId}`}
              className="border px-3 py-1.5 text-[12.5px] no-underline"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}
            >
              상세 보기 →
            </Link>
          }
        >
          <div className="mb-3 flex flex-row items-center gap-2.5">
            <EngineSwitcher engines={equipmentRanking} selectedId={selectedEngineId} onSelect={setSelectedEngineId} />
            <Badge status={selected.status} />
          </div>
          <SurvivalCurveChart data={selectedDetail.survivalCurve} predictedRul={selectedDetail.predictedRulCycle} />
          <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            현재 시점(cycle 0) 기준 앞으로 더 가동될 때 아직 고장나지 않을 확률이며, 점선은 {dataMeta.model} 모델이 예측한 RUL입니다
          </p>
        </Panel>

        <Panel>
          <div className="flex flex-row gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
            {sideTabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setSideTab(t.id)}
                className={`tab-btn ${sideTab === t.id ? 'is-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="pt-3.5">
            {sideTab === 'priority' ? <RankedList /> : <AlertsTable compact />}
          </div>
        </Panel>
      </motion.div>
    </div>
  )
}

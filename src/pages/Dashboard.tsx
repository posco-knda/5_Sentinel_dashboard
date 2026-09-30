import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { StatTile } from '../components/StatTile'
import { SensorChart } from '../components/SensorChart'
import { RankedList } from '../components/RankedList'
import { AlertsTable } from '../components/AlertsTable'
import { Scrubber } from '../components/Scrubber'
import { Toast } from '../components/Toast'
import { getKpisAtHour, anomalyWindow, dataMeta, riskThresholds } from '../data/mock'

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

export function Dashboard() {
  const [hour, setHour] = useState(24)
  const [playing, setPlaying] = useState(false)
  const [sideTab, setSideTab] = useState<(typeof sideTabs)[number]['id']>('priority')
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  // 재생 버튼: 0시부터 24시까지 자동으로 스크러버가 흘러갑니다 (약 6초 재생)
  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null
      return
    }
    const HOURS_PER_SECOND = 24 / 6

    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      setHour((h) => {
        const next = h + dt * HOURS_PER_SECOND
        if (next >= 24) {
          setPlaying(false)
          return 24
        }
        return next
      })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [playing])

  const togglePlay = () => {
    if (!playing && hour >= 24) setHour(0)
    setPlaying((p) => !p)
  }

  const kpis = getKpisAtHour(hour)
  const showAnomalyToast = hour >= anomalyWindow.start && hour <= anomalyWindow.end

  return (
    <div className="flex flex-col gap-5">
      <Toast
        show={showAnomalyToast}
        title={`Engine #${dataMeta.featuredEngine} 위험 감지`}
        body={`예측 RUL이 위험 임계값(${riskThresholds.dangerRul} cycle) 이하로 떨어졌습니다`}
      />

      <div>
        <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em]">실시간 모니터링</h1>
        <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          타임라인을 움직여 사이클 25개 구간의 위험 조기경보 흐름을 재생해볼 수 있습니다
        </p>
      </div>

      <Scrubber hour={hour} onChange={setHour} playing={playing} onTogglePlay={togglePlay} />

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
          label="구간 내 발생 알림"
          value={kpis.todayAlerts}
          suffix="건"
          delay={0.15}
          foot={
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--status-critical)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
              앞 12사이클 대비 {kpis.alertsDelta >= 0 ? '+' : ''}{kpis.alertsDelta}건
            </>
          }
        />
      </div>

      <motion.div
        className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Panel
          title={`예측 RUL · Engine #${dataMeta.featuredEngine}`}
          action={
            <span
              className="border px-3 py-1.5 text-[12.5px]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}
            >
              사이클 25개 구간
            </span>
          }
        >
          <SensorChart hour={hour} />
          <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Engine #{dataMeta.featuredEngine} 예측 RUL(cycle) 추이 · 붉은 띠는 위험 임계값(RUL ≤ {riskThresholds.dangerRul}) 이하 구간이며, 알림은 {dataMeta.model} 모델의 예측 기반입니다
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
            {sideTab === 'priority' ? <RankedList hour={hour} /> : <AlertsTable hour={hour} compact />}
          </div>
        </Panel>
      </motion.div>
    </div>
  )
}

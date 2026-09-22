import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { StatTile } from '../components/StatTile'
import { SensorChart } from '../components/SensorChart'
import { RankedList } from '../components/RankedList'
import { AlertsTable } from '../components/AlertsTable'
import { Scrubber } from '../components/Scrubber'
import { Toast } from '../components/Toast'
import { getKpisAtHour, anomalyWindow } from '../data/mock'

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="surface-card flex flex-col border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <div className="mb-3.5 flex flex-row items-center justify-between">
        <p className="m-0 text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        {action}
      </div>
      {children}
    </div>
  )
}

export function Dashboard() {
  const [hour, setHour] = useState(24)
  const [playing, setPlaying] = useState(false)
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
        title="Stand 3 이상 감지"
        body="작업롤 이상 신호 — 압연력 잔차가 임계값을 넘었습니다"
      />

      <Scrubber hour={hour} onChange={setHour} playing={playing} onTogglePlay={togglePlay} />

      <div className="grid grid-cols-4 gap-4">
        <StatTile
          label="모니터링 스탠드"
          value={kpis.totalEquipment}
          suffix="개"
          foot="5단 텐덤 라인 전체 · 실시간 연동"
        />
        <StatTile
          label="위험 스탠드"
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
        <StatTile label="평균 헬스 스코어" value={kpis.avgHealth} decimals={1} delay={0.1} foot="창 안 스탠드 평균" />
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
              앞 12코일 대비 {kpis.alertsDelta >= 0 ? '+' : ''}{kpis.alertsDelta}건
            </>
          }
        />
      </div>

      <motion.div
        className="grid grid-cols-[2fr_1fr] gap-5"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Panel
          title="Force · Stand 3"
          action={
            <span
              className="border px-3 py-1.5 text-[12.5px]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
            >
              코일 25개 구간
            </span>
          }
        >
          <SensorChart hour={hour} />
          <p className="mt-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            Stand 3 압연력(MN) · 붉은 띠는 실제 작업롤 이상 라벨 구간이며, 알림은 RandomForest 모델이 낸 경보입니다
          </p>
        </Panel>

        <Panel title="정비 우선순위">
          <RankedList hour={hour} />
        </Panel>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
        <Panel title="최근 이상탐지 로그">
          <AlertsTable hour={hour} />
        </Panel>
      </motion.div>
    </div>
  )
}

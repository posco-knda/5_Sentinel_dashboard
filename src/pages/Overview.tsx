import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { Meter } from '../components/Meter'
import { equipmentRanking, getKpisAtHour } from '../data/mock'

const kpis = getKpisAtHour(24)

const impactStats = [
  { label: '비계획 정지시간', value: '[ −42% ]' },
  { label: '연간 정비 비용', value: '[ −20% ]' },
  { label: '고장 예측 모델 F1', value: '[ 0.__ ]' },
]

export function Overview() {
  return (
    <motion.div
      className="flex flex-col py-1"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="flex flex-row items-center gap-2 text-[12.5px] font-medium" style={{ color: 'var(--accent)' }}>
            <span className="led-dot led-dot--live" />
            5단 텐덤 라인 실시간 현황
          </span>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.01em]">라인 현황</h1>
        </div>
        <Link
          to="/dashboard"
          className="cta-primary w-fit px-4 py-2.5 text-[13.5px] font-semibold no-underline"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          타임라인 모니터링 →
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {equipmentRanking.map((eq, i) => (
          <motion.div key={eq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: i * 0.05 }}>
            <Link
              to={`/equipment/${eq.id}`}
              className="surface-card surface-card--interactive flex flex-col gap-3 border p-4 no-underline"
              style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
            >
              <div className="flex flex-row items-center justify-between">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {eq.name}
                </span>
                <Badge status={eq.status} />
              </div>
              <span className="mono text-[30px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
                {eq.health}
              </span>
              <Meter value={eq.health} status={eq.status} />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                헬스 스코어
              </span>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <div className="surface-card flex flex-col gap-1 border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            평균 헬스 스코어
          </span>
          <span className="mono text-[20px] font-semibold">{kpis.avgHealth.toFixed(1)}</span>
        </div>
        <div className="surface-card flex flex-col gap-1 border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            위험 스탠드
          </span>
          <span className="mono text-[20px] font-semibold">{kpis.riskEquipment}개</span>
        </div>
        <div className="surface-card flex flex-col gap-1 border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            금일 발생 알림
          </span>
          <span className="mono text-[20px] font-semibold">{kpis.todayAlerts}건</span>
        </div>
        <div className="surface-card flex flex-col gap-1 border p-4" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            모니터링 스탠드
          </span>
          <span className="mono text-[20px] font-semibold">{kpis.totalEquipment}개</span>
        </div>
      </div>

      <div className="mt-10 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <p className="m-0 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          프로젝트 기대 효과 <span style={{ color: 'var(--text-muted)' }}>· 파일럿 데이터 확보 후 실측치로 교체 예정</span>
        </p>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {impactStats.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5">
              <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                {s.label}
              </span>
              <span className="mono text-[22px] font-bold" style={{ color: 'var(--text-secondary)' }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

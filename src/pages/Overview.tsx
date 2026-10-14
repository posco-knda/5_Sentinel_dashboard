import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { Panel } from '../components/Panel'
import { StatTile } from '../components/StatTile'
import { MiniTrendChart } from '../components/MiniTrendChart'
import { LevelDonut } from '../components/charts/LevelDonut'
import { PredActualScatter } from '../components/charts/PredActualScatter'
import { LeadTimeHistogram } from '../components/charts/LeadTimeHistogram'
import { equipmentRanking, engineDetails, trendMeta, scenarioCompare, classifierMetrics, riskThresholds, dataMeta } from '../data/mock'
import { fleetPoints, logRows, logSummary } from '../data/detectionLog'

const pct = (asIs: number, toBe: number) => `${Math.round((toBe / asIs - 1) * 100)}%`
const impactStats = [
  { label: '가동중단 시간 (예지보전 vs 사후보전)', value: pct(scenarioCompare[0].asIs, scenarioCompare[0].toBe) },
  { label: '정비 비용 (예지보전 vs 사후보전)', value: pct(scenarioCompare[1].asIs, scenarioCompare[1].toBe) },
  { label: `위험 조기경보 모델 F1 (RUL≤${riskThresholds.dangerRul})`, value: classifierMetrics.f1.toFixed(2) },
]

const { tp, fn, fp, levels, engines: total } = logSummary
const recall = (tp / (tp + fn)) * 100
const precision = (tp / (tp + fp)) * 100
const leads = logRows.filter((r) => r.verdict === 'tp' && r.leadDanger != null).map((r) => r.leadDanger as number)

const STATUS_COLOR: Record<string, string> = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
}
const sensor = trendMeta.s3

export function Overview() {
  return (
    <motion.div
      className="flex flex-col gap-5 py-1"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="flex flex-row items-center gap-2 text-[12.5px] font-medium" style={{ color: 'var(--accent)' }}>
            <span className="led-dot led-dot--live" />
            터보팬 엔진 플릿({dataMeta.dataset} · {dataMeta.datasetDescription}) 실시간 현황
          </span>
          <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.01em]">엔진 플릿 현황</h1>
        </div>
        <Link
          to="/dashboard"
          className="cta-primary w-fit px-4 py-2.5 text-[13.5px] font-semibold no-underline"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          실시간 모니터링 →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile
          label="위험 엔진"
          value={levels.red}
          suffix="대"
          icon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--status-critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          foot={`전체 ${total}대 중 ${((levels.red / total) * 100).toFixed(0)}%`}
        />
        <StatTile label="위험 탐지율" value={recall} decimals={1} suffix="%" delay={0.05} foot={`실제 위험 ${tp + fn}대 중 ${tp}대 탐지`} />
        <StatTile label="경보 정밀도" value={precision} decimals={1} suffix="%" delay={0.1} foot={`위험 경보 ${tp + fp}건 중 ${tp}건 적중`} />
        <StatTile
          label="경보 선행 시간"
          value={logSummary.leadMedianTp ?? 0}
          suffix="cycle"
          delay={0.15}
          foot="위험 시작 → 실제 고장 (중앙값)"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[1fr_1.35fr_1.1fr]">
        <Panel title="엔진 등급 분포" sub={`공식 test ${total}대 · 마지막 관측 시점`}>
          <div className="flex flex-1 items-center">
            <LevelDonut levels={levels} total={total} />
          </div>
        </Panel>
        <Panel title="예측 vs 실제 남은 수명" sub="점이 대각선에 붙을수록 정확 · 실제는 125에서 자름">
          <PredActualScatter points={fleetPoints} danger={riskThresholds.dangerRul} />
        </Panel>
        <div className="lg:col-span-2 xl:col-span-1">
          <Panel
            title="경보 선행 시간 분포"
            sub={`탐지 ${tp}대 · 옅은 막대는 기준(${riskThresholds.dangerRul}) 초과로 일찍 켜진 경보`}
          >
            <LeadTimeHistogram leads={leads} median={logSummary.leadMedianTp ?? 0} danger={riskThresholds.dangerRul + 1} />
          </Panel>
        </div>
      </div>

      <div>
        <p className="m-0 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          주시 엔진 {equipmentRanking.length}대{' '}
          <span style={{ color: 'var(--text-muted)' }}>· 헬스 스코어와 HPC 출구 온도(s3) 추이</span>
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          {equipmentRanking.map((eq, i) => {
            const color = STATUS_COLOR[eq.status]
            const trend = engineDetails[eq.id]?.sensorTrend.s3 ?? []
            return (
              <motion.div key={eq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 + i * 0.05 }}>
                <Link
                  to={`/equipment/${eq.id}`}
                  className="surface-card surface-card--interactive flex flex-col gap-2.5 border p-4 no-underline"
                  style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
                >
                  <div className="flex flex-row items-center justify-between">
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {eq.name}
                    </span>
                    <Badge status={eq.status} />
                  </div>
                  <div className="flex flex-row items-baseline gap-1.5">
                    <span className="mono text-[28px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>
                      {eq.health}
                    </span>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      헬스 스코어
                    </span>
                  </div>
                  {trend.length > 0 && <MiniTrendChart data={trend} color={color} unit={sensor.unit} domain={sensor.domain} />}
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>

      <div className="mt-2 border-t pt-6" style={{ borderColor: 'var(--border)' }}>
        <p className="m-0 text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          프로젝트 기대 효과 <span style={{ color: 'var(--text-muted)' }}>· 공식 test {dataMeta.testEngines}개 엔진 결과 (가동중단 시간·비용은 가정 기반 시뮬레이션)</span>
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

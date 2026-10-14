import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Panel } from '../components/Panel'
import { StatTile } from '../components/StatTile'
import { QueueTable } from '../components/ops/QueueTable'
import { DemandChart, LifeHistogram, ModuleBars } from '../components/ops/OpsCharts'
import { URGENCY, URGENCY_ORDER, daysText, useFleet, type Urgency } from '../lib/fleet'
import { useSettings } from '../lib/settings'
import { usePlan } from '../lib/plan'
import { sendEngineAlert } from '../lib/notify'
import type { SendState } from '../lib/api'

export function Overview() {
  const fleet = useFleet()
  const { settings } = useSettings()
  const plan = usePlan()
  const [slack, setSlack] = useState<SendState>({ state: 'idle' })

  // 정비를 완료 처리한 엔진은 조치 대상에서 뺀다
  const active = useMemo(() => fleet.filter((e) => plan.get(e.unit).status !== 'done'), [fleet, plan])
  const counts = useMemo(() => {
    const c: Record<Urgency, number> = { now: 0, week: 0, month: 0, watch: 0 }
    for (const e of active) c[e.urgency]++
    return c
  }, [active])
  const queue = useMemo(() => active.filter((e) => e.urgency !== 'watch'), [active])
  const top = queue[0]

  const send = async () => {
    if (!top) return
    setSlack({ state: 'loading' })
    setSlack(await sendEngineAlert(top, settings))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">현황</h1>
          <p className="m-0 mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            엔진 {fleet.length}대 · 하루 {settings.cyclesPerDay}회 비행, 정비 준비 {settings.prepDays}일 기준{' '}
            <Link to="/settings" className="no-underline" style={{ color: 'var(--accent)' }}>기준 변경</Link>
          </p>
        </div>
        <Link to="/plan" className="cta-primary w-fit px-4 py-2.5 text-[13.5px] font-semibold no-underline" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
          정비 계획 열기 →
        </Link>
      </div>

      {counts.now > 0 && top && (
        <div
          className="flex flex-col gap-3 border p-4 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'var(--status-critical-wash)', borderColor: 'color-mix(in oklab, var(--status-critical) 40%, transparent)', borderRadius: 'var(--radius-sm)' }}
        >
          <div className="flex flex-row items-start gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--status-critical)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="m-0 text-[14px] font-semibold" style={{ color: 'var(--status-critical)' }}>
                즉시 조치가 필요한 엔진 {counts.now}대
              </p>
              <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: 'var(--text-secondary)' }}>
                정비 요청 기한이 지났습니다. 가장 급한 엔진은 {top.name} — 예측 남은 수명 {top.pred} cycle({daysText(top.daysLeft)})
              </p>
              {slack.state === 'off' && <p className="m-0 mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Slack 연동은 설정의 연동 항목을 확인하세요</p>}
              {slack.state === 'error' && <p className="m-0 mt-1 text-[11.5px]" style={{ color: 'var(--status-critical)' }}>전송에 실패했습니다{slack.text ? ` — ${slack.text}` : ''}</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-row flex-wrap gap-2">
            <Link to={`/equipment/engine-${top.unit}?tab=diagnosis`} className="border px-3 py-1.5 text-[12.5px] font-medium no-underline" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-1)' }}>
              고장 진단 보기
            </Link>
            <button onClick={send} disabled={slack.state === 'loading' || slack.state === 'done'} className="border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-1)' }}>
              {slack.state === 'loading' ? '전송 중…' : slack.state === 'done' ? 'Slack 전송됨' : 'Slack으로 알림'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {URGENCY_ORDER.map((u, i) => (
          <StatTile
            key={u}
            label={URGENCY[u].label === '관찰' ? '정상 운용' : u === 'now' ? '즉시 조치' : `${URGENCY[u].label} 정비 요청`}
            value={counts[u]}
            suffix="대"
            delay={i * 0.05}
            icon={u === 'now' ? <span className="h-2.5 w-2.5 rounded-full" style={{ background: URGENCY.now.color }} /> : undefined}
            foot={URGENCY[u].hint}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
        <Panel title="정비 요청 도래" sub={`정비 요청 기한이 오는 주 · 부품·인력 준비 ${settings.prepDays}일 반영`}>
          <DemandChart engines={fleet} plan={plan.items} />
        </Panel>
        <Panel title="예측 남은 수명 분포" sub={`엔진 ${fleet.length}대 · 위험은 ${settings.dangerN} cycle 이하`}>
          <LifeHistogram engines={fleet} dangerN={settings.dangerN} />
        </Panel>
        <div className="lg:col-span-2 xl:col-span-1">
          <Panel title="점검 예상 모듈" sub="부품·인력 준비용 — 센서가 가장 크게 변한 모듈">
            <ModuleBars engines={active} />
          </Panel>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
        <Panel
          title="조치가 필요한 엔진"
          sub={`정비 요청 기한이 급한 순 · ${queue.length}대 중 상위 8대`}
          action={<Link to="/plan" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>전체 보기 →</Link>}
        >
          <QueueTable engines={queue.slice(0, 8)} empty="지금 조치가 필요한 엔진이 없습니다" />
        </Panel>
      </motion.div>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Panel } from '../components/Panel'
import { DemandChart, LifeHistogram } from '../components/ops/OpsCharts'
import { CumulativeDemand, FleetDonut, ModuleChart, UrgentBars } from '../components/ops/FleetCharts'
import { useFleet } from '../lib/fleet'
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
  const queue = useMemo(() => active.filter((e) => e.urgency !== 'watch'), [active])
  const nowCount = useMemo(() => active.filter((e) => e.urgency === 'now').length, [active])
  const top = queue[0]

  const send = async () => {
    if (!top) return
    setSlack({ state: 'loading' })
    setSlack(await sendEngineAlert(top, settings))
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-end justify-between gap-3">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">현황</h1>
        <Link to="/plan" className="text-[13px] font-medium no-underline" style={{ color: 'var(--accent)' }}>정비 계획 →</Link>
      </div>

      {nowCount > 0 && top && (
        <div
          className="flex flex-col gap-2.5 border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          style={{ background: 'var(--status-critical-wash)', borderColor: 'color-mix(in oklab, var(--status-critical) 40%, transparent)', borderRadius: 'var(--radius-sm)' }}
        >
          <p className="m-0 flex flex-row flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--status-critical)' }} />
            <span className="font-semibold" style={{ color: 'var(--status-critical)' }}>즉시 조치 {nowCount}대</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              가장 급한 엔진 <span className="mono">{top.name}</span> · 남은 <span className="mono">{top.pred}</span> cycle
            </span>
          </p>
          <div className="flex shrink-0 flex-row flex-wrap items-center gap-2">
            {slack.state === 'off' && <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Slack 미연결</span>}
            {slack.state === 'error' && <span className="text-[11.5px]" style={{ color: 'var(--status-critical)' }}>전송 실패</span>}
            <Link to={`/equipment/engine-${top.unit}?tab=diagnosis`} className="border px-3 py-1.5 text-[12.5px] font-medium no-underline" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-1)' }}>
              고장 진단
            </Link>
            <button onClick={send} disabled={slack.state === 'loading' || slack.state === 'done'} className="border px-3 py-1.5 text-[12.5px] font-medium" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)', background: 'var(--surface-1)' }}>
              {slack.state === 'loading' ? '전송 중…' : slack.state === 'done' ? '전송됨' : 'Slack'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        <Panel title="엔진 상태">
          <FleetDonut engines={active} />
        </Panel>
        <Panel title="누적 정비 요청" sub="앞으로 60일, 기한이 도래하는 엔진 수">
          <CumulativeDemand engines={active} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <Panel title="주별 정비 요청">
          <DemandChart engines={fleet} plan={plan.items} />
        </Panel>
        <Panel title="남은 수명 분포">
          <LifeHistogram engines={fleet} dangerN={settings.dangerN} />
        </Panel>
        <div className="lg:col-span-2 xl:col-span-1">
          <Panel title="점검 예상 모듈" sub="위험·주의 엔진 기준 추정">
            <ModuleChart engines={active} />
          </Panel>
        </div>
      </div>

      <Panel
        title="가장 급한 엔진"
        action={<Link to="/plan" className="text-[12.5px] no-underline" style={{ color: 'var(--accent)' }}>전체 →</Link>}
      >
        <UrgentBars engines={queue} dangerN={settings.dangerN} />
      </Panel>
    </div>
  )
}

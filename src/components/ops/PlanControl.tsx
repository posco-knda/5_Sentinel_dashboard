import { useState } from 'react'
import { limitDate, type FleetEngine } from '../../lib/fleet'
import { useAuth } from '../../lib/auth'
import { announceWorkflow } from '../../lib/notify'
import { ACTION_LABEL, canAct, usePlan, type PlanAction } from '../../lib/plan'
import { useSettings } from '../../lib/settings'
import { DecisionDialog, type DecisionMode } from './DecisionDialog'
import { StatusChip } from './StatusChip'

const md = (d: string) => d.slice(5).replace('-', '/')

/**
 * 엔진 하나의 처리 상태와, 지금 로그인한 역할이 할 수 있는 다음 단계 버튼.
 * 담당자: 검토 시작 → 결재 요청 → (승인 뒤) 정비 완료 / 책임자: 승인·반려
 */
export function PlanControl({ engine, stacked = false, compact = false }: { engine: FleetEngine; stacked?: boolean; compact?: boolean }) {
  const plan = usePlan()
  const { user } = useAuth()
  const { settings } = useSettings()
  const [dlg, setDlg] = useState<DecisionMode | null>(null)
  const item = plan.get(engine.unit)
  const can = (a: PlanAction) => canAct(user?.role, a, item.status)
  const tooLate = (item.status === 'scheduled' || item.status === 'submitted') && !!item.date && item.date > limitDate(engine.daysLeft)

  const pill = (label: string, onClick: () => void, primary = false, danger = false) => (
    <button
      key={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      className="whitespace-nowrap border px-2.5 py-1 text-[12px] font-medium"
      style={{
        borderColor: primary ? 'var(--accent)' : danger ? 'color-mix(in oklab, var(--status-critical) 55%, transparent)' : 'var(--border-strong)',
        background: primary ? 'var(--accent)' : 'transparent',
        color: primary ? 'var(--accent-ink)' : danger ? 'var(--status-critical)' : 'var(--text-primary)',
        borderRadius: 'var(--radius-pill)',
      }}
    >
      {label}
    </button>
  )

  const buttons = [
    can('review') && pill(ACTION_LABEL.review, () => plan.act(engine.unit, 'review')),
    can('submit') && !(compact && item.status === 'new') && pill(ACTION_LABEL.submit, () => setDlg('submit'), true),
    can('withdraw') && pill(ACTION_LABEL.withdraw, () => plan.act(engine.unit, 'withdraw')),
    can('approve') && pill(ACTION_LABEL.approve, () => setDlg('approve'), true),
    can('reject') && pill(ACTION_LABEL.reject, () => setDlg('reject'), false, true),
    can('complete') && pill(ACTION_LABEL.complete, () => {
      if (plan.act(engine.unit, 'complete').ok && settings.notifyWorkflow && user) void announceWorkflow(engine, 'complete', user, {})
    }, true),
  ].filter(Boolean)

  return (
    <div className={`flex ${stacked ? 'flex-col items-start' : 'flex-row flex-wrap items-center'} gap-2`} onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-row flex-wrap items-center gap-2">
        <StatusChip status={item.status} />
        {item.date && item.status !== 'new' && item.status !== 'review' && item.status !== 'rejected' && (
          <span className="mono text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            {item.status === 'submitted' ? `희망 ${md(item.date)}` : `${md(item.date)} 정비`}
          </span>
        )}
        {tooLate && (
          <span className="text-[11px]" style={{ color: 'var(--status-critical)' }}>
            남은 수명보다 늦은 일정
          </span>
        )}
      </div>
      {buttons.length > 0 && <div className="flex flex-row flex-wrap items-center gap-1.5">{buttons}</div>}
      {dlg && <DecisionDialog mode={dlg} engine={engine} onClose={() => setDlg(null)} />}
    </div>
  )
}

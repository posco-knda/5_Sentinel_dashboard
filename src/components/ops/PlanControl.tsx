import { limitDate, requestDate, type FleetEngine } from '../../lib/fleet'
import { STATUS_LABEL, STATUS_ORDER, todayStr, usePlan, type PlanStatus } from '../../lib/plan'

const STATUS_COLOR: Record<PlanStatus, string> = {
  new: 'var(--status-critical)',
  ack: 'var(--text-secondary)',
  scheduled: 'var(--accent)',
  done: 'var(--status-good)',
}

const field = {
  background: 'var(--surface-2)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
  borderRadius: 'var(--radius-xs)',
} as const

/** 엔진 하나의 정비 처리 상태(미확인·확인·정비 예정·완료)와 예정일을 바꾸는 컨트롤 */
export function PlanControl({ engine, stacked = false }: { engine: Pick<FleetEngine, 'unit' | 'requestIn' | 'daysLeft'>; stacked?: boolean }) {
  const plan = usePlan()
  const item = plan.get(engine.unit)
  const tooLate = item.status === 'scheduled' && !!item.date && item.date > limitDate(engine.daysLeft)

  return (
    <div className={`flex ${stacked ? 'flex-col items-start' : 'flex-row flex-wrap items-center'} gap-2`} onClick={(e) => e.stopPropagation()}>
      <select
        aria-label="정비 처리 상태"
        value={item.status}
        onChange={(e) => {
          const status = e.target.value as PlanStatus
          plan.set(engine.unit, { status, date: status === 'scheduled' ? (item.date ?? requestDate(engine.requestIn)) : undefined })
        }}
        className="border px-2 py-1 text-[12px] font-medium"
        style={{ ...field, color: STATUS_COLOR[item.status] }}
      >
        {STATUS_ORDER.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {item.status === 'scheduled' && (
        <input
          type="date"
          aria-label="정비 예정일"
          min={todayStr()}
          value={item.date ?? ''}
          onChange={(e) => e.target.value && plan.set(engine.unit, { status: 'scheduled', date: e.target.value })}
          className="mono border px-2 py-1 text-[12px]"
          style={field}
        />
      )}
      {tooLate && (
        <span className="text-[11px]" style={{ color: 'var(--status-critical)' }}>
          남은 수명보다 늦은 일정
        </span>
      )}
    </div>
  )
}

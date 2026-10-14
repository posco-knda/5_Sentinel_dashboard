import { STATUS_COLOR, STATUS_LABEL, type PlanStatus } from '../../lib/plan'

/** 정비 처리 상태 표시 — 색 점과 이름 */
export function StatusChip({ status }: { status: PlanStatus }) {
  return (
    <span
      className="inline-flex shrink-0 flex-row items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-[11.5px] font-medium"
      style={{ borderColor: 'color-mix(in oklab, ' + STATUS_COLOR[status] + ' 45%, transparent)', color: status === 'new' ? 'var(--text-secondary)' : STATUS_COLOR[status], borderRadius: 'var(--radius-pill)' }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR[status] }} />
      {STATUS_LABEL[status]}
    </span>
  )
}

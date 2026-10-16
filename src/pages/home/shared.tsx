import { Link } from 'react-router-dom'
import { PlanControl } from '../../components/ops/PlanControl'
import { UrgencyChip } from '../../components/ops/UrgencyChip'
import { daysText, deadlineText, type FleetEngine } from '../../lib/fleet'

/** 눌러서 해당 화면으로 가는 숫자 칸 */
export function StatLink({ to, label, value, unit, sub, color }: { to: string; label: string; value: number | string; unit?: string; sub?: string; color?: string }) {
  return (
    <Link to={to} className="surface-card row-link flex flex-col gap-1 border px-4 py-3 no-underline" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <span className="flex flex-row items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
        {label}
      </span>
      <span className="flex flex-row items-baseline gap-1.5">
        <span className="mono text-[26px] font-semibold leading-none" style={{ color: 'var(--text-primary)' }}>{value}</span>
        {unit && <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{unit}</span>}
      </span>
      {sub && <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</span>}
    </Link>
  )
}

/** 엔진 한 줄 — 이름·긴급도·남은 수명과, 지금 역할이 할 수 있는 처리 버튼 */
export function EngineLine({ e, note, noteLabel }: { e: FleetEngine; note?: string; noteLabel?: string }) {
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-row flex-wrap items-center gap-2">
          <Link to={`/equipment/engine-${e.unit}?tab=diagnosis`} className="text-[13.5px] font-semibold no-underline" style={{ color: 'var(--text-primary)' }}>{e.name}</Link>
          <UrgencyChip urgency={e.urgency} />
          <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            남은 <span className="mono font-medium">{e.pred}</span> cycle · {daysText(e.daysLeft)} · 요청 기한 {deadlineText(e.requestIn)}
          </span>
        </div>
        <div className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          점검 예상 모듈 {e.topPart ? e.topPart.label : '뚜렷한 변화 없음'}
        </div>
        {note && (
          <div className="mt-1.5 border-l-2 pl-2.5 text-[12px]" style={{ borderColor: 'var(--accent)', color: 'var(--text-secondary)' }}>
            {noteLabel && <span style={{ color: 'var(--text-muted)' }}>{noteLabel} · </span>}
            {note}
          </div>
        )}
      </div>
      <div className="shrink-0">
        <PlanControl engine={e} compact />
      </div>
    </div>
  )
}

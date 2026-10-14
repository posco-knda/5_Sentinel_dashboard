import { URGENCY, type Urgency } from '../../lib/fleet'

export function UrgencyChip({ urgency }: { urgency: Urgency }) {
  const u = URGENCY[urgency]
  return (
    <span
      className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap border px-2.5 py-[3px] text-[11px] font-medium"
      style={{
        color: u.color,
        borderColor: `color-mix(in oklab, ${u.color} 35%, transparent)`,
        background: `color-mix(in oklab, ${u.color} 10%, transparent)`,
        borderRadius: 'var(--radius-pill)',
      }}
      title={u.hint}
    >
      {u.label}
    </span>
  )
}

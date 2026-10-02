import { useState } from 'react'
import { Badge } from './Badge'
import { Meter } from './Meter'
import type { EquipmentRow } from '../data/mock'

const SIZE_CLASS = { md: 'text-[15px]', lg: 'text-xl' } as const

export function EngineSwitcher({
  engines,
  selectedId,
  onSelect,
  size = 'md',
}: {
  engines: EquipmentRow[]
  selectedId: string
  onSelect: (id: string) => void
  size?: keyof typeof SIZE_CLASS
}) {
  const [open, setOpen] = useState(false)
  const current = engines.find((e) => e.id === selectedId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`icon-btn flex flex-row items-center gap-1.5 px-1 py-0.5 font-semibold ${SIZE_CLASS[size]}`}
        style={{ color: 'var(--text-primary)' }}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.name ?? selectedId}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            role="listbox"
            className="surface-card absolute left-0 top-full z-20 mt-1 max-h-72 w-64 overflow-y-auto border p-1"
            style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}
          >
            {engines.map((e) => (
              <button
                key={e.id}
                onClick={() => {
                  onSelect(e.id)
                  setOpen(false)
                }}
                className={`dropdown-item flex w-full flex-col gap-1 px-2.5 py-2 text-left ${e.id === selectedId ? 'is-active' : ''}`}
              >
                <div className="flex flex-row items-center justify-between gap-2">
                  <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>
                    {e.name}
                  </span>
                  <Badge status={e.status} />
                </div>
                <Meter value={e.health} status={e.status} />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

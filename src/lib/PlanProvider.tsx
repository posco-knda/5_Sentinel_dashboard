import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { PlanContext, STATUS_ORDER, type PlanItem } from './plan'

const KEY = 'sentinel-plan-v1'
const DATE = /^\d{4}-\d{2}-\d{2}$/

function load(): Record<number, PlanItem> {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Record<string, Partial<PlanItem>>
    const out: Record<number, PlanItem> = {}
    for (const [k, v] of Object.entries(raw)) {
      const unit = Number(k)
      if (!Number.isInteger(unit) || !v || !STATUS_ORDER.includes(v.status as never)) continue
      out[unit] = { status: v.status!, date: typeof v.date === 'string' && DATE.test(v.date) ? v.date : undefined, updated: Number(v.updated) || 0 }
    }
    return out
  } catch {
    return {}
  }
}

function save(items: Record<number, PlanItem>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* 저장이 막힌 환경에서는 이번 세션에만 적용한다 */
  }
}

const EMPTY: PlanItem = { status: 'new', updated: 0 }

export function PlanProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Record<number, PlanItem>>(load)

  const set = useCallback((unit: number, patch: Partial<Pick<PlanItem, 'status' | 'date'>>) => {
    setItems((prev) => {
      const cur = prev[unit] ?? EMPTY
      const status = patch.status ?? cur.status
      const next: PlanItem = { status, date: status === 'scheduled' ? (patch.date ?? cur.date) : undefined, updated: Date.now() }
      const all = { ...prev, [unit]: next }
      save(all)
      return all
    })
  }, [])

  const clearAll = useCallback(() => {
    save({})
    setItems({})
  }, [])

  const get = useCallback((unit: number) => items[unit] ?? EMPTY, [items])
  const value = useMemo(() => ({ items, get, set, clearAll }), [items, get, set, clearAll])
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

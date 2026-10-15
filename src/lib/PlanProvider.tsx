import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useAuth } from './auth'
import { problem } from './schedule'
import { useSettings } from './settings'
import { ACTION_FROM, ACTION_LABEL, ACTION_ROLE, ACTION_TO, PlanContext, STATUS_ORDER, todayStr, type ActPayload, type ActResult, type PlanAction, type PlanEvent, type PlanItem } from './plan'

const KEY = 'sentinel-plan-v2'
const DATE = /^\d{4}-\d{2}-\d{2}$/
const ACTIONS = Object.keys(ACTION_TO)
const NOTE_MAX = 300

function parse(raw: string | null): Record<number, PlanItem> {
  const out: Record<number, PlanItem> = {}
  if (!raw) return out
  const data = JSON.parse(raw) as Record<string, Partial<PlanItem>>
  for (const [k, v] of Object.entries(data)) {
    const unit = Number(k)
    if (!Number.isInteger(unit) || !v || !STATUS_ORDER.includes(v.status as never)) continue
    const history = (Array.isArray(v.history) ? v.history : []).filter((e): e is PlanEvent => !!e && ACTIONS.includes(e.action) && typeof e.by === 'string' && Number.isFinite(e.at))
    out[unit] = { status: v.status!, date: typeof v.date === 'string' && DATE.test(v.date) ? v.date : undefined, updated: Number(v.updated) || 0, history }
  }
  return out
}

/** 저장소를 읽는다. 읽을 수 없으면(차단된 환경·손상) null */
function read(): Record<number, PlanItem> | null {
  try {
    return parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

function write(items: Record<number, PlanItem>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items))
  } catch {
    /* 저장이 막힌 환경에서는 이번 세션에만 적용한다 */
  }
}

const EMPTY: PlanItem = { status: 'new', updated: 0, history: [] }

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [items, setItems] = useState<Record<number, PlanItem>>(() => read() ?? {})
  const ref = useRef(items)
  useEffect(() => {
    ref.current = items
  }, [items])

  // 다른 탭(다른 계정)에서 바뀐 내용을 바로 받아 온다
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === KEY || e.key === null) setItems(read() ?? {})
    }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [])

  const act = useCallback(
    (unit: number, action: PlanAction, payload: ActPayload = {}): ActResult => {
      if (!user) return { ok: false, error: '로그인이 필요합니다' }
      if (user.role !== ACTION_ROLE[action]) return { ok: false, error: `${ACTION_LABEL[action]}은(는) 이 계정의 권한이 아닙니다` }
      // 다른 탭이 방금 바꾼 내용을 덮어쓰지 않도록 저장소의 최신 상태에서 시작한다
      const prev = read() ?? ref.current
      const cur = prev[unit] ?? EMPTY
      if (!ACTION_FROM[action].includes(cur.status)) return { ok: false, error: '이미 처리되었거나 지금 할 수 없는 단계입니다. 화면을 새로 확인해 주세요' }

      const note = payload.note?.trim().slice(0, NOTE_MAX) || undefined
      let date = cur.date
      if (action === 'submit' || action === 'approve') {
        const d = payload.date ?? cur.date
        if (!d || !DATE.test(d)) return { ok: false, error: '정비 일정을 입력해 주세요' }
        // 주간 계획 규칙: 이번 주·준비 기간·주말 불가, 하루 정비 수용 능력 초과 불가 (승인 때도 다시 검사한다)
        const why = problem(d, { today: todayStr(), prepDays: settings.prepDays, slotsPerDay: settings.slotsPerDay }, prev, unit)
        if (why) return { ok: false, error: why }
        date = d
      }
      if (action === 'submit' && !note) return { ok: false, error: '판단 사유를 입력해 주세요' }
      if (action === 'reject' && !note) return { ok: false, error: '반려 사유를 입력해 주세요' }
      if (action === 'withdraw' || action === 'reject') date = undefined

      const now = Date.now()
      const event: PlanEvent = { at: now, by: user.name, role: user.role, action, ...(note ? { note } : {}), ...(date && (action === 'submit' || action === 'approve') ? { date } : {}) }
      const status = ACTION_TO[action]
      const next: PlanItem = { status, date: status === 'submitted' || status === 'scheduled' || status === 'done' ? date : undefined, updated: now, history: [...cur.history, event] }
      const all = { ...prev, [unit]: next }
      write(all)
      setItems(all)
      return { ok: true }
    },
    [user, settings.prepDays, settings.slotsPerDay],
  )

  const clearAll = useCallback(() => {
    write({})
    setItems({})
  }, [])

  const get = useCallback((unit: number) => items[unit] ?? EMPTY, [items])
  const value = useMemo(() => ({ items, get, act, clearAll }), [items, get, act, clearAll])
  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

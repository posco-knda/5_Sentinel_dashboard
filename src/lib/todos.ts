import { useSyncExternalStore } from 'react'
import type { Role } from './auth'

export interface Todo {
  id: number
  text: string
  done: boolean
}
type Store = Partial<Record<Role, Todo[]>>
interface Snap {
  store: Store
  /** 방금 체크한 연출이 끝나기 전 — 제목 줄의 비행기를 잠시 숨긴다 */
  busy: boolean
  /** 연출이 끝나기 전까지 제목 줄 비행기가 머무는 이전 위치(0~1) */
  hold: number
}

const KEY = 'sentinel-todos-v1'
export const MAX_ITEMS = 30
/** 체크 연출(인물이 비행기를 타고 날아가는 시간)이 끝나는 데 걸리는 시간(ms) */
const BUSY_MS = 3700

/** 처음 열었을 때 비어 보이지 않게 두는 예시 (지우거나 고쳐도 된다) */
const SAMPLE: Record<Role, string[]> = {
  planner: ['기한 지난 엔진 검토하기', '반려된 요청 사유 확인', '주간 리포트 확인'],
  manager: ['결재 대기 요청 확인', '이번 주 정비 일정 점검', '주간 리포트 확인'],
}
const sample = (role: Role): Todo[] => SAMPLE[role].map((t, i) => ({ id: i + 1, text: t, done: false }))

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Store | null
    if (s && typeof s === 'object') return s
  } catch {
    // 저장소를 못 읽으면 예시 목록으로 시작한다
  }
  return {}
}

let snap: Snap = { store: load(), busy: false, hold: 0 }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

// 다른 탭에서 바꾼 목록도 따라온다
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    snap = { ...snap, store: load() }
    emit()
  })
}

let busyTimer: number | undefined
const ratioOf = (todos: Todo[]) => (todos.length ? todos.filter((t) => t.done).length / todos.length : 0)

export function setTodos(role: Role, next: Todo[], animate = false) {
  const before = ratioOf(snap.store[role] ?? sample(role))
  const store = { ...snap.store, [role]: next }
  try {
    localStorage.setItem(KEY, JSON.stringify(store))
  } catch {
    // 저장하지 못해도 화면은 그대로 동작한다
  }
  snap = { store, busy: animate, hold: before }
  emit()
  if (animate) {
    window.clearTimeout(busyTimer)
    busyTimer = window.setTimeout(() => {
      snap = { ...snap, busy: false }
      emit()
    }, BUSY_MS)
  }
}

export function useTodos(role: Role | undefined): { todos: Todo[]; busy: boolean; ratio: number; shown: number } {
  const s = useSyncExternalStore(subscribe, () => snap)
  const todos = role ? (s.store[role] ?? sample(role)) : []
  const ratio = ratioOf(todos)
  return { todos, busy: s.busy, ratio, shown: s.busy ? s.hold : ratio }
}

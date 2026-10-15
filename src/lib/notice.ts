import { useSyncExternalStore } from 'react'

/** 화면 구석에 잠깐 뜨는 알림 — 자동 Slack 전송 결과처럼 사용자가 누르지 않은 동작을 알린다 */
export interface Notice {
  id: number
  text: string
  tone: 'ok' | 'error'
  /** 알림에 붙는 버튼(예: 되돌리기) */
  action?: { label: string; run: () => void }
}

let list: Notice[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

export function pushNotice(text: string, tone: Notice['tone'] = 'ok', ms = 5000, action?: Notice['action']) {
  const n: Notice = { id: ++seq, text, tone, action }
  list = [...list, n].slice(-3)
  emit()
  setTimeout(() => dismissNotice(n.id), ms)
}

export function dismissNotice(id: number) {
  list = list.filter((n) => n.id !== id)
  emit()
}

const subscribe = (f: () => void) => {
  subs.add(f)
  return () => subs.delete(f)
}

export function useNotices(): Notice[] {
  return useSyncExternalStore(subscribe, () => list)
}

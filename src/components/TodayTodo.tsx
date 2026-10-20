import { useState, type CSSProperties, type FormEvent } from 'react'
import { useAuth, type Role } from '../lib/auth'

const KEY = 'sentinel-todos-v1'
const MAX_ITEMS = 30

interface Todo {
  id: number
  text: string
  done: boolean
}
type Store = Partial<Record<Role, Todo[]>>

/** 처음 열었을 때 비어 보이지 않게 두는 예시 (지우거나 고쳐도 된다) */
const SAMPLE: Record<Role, string[]> = {
  planner: ['기한 지난 엔진 검토하기', '반려된 요청 사유 확인', '주간 리포트 확인'],
  manager: ['결재 대기 요청 확인', '이번 주 정비 일정 점검', '주간 리포트 확인'],
}

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Store | null
    if (s && typeof s === 'object') return s
  } catch {
    // 저장소를 못 읽으면 예시 목록으로 시작한다
  }
  return {}
}

function save(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // 저장하지 못해도 화면은 그대로 동작한다
  }
}

const PLANE = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'

function Plane({ size, className, style }: { size: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className={className} style={{ transform: 'rotate(45deg)', ...style }} aria-hidden="true">
      <path d={PLANE} />
    </svg>
  )
}

/**
 * 사이드바의 할 일 목록 — 직접 적어 넣고, 끝내면 체크한다.
 * 체크하면 비행기가 글자를 가로질러 날며 줄을 긋고, 오른쪽에 비행기 모양 체크가 남는다. 목록은 계정(역할)별로 이 브라우저에 저장된다.
 */
export function TodayTodo() {
  const { user } = useAuth()
  const role = user?.role
  const [store, setStore] = useState<Store>(load)
  const [fresh, setFresh] = useState<number | null>(null)
  const [text, setText] = useState('')
  if (!role) return null

  const todos = store[role] ?? SAMPLE[role].map((t, i) => ({ id: i + 1, text: t, done: false }))
  const commit = (next: Todo[]) => {
    const s = { ...store, [role]: next }
    setStore(s)
    save(s)
  }
  const add = (e: FormEvent) => {
    e.preventDefault()
    const t = text.trim()
    if (!t || todos.length >= MAX_ITEMS) return
    commit([...todos, { id: Math.max(0, ...todos.map((x) => x.id)) + 1, text: t.slice(0, 80), done: false }])
    setText('')
  }
  const toggle = (id: number) => {
    const cur = todos.find((x) => x.id === id)
    if (!cur) return
    setFresh(cur.done ? null : id)
    commit(todos.map((x) => (x.id === id ? { ...x, done: !x.done } : x)))
  }
  const doneN = todos.filter((x) => x.done).length

  return (
    <div className="mb-2.5 flex flex-col gap-1.5 border px-3 py-2.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-sm)' }}>
      <div className="flex flex-row items-baseline justify-between">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>할 일</span>
        <span className="flex flex-row items-baseline gap-2">
          {doneN > 0 && (
            <button onClick={() => commit(todos.filter((x) => !x.done))} className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              완료 지우기
            </button>
          )}
          <span className="mono text-[11px]" style={{ color: doneN === todos.length && todos.length > 0 ? 'var(--status-good)' : 'var(--text-muted)' }}>{doneN}/{todos.length}</span>
        </span>
      </div>
      <div className="flex max-h-[148px] flex-col overflow-y-auto overflow-x-hidden">
        {todos.length === 0 && (
          <p className="m-0 py-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>할 일이 없습니다. 아래에 적어 보세요.</p>
        )}
        {todos.map((t) => (
          <div key={t.id} className={`todo-row group relative flex flex-row items-center gap-2 py-1 text-[12.5px] ${t.done ? 'is-done' : ''} ${fresh === t.id ? 'is-new' : ''}`} style={{ color: t.done ? 'var(--text-muted)' : 'var(--text-primary)' }}>
            <button onClick={() => toggle(t.id)} aria-pressed={t.done} aria-label={`${t.text} ${t.done ? '완료 취소' : '완료'}`} className="relative min-w-0 flex-1 truncate text-left" title={t.text}>
              {t.text}
              <i className="todo-strike" />
            </button>
            <Plane size={14} className="todo-fly" style={{ color: 'var(--accent)' }} />
            <Plane size={15} className="todo-stamp" style={{ color: 'var(--status-good)' }} />
            <button onClick={() => commit(todos.filter((x) => x.id !== t.id))} aria-label="삭제" className="hidden shrink-0 text-[13px] leading-none group-hover:block" style={{ color: 'var(--text-muted)' }}>
              ×
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={add}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="+ 할 일 추가"
          maxLength={80}
          aria-label="할 일 추가"
          className="w-full border px-2 py-1 text-[12px]"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border)', color: 'var(--text-primary)', borderRadius: 6 }}
        />
      </form>
    </div>
  )
}

import { useState, type CSSProperties, type FormEvent } from 'react'
import { useAuth } from '../lib/auth'
import { MAX_ITEMS, setTodos, useTodos, type Todo } from '../lib/todos'
import { LeaveFx } from './LeaveFx'
import { Panel } from './Panel'

const PLANE = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'

function Plane({ size, className, style }: { size: number; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className={className} style={{ transform: 'rotate(45deg)', ...style }} aria-hidden="true">
      <path d={PLANE} />
    </svg>
  )
}

/**
 * 현황 화면의 할 일 목록 — 직접 적어 넣고, 끝내면 체크한다.
 * 체크하면 비행기가 글자를 가로질러 날며 줄을 긋고, 오른쪽에 비행기 모양 체크가 남는다. 목록은 계정(역할)별로 이 브라우저에 저장된다.
 */
export function TodoPanel({ fill = false }: { fill?: boolean }) {
  const { user } = useAuth()
  const role = user?.role
  const { todos } = useTodos(role)
  const [fresh, setFresh] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [leave, setLeave] = useState({ n: 0, last: false })
  if (!role) return null

  const commit = (next: Todo[], animate = false) => setTodos(role, next, animate)
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
    commit(todos.map((x) => (x.id === id ? { ...x, done: !x.done } : x)), !cur.done)
    // 하나 끝낼 때마다 프로필 인물이 비행기를 타고 날아가고, 마지막 할 일이면 퇴근 인사를 한다
    if (!cur.done) setLeave({ n: leave.n + 1, last: todos.every((x) => x.id === id || x.done) })
  }
  const doneN = todos.filter((x) => x.done).length

  return (
    <Panel
      dense
      fill={fill}
      title="할 일"
      sub={`${doneN}/${todos.length} 완료 · 글을 누르면 체크됩니다`}
      action={
        doneN > 0 ? (
          <button onClick={() => commit(todos.filter((x) => !x.done))} className="shrink-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            완료 지우기
          </button>
        ) : undefined
      }
    >
      <form onSubmit={add} className="mb-2 shrink-0">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="+ 할 일을 적고 Enter"
          maxLength={80}
          aria-label="할 일 추가"
          className="w-full border px-3 py-2 text-[13.5px]"
          style={{ background: 'var(--page)', borderColor: 'var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-xs)' }}
        />
      </form>
      <div className={`flex flex-col overflow-y-auto overflow-x-hidden ${fill ? 'min-h-0 flex-1' : 'max-h-[260px]'}`}>
        {todos.length === 0 && <p className="m-0 py-4 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>할 일이 없습니다</p>}
        {todos.map((t) => (
          <div key={t.id} className={`todo-row group relative flex flex-row items-center gap-3 py-2 text-[14.5px] ${t.done ? 'is-done' : ''} ${fresh === t.id ? 'is-new' : ''}`} style={{ color: t.done ? 'var(--text-muted)' : 'var(--text-primary)', borderBottom: '1px solid var(--border-soft)' }}>
            <button onClick={() => toggle(t.id)} aria-pressed={t.done} aria-label={`${t.text} ${t.done ? '완료 취소' : '완료'}`} className="relative min-w-0 flex-1 truncate text-left" title={t.text}>
              {t.text}
              <i className="todo-strike" />
            </button>
            <Plane size={16} className="todo-fly" style={{ color: 'var(--accent)' }} />
            <Plane size={18} className="todo-stamp" style={{ color: 'var(--status-good)' }} />
            <button onClick={() => commit(todos.filter((x) => x.id !== t.id))} aria-label="삭제" className="hidden shrink-0 text-[16px] leading-none group-hover:block" style={{ color: 'var(--text-muted)' }}>
              ×
            </button>
          </div>
        ))}
      </div>
      {leave.n > 0 && <LeaveFx key={leave.n} name={user?.name ?? ''} last={leave.last} onDone={() => setLeave((l) => ({ ...l, n: 0 }))} />}
    </Panel>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, type Role } from '../lib/auth'
import { useFleet } from '../lib/fleet'
import { todayStr, usePlan, type PlanStatus } from '../lib/plan'

const KEY = 'sentinel-today-v1'
const MAX = 4

type Stored = { date: string; units: Partial<Record<Role, number[]>> }

function readStored(): Stored {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null
    if (s && s.date === todayStr() && s.units) return s
  } catch {
    // 저장소를 못 읽으면 오늘 목록을 새로 만든다
  }
  return { date: todayStr(), units: {} }
}

/** 이 역할이 오늘 끝내야 하는 일이 끝났는가 */
const isDone = (role: Role, status: PlanStatus) => (role === 'planner' ? status === 'submitted' || status === 'scheduled' || status === 'done' : status !== 'submitted')

const PLANE = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'

function Plane({ size, className, style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className={className} style={{ transform: 'rotate(45deg)', ...style }} aria-hidden="true">
      <path d={PLANE} />
    </svg>
  )
}

/**
 * 사이드바의 '오늘 할 일' — 하루 처음 열 때의 처리 대상을 목록으로 만들고,
 * 처리하면 비행기가 글자를 가로질러 날며 줄을 긋고, 오른쪽에 비행기 모양 체크를 남긴다.
 *  · 담당자: 기한이 급한 엔진 검토 후 결재 올리기 / 책임자: 결재 대기 중인 요청 승인·반려 (새 요청은 목록 끝에 붙는다)
 */
export function TodayTodo() {
  const { user } = useAuth()
  const plan = usePlan()
  const fleet = useFleet()
  const role = user?.role
  const [snap, setSnap] = useState(() => readStored().units)

  // 목록은 하루 처음 열 때의 처리 대상으로 고정한다 (처리해서 대상에서 빠져도 목록에는 남아 줄이 그어진다)
  if (role) {
    const cur = snap[role]
    let next = cur
    if (!next && fleet.length) {
      next =
        role === 'planner'
          ? fleet
              .filter((e) => ['new', 'review', 'rejected'].includes(plan.get(e.unit).status))
              .sort((a, b) => a.requestIn - b.requestIn)
              .slice(0, MAX)
              .map((e) => e.unit)
          : []
    }
    if (role === 'manager' && next) {
      // 책임자는 새 결재 요청이 올라오면 목록 끝에 붙는다
      const extra = fleet.filter((e) => plan.get(e.unit).status === 'submitted' && !next!.includes(e.unit)).map((e) => e.unit)
      if (extra.length && next.length < MAX) next = [...next, ...extra].slice(0, MAX)
    }
    if (next && next.length !== cur?.length) setSnap({ ...snap, [role]: next })
    else if (next && !cur) setSnap({ ...snap, [role]: next })
  }
  const units = (role && snap[role]) || []
  const rows = role ? units.map((u) => ({ unit: u, done: isDone(role, plan.get(u).status) })) : []

  // 방금 끝난 일만 애니메이션을 보여 준다 (처음 열었을 때 이미 끝난 일은 조용히 표시)
  const doneKey = rows.filter((r) => r.done).map((r) => r.unit).join(',')
  const [seen, setSeen] = useState({ key: doneKey, fresh: [] as number[] })
  if (seen.key !== doneKey) {
    const before = new Set(seen.key ? seen.key.split(',').map(Number) : [])
    setSeen({ key: doneKey, fresh: rows.filter((r) => r.done && !before.has(r.unit)).map((r) => r.unit) })
  }

  const unitsKey = units.join(',')
  useEffect(() => {
    if (!role) return
    try {
      const s = readStored()
      s.units[role] = unitsKey ? unitsKey.split(',').map(Number) : []
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      // 저장하지 못해도 화면은 그대로 동작한다
    }
  }, [role, unitsKey])

  if (!role) return null
  const doneN = rows.filter((r) => r.done).length
  return (
    <div className="mb-2.5 flex flex-col gap-1 border px-3 py-2.5" style={{ background: 'var(--surface-2)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-sm)' }}>
      <div className="mb-0.5 flex flex-row items-baseline justify-between">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary)' }}>오늘 할 일</span>
        <span className="mono text-[11px]" style={{ color: doneN === rows.length && rows.length > 0 ? 'var(--status-good)' : 'var(--text-muted)' }}>{doneN}/{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{role === 'manager' ? '지금 결재할 요청이 없습니다.' : '오늘 처리할 엔진이 없습니다.'}</p>
      ) : (
        rows.map((r) => (
          <Link
            key={r.unit}
            to={role === 'manager' ? '/approvals' : `/equipment/engine-${r.unit}`}
            className={`todo-row relative flex flex-row items-center gap-2 py-1 text-[12.5px] no-underline ${r.done ? 'is-done' : ''} ${seen.fresh.includes(r.unit) ? 'is-new' : ''}`}
            style={{ color: r.done ? 'var(--text-muted)' : 'var(--text-primary)' }}
          >
            <span className="relative min-w-0 flex-1 truncate">
              Engine #{r.unit} {role === 'manager' ? '승인·반려' : '검토 후 결재 요청'}
              <i className="todo-strike" />
            </span>
            <Plane size={14} className="todo-fly" style={{ color: 'var(--accent)' }} />
            <Plane size={15} className="todo-stamp" style={{ color: 'var(--status-good)' }} />
          </Link>
        ))
      )}
    </div>
  )
}

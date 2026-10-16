import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { deadlineText, requestDate, type FleetEngine } from '../../lib/fleet'
import { todayStr, type PlanItem } from '../../lib/plan'
import { closedReason, label as dayLabel } from '../../lib/schedule'

const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

interface Day {
  /** 정비 요청 기한이 이미 지난 엔진 (오늘 칸에 모은다) */
  overdue: FleetEngine[]
  /** 이 날이 정비 요청 기한인 엔진 */
  due: FleetEngine[]
  /** 승인되어 이 날 정비가 예정된 엔진 */
  sched: FleetEngine[]
  /** 이 날을 희망 정비일로 결재를 기다리는 엔진 */
  wait: FleetEngine[]
}

const KINDS = [
  { key: 'overdue', label: '기한 경과', color: 'var(--status-critical)' },
  { key: 'sched', label: '정비 예정', color: 'var(--status-good)' },
  { key: 'wait', label: '결재 대기', color: 'var(--accent)' },
  { key: 'due', label: '요청 기한', color: 'var(--status-warning)' },
] as const

/** 정비 일정 달력 — 날짜별로 정비 요청 기한이 오는 엔진과 정비 예정·결재 대기 건을 보여 준다 */
export function MaintenanceCalendar({ engines, plan, prepDays, slotsPerDay }: { engines: FleetEngine[]; plan: Record<number, PlanItem>; prepDays: number; slotsPerDay: number }) {
  const today = todayStr()
  const rules = { today: todayStr(), prepDays, slotsPerDay }
  const [cursor, setCursor] = useState(() => {
    const t = parse(today)
    return new Date(t.getFullYear(), t.getMonth(), 1)
  })
  const [selected, setSelected] = useState(today)

  const days = useMemo(() => {
    const m = new Map<string, Day>()
    const get = (k: string) => {
      let d = m.get(k)
      if (!d) {
        d = { overdue: [], due: [], sched: [], wait: [] }
        m.set(k, d)
      }
      return d
    }
    for (const e of engines) {
      const p = plan[e.unit]
      if (p?.status === 'done') continue
      if (p?.status === 'scheduled' && p.date) get(p.date).sched.push(e)
      else if (p?.status === 'submitted' && p.date) get(p.date).wait.push(e)
      else if (e.requestIn <= 0) get(today).overdue.push(e)
      else get(requestDate(e.requestIn)).due.push(e)
    }
    return m
  }, [engines, plan, today])

  // 날짜별로 이미 정비 예정(승인)된 엔진 수 — 하루 수용 능력과 비교한다
  const usedByDate = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of Object.values(plan)) if (p.status === 'scheduled' && p.date) m.set(p.date, (m.get(p.date) ?? 0) + 1)
    return m
  }, [plan])

  const cells = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1 - cursor.getDay())
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  }, [cursor])

  const maxDue = useMemo(() => Math.max(1, ...cells.map((c) => days.get(ymd(c))?.due.length ?? 0)), [cells, days])
  const move = (delta: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1))
  const goToday = () => {
    const t = parse(today)
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1))
    setSelected(today)
  }

  const sel = days.get(selected)
  const list = sel ? KINDS.flatMap((k) => sel[k.key].map((e) => ({ e, k }))) : []
  const selDate = parse(selected)
  const selUsed = usedByDate.get(selected) ?? 0
  const selLeft = slotsPerDay - selUsed
  const selProblem = closedReason(selected, rules) ?? (selLeft <= 0 ? `${dayLabel(selected)}은(는) 이미 정비 예정 ${selUsed}/${slotsPerDay}대로 가득 찼습니다` : null)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-row items-center justify-between gap-2">
        <div className="flex flex-row items-center gap-1.5">
          <button onClick={() => move(-1)} aria-label="이전 달" className="border px-2.5 py-1 text-[13px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-xs)' }}>
            ‹
          </button>
          <button onClick={() => move(1)} aria-label="다음 달" className="border px-2.5 py-1 text-[13px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-xs)' }}>
            ›
          </button>
          <span className="ml-1.5 text-[14px] font-semibold">
            {cursor.getFullYear()}년 {cursor.getMonth() + 1}월
          </span>
        </div>
        <button onClick={goToday} className="border px-3 py-1 text-[12px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
          오늘
        </button>
      </div>

      <div role="grid" aria-label="정비 일정 달력" className="grid grid-cols-7 gap-px overflow-hidden border" style={{ background: 'var(--border-soft)', borderColor: 'var(--border-soft)', borderRadius: 'var(--radius-xs)' }}>
        {WEEK.map((w, i) => (
          <div key={w} role="columnheader" className="py-1 text-center text-[11px]" style={{ background: 'var(--surface-1)', color: i === 0 ? 'var(--status-critical)' : 'var(--text-muted)' }}>
            {w}
          </div>
        ))}
        {cells.map((c) => {
          const key = ymd(c)
          const d = days.get(key)
          const inMonth = c.getMonth() === cursor.getMonth()
          const isToday = key === today
          const isSel = key === selected
          const counts: { key: string; label: string; color: string; n: number | string }[] = KINDS.map((k) => ({ ...k, n: d?.[k.key].length ?? 0 })).filter((k) => k.n > 0)
          const closed = closedReason(key, rules) !== null
          const full = (usedByDate.get(key) ?? 0) >= slotsPerDay
          if (full) counts.push({ key: 'full', label: '정비 만석', color: 'var(--status-critical)', n: '만석' })
          const heat = d && d.due.length ? Math.round(6 + (d.due.length / maxDue) * 50) : 0
          return (
            <button
              key={key}
              role="gridcell"
              aria-selected={isSel}
              aria-label={`${c.getMonth() + 1}월 ${c.getDate()}일${counts.map((k) => (k.key === 'full' ? `, ${k.label}` : `, ${k.label} ${k.n}대`)).join('')}`}
              onClick={() => {
                setSelected(key)
                if (!inMonth) setCursor(new Date(c.getFullYear(), c.getMonth(), 1))
              }}
              className="flex h-[52px] flex-col items-start justify-between px-1.5 py-1 text-left"
              style={{
                background: heat ? `color-mix(in oklab, #3b9fd6 ${heat}%, var(--surface-1))` : closed ? 'color-mix(in oklab, var(--surface-2) 70%, var(--surface-1))' : 'var(--surface-1)',
                outline: isSel ? '2px solid var(--accent)' : 'none',
                outlineOffset: -2,
                opacity: inMonth ? 1 : 0.45,
                borderRadius: 0,
              }}
            >
              <span
                className="mono flex h-[18px] min-w-[18px] items-center justify-center text-[11px]"
                style={{ color: isToday ? 'var(--accent-ink)' : c.getDay() === 0 ? 'var(--status-critical)' : 'var(--text-secondary)', background: isToday ? 'var(--accent)' : 'transparent', borderRadius: 999, fontWeight: isToday ? 700 : 500 }}
              >
                {c.getDate()}
              </span>
              <span className="flex flex-row flex-wrap gap-x-1.5 gap-y-0.5">
                {counts.map((k) => (
                  <span key={k.key} className="mono flex flex-row items-center gap-[3px] text-[10.5px] font-semibold" style={{ color: k.color }}>
                    <span className="h-[6px] w-[6px] rounded-full" style={{ background: k.color }} />
                    {k.n}
                  </span>
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-row flex-wrap gap-x-4 gap-y-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        {KINDS.map((k) => (
          <span key={k.key} className="flex flex-row items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: k.color }} />
            {k.label}
          </span>
        ))}
      </div>

      <div className="min-h-[216px] border-t pt-3" style={{ borderColor: 'var(--border-soft)' }}>
        <div className="mb-2 flex flex-row items-baseline justify-between gap-2">
          <span className="text-[13px] font-semibold">
            {selDate.getMonth() + 1}월 {selDate.getDate()}일 ({WEEK[selDate.getDay()]}){selected === today ? ' · 오늘' : ''}
          </span>
          <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{list.length ? `${list.length}대` : ''}</span>
        </div>
        <p className="m-0 mb-2 text-[11.5px]" style={{ color: selProblem ? 'var(--text-muted)' : 'var(--status-good)' }}>
          {selProblem ?? `정비 가능 자리 ${selLeft}/${slotsPerDay}대`}
        </p>
        {list.length === 0 ? (
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>이 날 예정된 정비 요청이나 일정이 없습니다</p>
        ) : (
          <div className="flex flex-col">
            {list.slice(0, 4).map(({ e, k }) => (
              <Link key={`${e.unit}-${k.key}`} to={`/equipment/engine-${e.unit}`} className="flex flex-row items-center gap-2.5 py-1.5 text-[12.5px] no-underline" style={{ borderBottom: '1px solid var(--border-soft)' }}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: k.color }} />
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{e.name}</span>
                <span style={{ color: k.color }}>{k.label}</span>
                <span className="mono ml-auto" style={{ color: 'var(--text-muted)' }}>
                  {e.pred} cycle{k.key === 'due' || k.key === 'overdue' ? ` · ${deadlineText(e.requestIn)}` : ''}
                </span>
              </Link>
            ))}
            {list.length > 4 && (
              <Link to="/plan" className="pt-2 text-[12px] no-underline" style={{ color: 'var(--accent)' }}>
                외 {list.length - 4}대 · 정비 계획에서 보기 →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

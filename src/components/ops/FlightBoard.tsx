import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestDate, useFleet, type FleetEngine } from '../../lib/fleet'
import { todayStr, usePlan, type PlanItem, type PlanStatus } from '../../lib/plan'

const DOW = ['일', '월', '화', '수', '목', '금', '토']
const md = (d: string) => d.slice(5).replace('-', '/')

interface Row {
  e: FleetEngine
  /** 시각 칸에 쓰는 날짜 — 정비일 또는 정비 요청 기한 */
  when: string
  kind: 'late' | 'wait' | 'ok' | 'review'
  ko: string
  en: string
}

const TONE: Record<Row['kind'], string> = { late: '#ff5d5d', wait: '#ffcc33', ok: '#5fe38d', review: '#9fb4ff' }

/** 글자 한 칸씩 철컥 넘어가는 분할 반전판 글자 */
function Flap({ text, color, delay = 0 }: { text: string; color: string; delay?: number }) {
  return (
    <span className="inline-flex flex-row flex-wrap" aria-label={text} style={{ color }}>
      {[...text].map((ch, i) => (
        <span key={i} className="flap" style={{ animationDelay: `${delay + i * 40}ms` }} aria-hidden="true">
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </span>
  )
}

function classify(e: FleetEngine, item: PlanItem): Row | null {
  const s: PlanStatus = item.status
  if (s === 'done') return null
  if (s === 'scheduled' && item.date) return { e, when: item.date, kind: 'ok', ko: '정비 예정', en: 'SCHEDULED' }
  if (s === 'submitted') return { e, when: item.date ?? requestDate(e.requestIn), kind: 'wait', ko: '결재 대기', en: 'PENDING' }
  if (e.requestIn <= 0) return { e, when: requestDate(e.requestIn), kind: 'late', ko: '지연', en: 'DELAYED' }
  return { e, when: requestDate(e.requestIn), kind: 'review', ko: s === 'review' ? '검토 중' : '검토 대기', en: s === 'review' ? 'REVIEW' : 'STANDBY' }
}

/**
 * 정비 출발 안내판 — 공항 출발 전광판처럼 정비 일정을 한눈에 보여 준다.
 * 편명 자리에 엔진, 행선지 자리에 점검 부위가 들어가고, 기한이 지난 엔진은 '지연', 승인된 정비는 '정비 예정'으로 표시한다.
 */
export function FlightBoard({ rows = 8 }: { rows?: number }) {
  const fleet = useFleet()
  const plan = usePlan()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const list = useMemo(() => {
    const all = fleet.map((e) => classify(e, plan.get(e.unit))).filter((r): r is Row => r !== null)
    const pick = (kind: Row['kind'], n: number) => all.filter((r) => r.kind === kind).sort((a, b) => a.when.localeCompare(b.when) || a.e.unit - b.e.unit).slice(0, n)
    // 지연·결재 대기·정비 예정이 골고루 보이도록 종류별로 나눠서 뽑는다
    const late = Math.round(rows * 0.4)
    const wait = Math.round(rows * 0.25)
    const picked = [...pick('late', late), ...pick('wait', wait), ...pick('ok', rows - late - wait), ...pick('review', 1)]
    const seen = new Set<number>()
    return picked
      .filter((r) => (seen.has(r.e.unit) ? false : (seen.add(r.e.unit), true)))
      .sort((a, b) => a.when.localeCompare(b.when) || a.e.unit - b.e.unit)
      .slice(0, rows)
  }, [fleet, plan, rows])

  const d = new Date(now)
  const clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const today = todayStr()

  return (
    <section className="no-print overflow-hidden" style={{ background: '#0b0e13', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.18)' }} aria-label="정비 출발 안내">
      <div className="flex flex-row items-center justify-between gap-3 px-4 py-3" style={{ background: 'linear-gradient(180deg, #161b24, #0f131a)', borderBottom: '2px solid #ffcc33' }}>
        <div className="flex min-w-0 flex-row items-center gap-3">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#ffcc33" stroke="#ffcc33" strokeWidth="1" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
          </svg>
          <div className="min-w-0">
            <div className="truncate text-[16px] font-bold leading-tight text-white">정비 출발 안내</div>
            <div className="mono text-[10.5px] tracking-[0.18em]" style={{ color: '#ffcc33' }}>MAINTENANCE DEPARTURES</div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="mono text-[22px] font-bold leading-none text-white">{clock}</div>
          <div className="mono mt-0.5 text-[10.5px]" style={{ color: '#8b95a7' }}>{md(today)} ({DOW[d.getDay()]})</div>
        </div>
      </div>

      <div className="px-3 py-2 sm:px-4">
        <div className="board-row mono text-[10.5px] tracking-[0.08em]" style={{ color: '#8b95a7' }}>
          <span>시각 TIME</span>
          <span>편명 FLIGHT</span>
          <span className="hidden sm:block">점검 부위 DESTINATION</span>
          <span className="text-right">상태 REMARKS</span>
        </div>
        {list.map((r, i) => {
          const c = TONE[r.kind]
          return (
            <Link key={r.e.unit} to={`/equipment/engine-${r.e.unit}`} className="board-row board-link no-underline" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <Flap text={md(r.when)} color="#ffffff" delay={i * 60} />
              <Flap text={`ENG ${String(r.e.unit).padStart(3, '0')}`} color="#ffcc33" delay={i * 60 + 80} />
              <span className="hidden sm:block">
                <Flap text={r.e.topPart ? r.e.topPart.label.replace(/\(.*\)/, '') : '점검 부위 확인'} color="#e8ecf4" delay={i * 60 + 160} />
              </span>
              <span className="flex flex-row items-center justify-end gap-2 text-right">
                <span className="hidden mono text-[10px] tracking-[0.1em] md:inline" style={{ color: c, opacity: 0.8 }}>{r.en}</span>
                <span className={r.kind === 'late' ? 'board-blink' : ''}>
                  <Flap text={r.ko} color={c} delay={i * 60 + 240} />
                </span>
              </span>
            </Link>
          )
        })}
        {!list.length && <p className="m-0 py-6 text-center text-[13px]" style={{ color: '#8b95a7' }}>안내할 정비가 없습니다</p>}
      </div>
    </section>
  )
}

/**
 * 처음 열었을 때의 운영 이력 — "이미 쓰고 있는 중간 시점"처럼 보이도록, 가장 급한 엔진부터 일부는 검토 중·결재 대기·반려·정비 예정·정비 완료로
 * 처리된 상태를 만든다. 날짜와 시각은 지금(now)·오늘(today) 기준 상대값이라 언제 열어도 "방금 전까지 쓰던 화면"이 된다.
 * 정비 일정은 정비 일정 규칙(다음 주부터·평일·하루 수용 능력)과 엔진의 가동 한계를 지켜서 배정한다.
 * 순수 함수라 같은 입력이면 같은 결과다(무작위 없음).
 */
import type { PlanEvent, PlanItem } from './plan'
import { addDays, earliest, isWorkday, parseDate, problem, type Booked, type Rules } from './schedule.ts'

/** 이력을 만드는 데 필요한 엔진 정보 (정비 요청 기한이 급한 순으로 정렬돼 있어야 한다) */
export interface SeedEngine {
  unit: number
  urgency: 'now' | 'week' | 'month' | 'watch'
  daysLeft: number
}

export interface SeedOptions {
  /** 지금 시각 (밀리초) */
  now: number
  /** 오늘 (YYYY-MM-DD) */
  today: string
  prepDays: number
  slotsPerDay: number
}

const H = 3600e3
const PLANNER = { by: '김정비', role: 'planner' } as const
const MANAGER = { by: '박운영', role: 'manager' } as const

const SUBMIT_NOTES = [
  'AI 권고대로 정비가 필요하다고 판단',
  '센서 변화가 뚜렷해 조기 점검 필요',
  '운항 일정을 조정해 정비 가능',
  '고압압축기 점검을 포함해 일정 확정 요청',
  '부품 수급을 확인했고 이번 정비 슬롯에 배정 요청',
]
const APPROVE_NOTES = ['승인합니다', '일정대로 진행하세요', '부품 입고 확인 후 진행하세요', '']
const REJECT_NOTES = ['운항 일정 확정 전이라 일정 조정 후 다시 올릴 것', '부품 입고 일정을 확인한 뒤 다시 올릴 것', '센서 추이를 며칠 더 보고 판단할 것']

/** 상태별로 가장 급한 엔진부터 몇 대씩 처리된 상태로 둘지 */
const SPEC = {
  now: { done: 3, submitted: 2, review: 9, rejected: 2 },
  week: { done: 2, submitted: 6, review: 5, rejected: 1 },
  month: { done: 1, submitted: 2, review: 4, rejected: 0 },
} as const
const SCHEDULED = 12

type Touch = 'review' | 'submitted' | 'rejected' | 'done'

const diffDays = (from: string, to: string) => Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000)

/** 번갈아 섞어서 한 줄로 — 같은 상태가 한꺼번에 몰리지 않게 한다 */
function interleave(counts: Record<Touch, number>): Touch[] {
  const left = { ...counts }
  const order: Touch[] = ['review', 'submitted', 'done', 'review', 'rejected']
  const out: Touch[] = []
  while (left.review + left.submitted + left.rejected + left.done > 0) {
    for (const k of order) {
      if (left[k] > 0) {
        left[k]--
        out.push(k)
      }
    }
  }
  return out
}

/** 희망 정비일: 가장 이른 가능한 날로부터 shift일 뒤를 우선하되, 엔진의 가동 한계를 넘으면 더 이른 날로 당긴다. 어디도 한계 안에 못 잡으면 가장 이른 날 */
function hopeDay(e: SeedEngine, rules: Rules, shift: number): string {
  const first = earliest(rules)
  let best = first
  for (let s = shift; s >= 0; s--) {
    let d = addDays(first, s)
    while (!isWorkday(d)) d = addDays(d, 1)
    if (diffDays(rules.today, d) <= e.daysLeft) {
      best = d
      break
    }
  }
  return best
}

/** 오늘로부터 거슬러 올라가 n번째 평일 */
function pastWorkday(today: string, n: number): string {
  let d = today
  let left = n
  while (left > 0) {
    d = addDays(d, -1)
    if (isWorkday(d)) left--
  }
  return d
}

export function buildSeed(fleet: SeedEngine[], opts: SeedOptions): Record<number, PlanItem> {
  const { now, today } = opts
  const rules: Rules = { today, prepDays: opts.prepDays, slotsPerDay: opts.slotsPerDay }
  const items: Record<number, PlanItem> = {}
  const booked: Booked = {}
  const taken = new Set<number>()

  const at = (hoursAgo: number) => now - Math.round(hoursAgo * H)
  const event = (hoursAgo: number, who: { by: string; role: 'planner' | 'manager' }, action: PlanEvent['action'], extra: { note?: string; date?: string } = {}): PlanEvent => ({
    at: at(hoursAgo),
    ...who,
    action,
    ...(extra.note ? { note: extra.note } : {}),
    ...(extra.date ? { date: extra.date } : {}),
  })
  const make = (status: PlanItem['status'], history: PlanEvent[], date?: string): PlanItem => ({ status, ...(date ? { date } : {}), updated: history.at(-1)?.at ?? now, history })

  // 1) 정비 예정(승인) — 가동 한계 안에서 정비할 수 있는 엔진부터, 하루 최대 3대씩 평일에 배정
  const pool = fleet.filter((e) => e.urgency === 'week' || e.urgency === 'month')
  const perDay = Math.min(3, opts.slotsPerDay)
  let k = 0
  let d = earliest(rules)
  for (let guard = 0; guard < 90 && k < SCHEDULED; guard++, d = addDays(d, 1)) {
    if (problem(d, rules, booked) !== null) continue
    for (let i = 0; i < perDay && k < SCHEDULED; i++) {
      const off = diffDays(today, d)
      const e = pool.find((x) => !taken.has(x.unit) && x.daysLeft >= off)
      if (!e) break
      taken.add(e.unit)
      booked[e.unit] = { status: 'scheduled', date: d }
      items[e.unit] = make(
        'scheduled',
        [
          event(70 + k * 6, PLANNER, 'review'),
          event(50 + k * 5, PLANNER, 'submit', { note: SUBMIT_NOTES[k % SUBMIT_NOTES.length], date: d }),
          event(6 + k * 3, MANAGER, 'approve', { note: APPROVE_NOTES[k % APPROVE_NOTES.length], date: d }),
        ],
        d,
      )
      k++
    }
  }

  // 2) 긴급도 그룹별로 검토 중·결재 대기·반려·정비 완료 (가장 급한 엔진부터, 5대에 한 대는 손대지 않은 채로 둔다)
  let reviewN = 0
  let submitN = 0
  let rejectN = 0
  let doneN = 0
  for (const group of ['now', 'week', 'month'] as const) {
    const engines = fleet.filter((e) => e.urgency === group && !taken.has(e.unit))
    const plan = interleave({ ...SPEC[group] })
    let idx = 0
    for (const touch of plan) {
      while (idx < engines.length && idx % 5 === 4) idx++
      const e = engines[idx++]
      if (!e) break
      if (touch === 'review') {
        const n = reviewN++
        items[e.unit] = make('review', [event(4 + ((n * 9) % 60), PLANNER, 'review')])
      } else if (touch === 'submitted') {
        const n = submitN++
        const day = hopeDay(e, rules, n % 4)
        items[e.unit] = make(
          'submitted',
          [event(34 + n * 5, PLANNER, 'review'), event(3 + ((n * 7) % 26), PLANNER, 'submit', { note: SUBMIT_NOTES[(n + 2) % SUBMIT_NOTES.length], date: day })],
          day,
        )
      } else if (touch === 'rejected') {
        const n = rejectN++
        items[e.unit] = make('rejected', [
          event(120 + n * 8, PLANNER, 'review'),
          event(96 + n * 8, PLANNER, 'submit', { note: SUBMIT_NOTES[(n + 1) % SUBMIT_NOTES.length], date: addDays(earliest(rules), 1) }),
          event(20 + n * 6, MANAGER, 'reject', { note: REJECT_NOTES[n % REJECT_NOTES.length] }),
        ])
      } else {
        const n = doneN++
        const date = pastWorkday(today, 1 + n)
        items[e.unit] = make(
          'done',
          [
            event(24 * 11 + n * 5, PLANNER, 'review'),
            event(24 * 10 + n * 5, PLANNER, 'submit', { note: SUBMIT_NOTES[n % SUBMIT_NOTES.length], date }),
            event(24 * 9 + n * 5, MANAGER, 'approve', { note: APPROVE_NOTES[n % APPROVE_NOTES.length], date }),
            event(20 + n * 24, PLANNER, 'complete'),
          ],
          date,
        )
      }
    }
  }
  return items
}

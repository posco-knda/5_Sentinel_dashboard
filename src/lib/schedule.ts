/**
 * 정비 일정 규칙 — 정비는 주간 계획으로 세운다.
 *  1) 이번 주(와 지난 날짜)에는 새로 잡을 수 없다 → 다음 주 월요일부터
 *  2) 정비 준비 기간(부품·인력)이 지난 뒤여야 한다 → 오늘 + 준비일 이후
 *  3) 정비는 평일(월~금)에만 한다
 *  4) 하루에 정비할 수 있는 엔진 수에 상한이 있어서, 이미 정비 예정이 가득 찬 날은 예약할 수 없다
 * 날짜는 모두 'YYYY-MM-DD' 문자열(로컬 날짜)이다. 화면과 결재 처리가 같은 규칙을 쓰도록 순수 함수로만 둔다.
 */

export interface Rules {
  /** 오늘 (YYYY-MM-DD) */
  today: string
  /** 정비 요청부터 부품·인력이 준비되기까지 걸리는 일수 */
  prepDays: number
  /** 하루에 정비할 수 있는 엔진 수 */
  slotsPerDay: number
}

/** 일정을 가진 처리 기록 (상태와 날짜만 본다) */
export type Booked = Record<number, { status: string; date?: string }>

const p2 = (n: number) => String(n).padStart(2, '0')
const DOW = ['일', '월', '화', '수', '목', '금', '토']
const DATE = /^\d{4}-\d{2}-\d{2}$/

export const fmt = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
export const parseDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
export const addDays = (s: string, n: number) => {
  const d = parseDate(s)
  d.setDate(d.getDate() + n)
  return fmt(d)
}
export const isWorkday = (s: string) => {
  const w = parseDate(s).getDay()
  return w !== 0 && w !== 6
}
/** 10/19(월) 형태 */
export const label = (s: string) => `${Number(s.slice(5, 7))}/${Number(s.slice(8, 10))}(${DOW[parseDate(s).getDay()]})`

/** 다음 주 월요일 (주는 월~일) */
export function nextMonday(today: string): string {
  const w = parseDate(today).getDay() // 0 = 일요일
  return addDays(today, w === 0 ? 1 : 8 - w)
}

/** 새 정비를 잡을 수 있는 가장 이른 날: 다음 주 월요일과 (오늘 + 준비일) 중 늦은 날, 평일로 맞춤 */
export function earliest(r: Rules): string {
  const a = nextMonday(r.today)
  const b = addDays(r.today, r.prepDays)
  let e = a > b ? a : b
  while (!isWorkday(e)) e = addDays(e, 1)
  return e
}

/** 그 날 이미 정비 예정(승인)된 엔진 수. exclude는 세지 않을 엔진(자기 자신) */
export function used(items: Booked, date: string, exclude?: number): number {
  let n = 0
  for (const [k, v] of Object.entries(items)) if (v.status === 'scheduled' && v.date === date && Number(k) !== exclude) n++
  return n
}

/** 날짜 자체의 규칙(이번 주·준비 기간·주말)만 본 불가 사유. 가능하면 null */
export function closedReason(d: string, r: Rules): string | null {
  if (!DATE.test(d)) return '정비 일정을 입력해 주세요'
  if (d < r.today) return '지난 날짜에는 정비를 잡을 수 없습니다'
  const nm = nextMonday(r.today)
  if (d < nm) return `이번 주에는 정비를 새로 잡을 수 없습니다. 주간 계획이라 ${label(nm)}부터 가능합니다`
  if (d < earliest(r)) return `정비 준비 기간(${r.prepDays}일) 때문에 ${label(earliest(r))} 이후부터 가능합니다`
  if (!isWorkday(d)) return '주말에는 정비를 잡을 수 없습니다 (월~금)'
  return null
}

/** 예약할 수 없는 이유 (날짜 규칙 + 하루 정비 수용 능력). 가능하면 null */
export function problem(d: string, r: Rules, items: Booked, exclude?: number): string | null {
  const c = closedReason(d, r)
  if (c) return c
  const n = used(items, d, exclude)
  if (n >= r.slotsPerDay) return `${label(d)}은(는) 이미 정비 예정 ${n}/${r.slotsPerDay}대로 가득 찼습니다`
  return null
}

/** from 이후로 예약할 수 있는 날을 count개 찾는다 (남은 자리와 함께) */
export function availableDays(from: string, count: number, r: Rules, items: Booked, exclude?: number, horizon = 90): { date: string; left: number }[] {
  const start = from > earliest(r) ? from : earliest(r)
  const out: { date: string; left: number }[] = []
  for (let i = 0; i < horizon && out.length < count; i++) {
    const d = addDays(start, i)
    if (problem(d, r, items, exclude) === null) out.push({ date: d, left: r.slotsPerDay - used(items, d, exclude) })
  }
  return out
}

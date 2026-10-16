import { uncertainty } from '../../data/uncertainty'
import { loadCurves } from '../curves'
import { buildFacts } from '../diagnosis'
import { LEVEL, PART_LABEL, URGENCY, alertRuns, deadlineText, daysText, limitDate, requestDate, type FleetEngine, type Level, type Urgency } from '../fleet'
import { STATUS_LABEL, type PlanItem, type PlanStatus } from '../plan'
import { availableDays, closedReason, earliest, label, addDays, used, type Booked, type Rules } from '../schedule'
import { WARN_N, type Settings } from '../settings'
import { loadFlow } from '../useEngine'

/** 서버(api/chat.ts)의 TOOL_DECLARATIONS와 이름이 같아야 한다 (scripts/api-test.mjs가 확인한다) */
export const TOOL_NAMES = ['list_engines', 'get_engine', 'summarize_fleet', 'get_schedule', 'suggest_dates', 'get_basis'] as const
export type ToolName = (typeof TOOL_NAMES)[number]

/** 도구가 읽는 현재 상태 */
export interface ToolEnv {
  fleet: FleetEngine[]
  items: Record<number, PlanItem>
  settings: Settings
  today: string
}

type Args = Record<string, unknown>
export type ToolResult = Record<string, unknown>

const URGENCIES: Urgency[] = ['now', 'week', 'month', 'watch']
const STATUSES = Object.keys(STATUS_LABEL) as PlanStatus[]
const LEVELS = Object.keys(LEVEL) as Level[]
const MODULES = Object.keys(PART_LABEL)

const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined)
const int = (v: unknown, lo: number, hi: number, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, Math.round(n))) : fallback
}
const r1 = (n: number) => Math.round(n * 10) / 10
const statusOf = (env: ToolEnv, unit: number): PlanStatus => env.items[unit]?.status ?? 'new'
const rules = (env: ToolEnv): Rules => ({ today: env.today, prepDays: env.settings.prepDays, slotsPerDay: env.settings.slotsPerDay })
const booked = (env: ToolEnv): Booked => Object.fromEntries(Object.entries(env.items).map(([u, v]) => [u, { status: v.status, date: v.date }]))

const row = (e: FleetEngine, env: ToolEnv) => ({
  name: e.name,
  unit: e.unit,
  remainingCycles: r1(e.pred),
  remainingDays: Math.round(e.daysLeft),
  requestDeadline: deadlineText(e.requestIn),
  urgency: URGENCY[e.urgency].label,
  level: LEVEL[e.level].label,
  module: e.topPart ? e.topPart.label : '뚜렷한 변화 없음',
  status: STATUS_LABEL[statusOf(env, e.unit)],
  scheduledDate: env.items[e.unit]?.date ?? null,
})

function listEngines(a: Args, env: ToolEnv): ToolResult {
  const urgency = pick(a.urgency, URGENCIES)
  const status = pick(a.status, STATUSES)
  const level = pick(a.level, LEVELS)
  const module = pick(a.module, MODULES)
  const within = a.requestWithinDays == null ? undefined : int(a.requestWithinDays, 0, 365, 0)
  const sort = pick(a.sort, ['deadline', 'life', 'unit'] as const) ?? 'deadline'
  const limit = int(a.limit, 1, 20, 8)
  let list = env.fleet.filter((e) => {
    const st = statusOf(env, e.unit)
    if (status ? st !== status : st === 'done') return false
    return (!urgency || e.urgency === urgency) && (!level || e.level === level) && (!module || e.topPart?.id === module) && (within === undefined || e.requestIn <= within)
  })
  if (sort === 'life') list = [...list].sort((a, b) => a.pred - b.pred || a.unit - b.unit)
  else if (sort === 'unit') list = [...list].sort((a, b) => a.unit - b.unit)
  return { total: list.length, shown: Math.min(limit, list.length), items: list.slice(0, limit).map((e) => row(e, env)) }
}

async function getEngine(a: Args, env: ToolEnv): Promise<ToolResult> {
  const unit = int(a.unit, 0, 99999, 0)
  const e = env.fleet.find((x) => x.unit === unit)
  if (!e) return { error: `Engine #${a.unit ?? '?'}은(는) 이 플릿에 없습니다 (엔진 번호는 1~${Math.max(...env.fleet.map((x) => x.unit))})` }
  const [flowAll, curves] = await Promise.all([loadFlow(), loadCurves()])
  const flow = flowAll[unit] ?? null
  const curve = curves[unit]
  const runs = curve ? alertRuns(curve, env.settings.dangerN) : null
  const iv = uncertainty[unit]?.iv ?? null
  const f = buildFacts({ engine: e, settings: env.settings, flow, runs, interval: iv })
  const it = env.items[unit]
  return {
    ...row(e, env),
    interval90Cycles: iv ? [r1(iv[0]), r1(iv[1])] : null,
    requestDeadlineDate: e.requestIn <= 0 ? '기한 지남' : requestDate(e.requestIn),
    operatingLimitDate: limitDate(e.daysLeft),
    remainingDaysText: daysText(e.daysLeft),
    topModules: [...f.parts].sort((x, y) => y.score - x.score).slice(0, 3).map((p) => ({ module: p.label, sensorChange: `×${r1(p.score)}` })),
    topSensors: f.topSensors.slice(0, 3).map((s) => ({ sensor: s.name, direction: s.z >= 0 ? '상승' : '하락', change: `×${r1(Math.abs(s.z))}` })),
    dangerSinceCyclesAgo: f.dangerAgo,
    warnSinceCyclesAgo: f.warnAgo,
    note: '점검 예상 모듈은 센서 변화로 짐작한 추정이며, 남은 수명은 예측값입니다.',
    ...(it?.date ? { scheduledDate: it.date } : {}),
  }
}

function summarize(a: Args, env: ToolEnv): ToolResult {
  const by = pick(a.groupBy, ['urgency', 'level', 'status', 'module'] as const)
  if (!by) return { error: 'groupBy는 urgency, level, status, module 중 하나여야 합니다' }
  const active = env.fleet.filter((e) => statusOf(env, e.unit) !== 'done')
  const counts = new Map<string, number>()
  const add = (k: string) => counts.set(k, (counts.get(k) ?? 0) + 1)
  if (by === 'urgency') for (const e of active) add(URGENCY[e.urgency].label)
  else if (by === 'level') for (const e of active) add(LEVEL[e.level].label)
  else if (by === 'status') {
    // 손댈 필요가 없는 '정상' 엔진은 미확인으로 세지 않는다
    for (const e of env.fleet) {
      const st = statusOf(env, e.unit)
      if (st === 'new' && e.urgency === 'watch') continue
      add(STATUS_LABEL[st])
    }
  } else for (const e of active) if (e.level !== 'ok' && e.topPart) add(e.topPart.label)
  const groups = [...counts].map(([name, count]) => ({ name, count })).sort((x, y) => y.count - x.count)
  return { groupBy: by, total: groups.reduce((n, g) => n + g.count, 0), groups, ...(by === 'module' ? { note: '위험·주의 엔진의 점검 예상 모듈(추정)' } : {}) }
}

function getSchedule(a: Args, env: ToolEnv): ToolResult {
  const from = typeof a.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.from) ? a.from : env.today
  const days = int(a.days, 1, 31, 14)
  const r = rules(env)
  const b = booked(env)
  const bookable: { date: string; scheduled: number; slotsLeft: number; full: boolean; engines?: string[] }[] = []
  // 정비를 잡을 수 없는 날은 같은 이유가 이어지는 구간으로 묶어서 알린다 (목록이 길어지지 않게)
  const closed: { from: string; to: string; reason: string }[] = []
  for (let i = 0; i < days; i++) {
    const d = addDays(from, i)
    const reason = closedReason(d, r)
    if (reason) {
      const last = closed[closed.length - 1]
      if (last && last.reason === reason && last.to === label(addDays(d, -1))) last.to = label(d)
      else closed.push({ from: label(d), to: label(d), reason })
      continue
    }
    const n = used(b, d)
    const engines = Object.entries(env.items)
      .filter(([, v]) => v.status === 'scheduled' && v.date === d)
      .slice(0, 5)
      .map(([u]) => `Engine #${u}`)
    bookable.push({ date: label(d), scheduled: n, slotsLeft: Math.max(0, r.slotsPerDay - n), full: n >= r.slotsPerDay, ...(n ? { engines } : {}) })
  }
  return {
    earliestBookable: label(earliest(r)),
    slotsPerDay: r.slotsPerDay,
    prepDays: r.prepDays,
    bookableDays: bookable,
    fullDays: bookable.filter((d) => d.full).map((d) => d.date),
    unavailable: closed.map((c) => ({ range: c.from === c.to ? c.from : `${c.from}~${c.to}`, reason: c.reason })),
  }
}

function suggestDates(a: Args, env: ToolEnv): ToolResult {
  const unit = int(a.unit, 0, 99999, 0)
  const e = env.fleet.find((x) => x.unit === unit)
  if (!e) return { error: `Engine #${a.unit ?? '?'}은(는) 이 플릿에 없습니다` }
  const count = int(a.count, 1, 5, 3)
  const r = rules(env)
  const limit = limitDate(e.daysLeft)
  const dates = availableDays(earliest(r), count, r, booked(env), unit).map((d) => ({ date: label(d.date), slotsLeft: d.left, beforeOperatingLimit: d.date <= limit }))
  return {
    name: e.name,
    operatingLimitDate: label(limit),
    earliestBookable: label(earliest(r)),
    dates,
    warning: dates.length && !dates.some((d) => d.beforeOperatingLimit) ? '추천 날짜가 모두 가동 한계일 뒤입니다. 일정 조정이나 점검 방법을 따로 논의해야 합니다.' : null,
  }
}

function basis(env: ToolEnv): ToolResult {
  const s = env.settings
  return { today: env.today, flightsPerDay: s.cyclesPerDay, prepDays: s.prepDays, slotsPerDay: s.slotsPerDay, dangerThresholdCycles: s.dangerN, warnThresholdCycles: WARN_N, note: '정비는 다음 주 월요일 이후 평일에만 잡을 수 있고, 하루 정비 가능 대수까지만 예약됩니다.' }
}

/** 도구 이름과 입력으로 현재 상태를 조회한다. 입력은 범위를 보정하고, 알 수 없는 도구는 error로 돌려준다 */
export async function runTool(name: string, args: Args, env: ToolEnv): Promise<ToolResult> {
  try {
    switch (name) {
      case 'list_engines':
        return listEngines(args, env)
      case 'get_engine':
        return await getEngine(args, env)
      case 'summarize_fleet':
        return summarize(args, env)
      case 'get_schedule':
        return getSchedule(args, env)
      case 'suggest_dates':
        return suggestDates(args, env)
      case 'get_basis':
        return basis(env)
      default:
        return { error: `알 수 없는 도구: ${name}` }
    }
  } catch {
    return { error: '조회 중 오류가 났습니다' }
  }
}

/** 근거 보기에 보여 줄 한 줄 설명 */
export function describeCall(name: string, args: Args, result: ToolResult): { label: string; detail: string } {
  const n = typeof result.total === 'number' ? `${result.total}건` : ''
  switch (name) {
    case 'list_engines': {
      const f = ['urgency', 'status', 'level', 'module', 'requestWithinDays'].filter((k) => args[k] != null).map((k) => `${k}=${String(args[k])}`)
      return { label: '엔진 목록 조회', detail: `${f.join(', ') || '조건 없음'}${n ? ` → ${n}` : ''}` }
    }
    case 'get_engine':
      return { label: `Engine #${String(args.unit)} 상세 조회`, detail: result.error ? String(result.error) : '남은 수명·구간·점검 모듈·센서 변화' }
    case 'summarize_fleet':
      return { label: '엔진 집계', detail: `기준: ${String(args.groupBy)}${n ? ` → ${n}` : ''}` }
    case 'get_schedule':
      return { label: '정비 일정 조회', detail: `${typeof args.from === 'string' ? args.from : '오늘'}부터 ${String(args.days ?? 14)}일` }
    case 'suggest_dates':
      return { label: `Engine #${String(args.unit)} 추천 날짜`, detail: result.error ? String(result.error) : '규칙에 맞고 자리가 남은 가장 이른 날' }
    default:
      return { label: '계산 기준 조회', detail: '설정값' }
  }
}

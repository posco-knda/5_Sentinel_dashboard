import assert from 'node:assert/strict'
// 처음 열었을 때의 운영 이력(src/lib/seed.ts)을 검증한다. 실행: npm run test:logic
import { buildSeed } from '../src/lib/seed.ts'
import { addDays, closedReason, used } from '../src/lib/schedule.ts'

let passed = 0
const t = (name, fn) => {
  fn()
  passed++
  console.log('  ok  ', name)
}

// 정비 요청 기한이 급한 순으로 나열한 가짜 플릿: 즉시 28 · 이번 주 41 · 이번 달 103 · 정상 76
const mk = (n, urgency, from, daysFrom) => Array.from({ length: n }, (_, i) => ({ unit: from + i, urgency, daysLeft: daysFrom + i * 0.2 }))
const fleet = [...mk(28, 'now', 1, 2), ...mk(41, 'week', 100, 8), ...mk(103, 'month', 200, 15), ...mk(76, 'watch', 400, 40)]
const OPTS = { now: Date.parse('2026-10-15T12:00:00+09:00'), today: '2026-10-15', prepDays: 7, slotsPerDay: 4 }
const seed = buildSeed(fleet, OPTS)
const rules = { today: OPTS.today, prepDays: OPTS.prepDays, slotsPerDay: OPTS.slotsPerDay }
const by = (s) => Object.entries(seed).filter(([, v]) => v.status === s)

t('같은 입력이면 같은 결과다 (무작위 없음)', () => assert.deepEqual(buildSeed(fleet, OPTS), seed))
t('여러 상태가 고르게 섞여 있다: 검토 중·결재 대기·반려·정비 예정·완료', () => {
  assert.equal(by('review').length, 18)
  assert.equal(by('submitted').length, 10)
  assert.equal(by('rejected').length, 3)
  assert.equal(by('scheduled').length, 12)
  assert.equal(by('done').length, 6)
})
t('정상 엔진은 건드리지 않는다', () => {
  const normal = new Set(fleet.filter((e) => e.urgency === 'watch').map((e) => e.unit))
  assert.ok(Object.keys(seed).every((u) => !normal.has(Number(u))))
})
t('가장 급한 엔진에도 이력이 있다', () => assert.ok(seed[1] || seed[2]))
t('정비 예정: 정비 일정 규칙을 지키고 하루 수용 능력을 넘지 않는다', () => {
  const booked = Object.fromEntries(Object.entries(seed).map(([u, v]) => [u, { status: v.status, date: v.date }]))
  for (const [, v] of by('scheduled')) {
    assert.equal(closedReason(v.date, rules), null, v.date)
    assert.ok(used(booked, v.date) <= rules.slotsPerDay, `${v.date} 만석 초과`)
  }
})
t('정비 예정: 엔진의 가동 한계(남은 수명) 안에 잡혀 있다', () => {
  for (const [u, v] of by('scheduled')) {
    const e = fleet.find((x) => x.unit === Number(u))
    assert.ok(e.daysLeft >= Math.round((Date.parse(v.date) - Date.parse(OPTS.today)) / 86400000), `${u}번 한계 초과`)
  }
})
t('결재 대기 희망일도 규칙에 맞고, 여유가 있는 엔진은 가동 한계 안이다', () => {
  for (const [u, v] of by('submitted')) {
    assert.equal(closedReason(v.date, rules), null, v.date)
    const e = fleet.find((x) => x.unit === Number(u))
    const off = Math.round((Date.parse(v.date) - Date.parse(OPTS.today)) / 86400000)
    if (e.urgency !== 'now') assert.ok(e.daysLeft >= off, `${u}번 희망일이 가동 한계 밖`)
  }
})
t('기한이 이미 지난 엔진은 결재 대기를 적게 두고 대부분 검토 중이다', () => {
  const nowUnits = new Set(fleet.filter((e) => e.urgency === 'now').map((e) => e.unit))
  const sub = by('submitted').filter(([u]) => nowUnits.has(Number(u))).length
  const rev = by('review').filter(([u]) => nowUnits.has(Number(u))).length
  assert.ok(sub <= 2 && rev >= 7, `결재 대기 ${sub}, 검토 중 ${rev}`)
})
t('이력은 시간 순서이고, 마지막 처리가 상태와 맞는다', () => {
  const last = { review: 'review', submitted: 'submit', rejected: 'reject', scheduled: 'approve', done: 'complete' }
  for (const [u, v] of Object.entries(seed)) {
    for (let i = 1; i < v.history.length; i++) assert.ok(v.history[i].at >= v.history[i - 1].at, `${u}번 시간 순서`)
    assert.equal(v.history.at(-1).action, last[v.status], `${u}번 상태와 마지막 처리`)
    assert.ok(v.history.every((h) => h.at <= OPTS.now), `${u}번 미래 시각`)
    assert.equal(v.updated, v.history.at(-1).at)
  }
})
t('승인·반려는 운영 책임자, 요청·검토·완료는 정비 담당자가 한 것으로 남는다', () => {
  for (const v of Object.values(seed))
    for (const h of v.history) assert.equal(h.role, ['approve', 'reject'].includes(h.action) ? 'manager' : 'planner')
})
t('반려에는 사유가, 요청에는 사유와 희망일이 있다', () => {
  for (const v of Object.values(seed))
    for (const h of v.history) {
      if (h.action === 'reject') assert.ok(h.note)
      if (h.action === 'submit') assert.ok(h.note && h.date)
    }
})
t('최근 7일 안에 결재 요청·승인·반려가 실제로 있어 주간 리포트가 비지 않는다', () => {
  const since = OPTS.now - 7 * 86400000
  const recent = Object.values(seed).flatMap((v) => v.history).filter((h) => h.at >= since)
  for (const a of ['submit', 'approve', 'reject', 'complete']) assert.ok(recent.some((h) => h.action === a), a)
})
t('하루 수용 능력이 작아도(1대) 규칙을 지킨다', () => {
  const small = { ...OPTS, slotsPerDay: 1 }
  const s = buildSeed(fleet, small)
  const booked = Object.fromEntries(Object.entries(s).map(([u, v]) => [u, { status: v.status, date: v.date }]))
  for (const [, v] of Object.entries(s).filter(([, x]) => x.status === 'scheduled')) assert.ok(used(booked, v.date) <= 1)
})
t('날짜 헬퍼: 완료 건의 정비일은 모두 지난 평일', () => {
  for (const [, v] of by('done')) assert.ok(v.date < OPTS.today && ![0, 6].includes(new Date(v.date + 'T00:00:00').getDay()), v.date)
  assert.equal(addDays('2026-10-15', 1), '2026-10-16')
})

console.log(`\n${passed}개 통과`)

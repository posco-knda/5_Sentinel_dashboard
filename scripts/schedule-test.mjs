import assert from 'node:assert/strict'
// 정비 일정 규칙(src/lib/schedule.ts)을 검증한다. 실행: npm run test:logic  (Node 22.18+ 또는 24 — .ts를 직접 불러옴)
import { addDays, availableDays, closedReason, earliest, isWorkday, label, nextMonday, problem, used } from '../src/lib/schedule.ts'

let passed = 0
const t = (name, fn) => {
  fn()
  passed++
  console.log('  ok  ', name)
}

// 2026-10-15 는 목요일
const R = { today: '2026-10-15', prepDays: 7, slotsPerDay: 2 }
const R0 = { ...R, prepDays: 0 }

t('요일 판별: 2026-10-15는 목요일, 17·18일은 주말', () => {
  assert.equal(label('2026-10-15'), '10/15(목)')
  assert.equal(isWorkday('2026-10-16'), true)
  assert.equal(isWorkday('2026-10-17'), false)
  assert.equal(isWorkday('2026-10-18'), false)
})
t('다음 주 월요일: 목요일·월요일·토요일·일요일 기준', () => {
  assert.equal(nextMonday('2026-10-15'), '2026-10-19')
  assert.equal(nextMonday('2026-10-12'), '2026-10-19') // 월요일이면 7일 뒤
  assert.equal(nextMonday('2026-10-17'), '2026-10-19') // 토요일
  assert.equal(nextMonday('2026-10-18'), '2026-10-19') // 일요일 (그 주는 월~일)
})
t('가장 이른 정비일: 준비 0일이면 다음 주 월요일, 준비 7일이면 오늘+7일(목) ', () => {
  assert.equal(earliest(R0), '2026-10-19')
  assert.equal(earliest(R), '2026-10-22')
  // 준비 기간이 끝나는 날이 주말이면 월요일로
  assert.equal(earliest({ ...R, prepDays: 9 }), '2026-10-26')
})
t('이번 주와 지난 날짜는 불가', () => {
  assert.match(closedReason('2026-10-16', R0), /이번 주에는/)
  assert.match(closedReason('2026-10-14', R0), /지난 날짜/)
  assert.equal(closedReason('2026-10-19', R0), null)
})
t('정비 준비 기간 안의 날짜는 불가 (다음 주여도)', () => {
  assert.match(closedReason('2026-10-20', R), /정비 준비 기간\(7일\)/)
  assert.equal(closedReason('2026-10-22', R), null)
})
t('주말은 불가', () => {
  assert.match(closedReason('2026-10-24', R), /주말/)
  assert.match(closedReason('2026-10-25', R), /주말/)
})
t('형식이 틀린 날짜는 불가', () => {
  assert.match(closedReason('', R), /입력/)
  assert.match(closedReason('10/22', R), /입력/)
})

const booked = {
  1: { status: 'scheduled', date: '2026-10-22' },
  2: { status: 'scheduled', date: '2026-10-22' },
  3: { status: 'submitted', date: '2026-10-23' }, // 결재 대기는 자리를 차지하지 않음
  4: { status: 'done', date: '2026-10-22' }, // 끝난 정비는 세지 않음
}
t('이미 정비 예정이 가득 찬 날은 예약 불가 (결재 대기·완료는 세지 않음)', () => {
  assert.equal(used(booked, '2026-10-22'), 2)
  assert.match(problem('2026-10-22', R, booked), /가득 찼습니다/)
  assert.equal(problem('2026-10-23', R, booked), null)
})
t('자기 자신이 이미 잡은 날은 자리에서 제외하고 계산', () => {
  assert.equal(problem('2026-10-22', R, booked, 1), null)
})
t('가능한 날짜 찾기: 가득 찬 날과 주말을 건너뛴다', () => {
  const days = availableDays('2026-10-01', 3, R, booked)
  assert.deepEqual(days.map((d) => d.date), ['2026-10-23', '2026-10-26', '2026-10-27'])
  assert.equal(days[0].left, 2)
})
t('하루 수용 능력 1대이면 한 대만 받는다', () => {
  const one = { ...R, slotsPerDay: 1 }
  assert.match(problem('2026-10-22', one, { 9: { status: 'scheduled', date: '2026-10-22' } }), /1\/1대/)
})
t('날짜 계산: 월말·연말을 넘어도 맞다', () => {
  assert.equal(addDays('2026-10-30', 3), '2026-11-02')
  assert.equal(addDays('2026-12-30', 3), '2027-01-02')
})

console.log(`\n${passed}개 통과`)

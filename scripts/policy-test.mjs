import assert from 'node:assert/strict'
// 정비 방식 비교(src/lib/policy.ts)의 계산을 검증한다. 실행: npm run test:logic
import { buildLives, periodic, predictive, reactive, runPeriodic, runPredictive, runReactive, sweep, best } from '../src/lib/policy.ts'
import { detectionCurves } from '../src/data/detectionCurves.ts'

let passed = 0
const t = (name, fn) => {
  fn()
  passed++
  console.log('  ok  ', name)
}
const B = { planned: 35, ratio: 1.4, lossPerDay: 1.4, downDays: 2.5, extra: 1.4, lifeCycles: 250 }
const U = B.planned * B.ratio + B.downDays * B.lossPerDay + B.extra // 비계획 1건
const life = (fail, curve, pred = 20, last = curve.length) => ({ unit: 1, last, pred, fail, curve })

t('사후 정비는 모든 엔진이 고장 나고 비용은 비계획 비용 × 대수', () => {
  const lives = [life(100, [80, 60]), life(150, [90, 80])]
  const s = runReactive(lives, B)
  assert.equal(s.failures, 2)
  assert.ok(Math.abs(s.cost - 2 * U) < 1e-9)
})
t('정기 정비: 주기보다 오래 사는 엔진은 계획 정비, 짧게 사는 엔진은 고장', () => {
  assert.equal(periodic(life(100, []), 150, B).failed, true)
  const o = periodic(life(300, []), 150, B)
  assert.equal(o.failed, false)
  assert.equal(o.wasted, 150)
  assert.ok(Math.abs(o.cost - (B.planned + (150 / B.lifeCycles) * B.planned)) < 1e-9)
})
t('예측 정비: 예측이 트리거 아래로 내려간 사이클에 요청하고 준비 기간 뒤에 정비한다', () => {
  // 사이클 3에서 예측 40 <= 21+20 → 요청, 21사이클 뒤인 24에 정비, 고장은 60
  const o = predictive(life(60, [100, 80, 40, 30, 20]), 21, 20, B)
  assert.equal(o.failed, false)
  assert.equal(o.at, 3 + 21)
  assert.equal(o.wasted, 60 - 24)
})
t('예측 정비: 준비 기간이 끝나기 전에 고장 나면 고장으로 센다', () => {
  assert.equal(predictive(life(15, [100, 80, 40]), 21, 20, B).failed, true)
})
t('예측 정비: 관측 구간에서 한 번도 트리거에 닿지 않으면 마지막 예측으로 이어 간다', () => {
  const o = predictive(life(200, [120, 118, 116], 100, 3), 21, 20, B)
  assert.equal(o.at, 3 + (100 - 41) + 21)
})
t('안전 여유를 크게 할수록 일찍 정비하므로 고장은 줄고 버리는 수명은 는다', () => {
  const lives = buildLives(detectionCurves)
  const a = runPredictive(lives, 21, 0, B)
  const c = runPredictive(lives, 21, 60, B)
  assert.ok(c.failures <= a.failures)
  assert.ok(c.avgWasted >= a.avgWasted)
})
t('실제 자료: 예측 정비가 사후 정비와 가장 유리한 정기 정비보다 싸다', () => {
  const lives = buildLives(detectionCurves)
  assert.ok(lives.length > 100)
  const per = best(sweep(Array.from({ length: 65 }, (_, i) => 80 + i * 5), (T) => runPeriodic(lives, T, B)))
  const pre = runPredictive(lives, 21, 20, B)
  assert.ok(pre.cost < per.s.cost, `예측 ${pre.cost} < 정기(최적) ${per.s.cost}`)
  assert.ok(per.s.cost < runReactive(lives, B).cost)
})
t('모든 엔진이 기록된 곡선·실제 수명으로 만들어진다', () => {
  const lives = buildLives(detectionCurves)
  for (const l of lives) assert.ok(l.fail > l.last && l.curve.length === l.last)
  assert.equal(reactive(lives[0], B).failed, true)
})

console.log(`\n${passed}개 통과`)

import { pushNotice } from './notice'
import { usePlan } from './plan'

/**
 * 여러 엔진을 한꺼번에 '검토 시작'으로 바꾼다. 실수로 눌러도 되돌릴 수 있게
 * 실행 전에 한 번 묻고, 실행 뒤에는 10초 동안 '되돌리기' 버튼을 보여 준다.
 */
export function useBulkReview() {
  const plan = usePlan()
  return (units: number[]) => {
    if (units.length === 0) return
    if (!window.confirm(`${units.length}대를 모두 검토 시작으로 바꿀까요?\n각 엔진의 검토 취소 버튼이나 알림의 되돌리기로 돌릴 수 있습니다.`)) return
    const done = units.filter((u) => plan.act(u, 'review').ok)
    if (done.length === 0) return
    pushNotice(`${done.length}대를 검토 시작으로 바꿨습니다`, 'ok', 10000, {
      label: '되돌리기',
      run: () => done.forEach((u) => plan.act(u, 'unreview')),
    })
  }
}

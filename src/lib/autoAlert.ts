import { useEffect } from 'react'
import { useAuth } from './auth'
import { useFleet } from './fleet'
import { announceUrgent } from './notify'
import { usePlan } from './plan'
import { useSettings } from './settings'

// 이미 알린 "즉시 조치" 엔진 번호. 값이 없으면(처음 열었을 때) 지금 상태를 기준선으로만 기록하고 알리지 않는다.
const KEY = 'sentinel-notified-v1'
const SETTLE_MS = 1500

function read(): number[] | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as unknown
    return Array.isArray(v) ? v.filter((n): n is number => Number.isInteger(n)) : null
  } catch {
    return null
  }
}
function write(units: number[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(units))
  } catch {
    /* 저장이 막힌 환경에서는 이 탭이 열려 있는 동안만 중복을 막는다 */
  }
}
export function resetUrgentBaseline() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* 무시 */
  }
}

/**
 * 엔진이 새로 "즉시 조치"가 되면 Slack으로 한 번 알린다.
 * 설정(하루 비행 횟수·민감도·정비 준비 기간)이 바뀌어도, 새 예측이 들어와도 같은 방식으로 감지한다.
 * 같은 브라우저의 다른 탭이 같은 엔진을 또 알리지 않도록, 보내기 전에 기록부터 한다.
 */
export function useUrgentWatcher() {
  const fleet = useFleet()
  const plan = usePlan()
  const { settings } = useSettings()
  const { user } = useAuth()

  useEffect(() => {
    if (!user || !settings.notifyUrgent) return
    const current = fleet.filter((e) => e.urgency === 'now' && plan.items[e.unit]?.status !== 'done')
    // 슬라이더를 끄는 동안 중간 값마다 보내지 않도록, 값이 잠잠해진 뒤에 한 번만 확인한다
    const timer = setTimeout(async () => {
      const prev = read()
      const ids = current.map((e) => e.unit)
      if (prev === null) return write(ids)
      const fresh = current.filter((e) => !prev.includes(e.unit))
      if (fresh.length === 0) {
        if (ids.length !== prev.length) write(ids)
        return
      }
      write(ids)
      const sent = await announceUrgent(fresh)
      if (sent === 'failed') write(prev)
    }, SETTLE_MS)
    return () => clearTimeout(timer)
  }, [fleet, plan.items, settings.notifyUrgent, user])
}

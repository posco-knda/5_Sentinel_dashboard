/**
 * 촬영·발표 준비용 주소 인자 — 화면에는 아무 글자도 드러나지 않는다.
 *   ?demo=reset            이 브라우저에 저장된 모든 처리 이력·메신저·할 일·설정을 지워 처음 상태로 되돌린다(로그아웃 포함)
 *   ?as=planner | manager  그 계정으로 바로 로그인한 채 시작한다
 *   ?present=1 | 0         마우스 위치와 클릭을 크게 보여 주는 표시를 켜거나 끈다(영상에서 따라가기 쉽게)
 * 예) /?demo=reset&as=planner&present=1
 */
const PRESENT_KEY = 'sentinel-present'
const SESSION_KEY = 'sentinel-session-v1'

export function applyDemoParams(): void {
  try {
    const url = new URL(window.location.href)
    const q = url.searchParams
    const reset = q.get('demo') === 'reset'
    const as = q.get('as')
    const present = q.get('present')
    if (!reset && !as && !present) return
    if (reset) {
      for (const k of Object.keys(localStorage)) if (k.startsWith('sentinel-')) localStorage.removeItem(k)
      for (const k of Object.keys(sessionStorage)) if (k.startsWith('sentinel-') && k !== PRESENT_KEY) sessionStorage.removeItem(k)
    }
    if (as === 'planner' || as === 'manager') sessionStorage.setItem(SESSION_KEY, as)
    if (present === '1') sessionStorage.setItem(PRESENT_KEY, '1')
    if (present === '0') sessionStorage.removeItem(PRESENT_KEY)
    ;['demo', 'as', 'present'].forEach((k) => q.delete(k))
    window.history.replaceState(null, '', url.pathname + (q.toString() ? `?${q}` : '') + url.hash)
  } catch {
    // 저장소를 쓸 수 없는 환경에서는 그대로 시작한다
  }
}

export const presentOn = (): boolean => {
  try {
    return sessionStorage.getItem(PRESENT_KEY) === '1'
  } catch {
    return false
  }
}

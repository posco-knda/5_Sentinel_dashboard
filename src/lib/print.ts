/** 인쇄는 항상 라이트 색상으로 — 다크 테마에서 눌러도 종이에서 읽히도록 잠깐 바꿨다가 되돌린다 */
export function printLight() {
  const root = document.documentElement
  const prev = root.getAttribute('data-theme')
  root.setAttribute('data-theme', 'light')
  window.addEventListener('afterprint', () => (prev ? root.setAttribute('data-theme', prev) : root.removeAttribute('data-theme')), { once: true })
  window.print()
}

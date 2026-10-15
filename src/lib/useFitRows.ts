import { useEffect, useState, type RefObject } from 'react'

/**
 * 표 상자(스크롤 영역)에 행이 몇 줄 들어가는지 잰다 — 한 쪽이 스크롤 없이 화면 안에 다 보이게 하려는 값.
 * 데스크톱(상자 높이가 화면에 맞춰 고정된 경우)에서만 의미가 있어서, 좁은 화면에서는 null을 돌려준다.
 * 상자 크기뿐 아니라 표 내용이 바뀔 때(행 수·행 높이)와 폰트가 로드된 뒤에도 다시 잰다.
 */
export function useFitRows(ref: RefObject<HTMLElement | null>, fallbackRow = 52, min = 5): number | null {
  const [rows, setRows] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // ResizeObserver는 observe 직후에 한 번 불리므로 처음 측정도 여기서 된다
    const measure = () => {
      if (!window.matchMedia('(min-width: 1024px)').matches) return setRows(null)
      const head = el.querySelector('thead')?.getBoundingClientRect().height ?? 40
      const row = el.querySelector('tbody tr')?.getBoundingClientRect().height || fallbackRow
      setRows(Math.max(min, Math.floor((el.clientHeight - head) / row)))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, fallbackRow, min])

  return rows
}

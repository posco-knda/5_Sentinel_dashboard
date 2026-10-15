import { useEffect, useState, type RefObject } from 'react'

interface FitOptions {
  /** 행을 찾는 선택자 (기본: 표의 본문 행) */
  row?: string
  /** 머리글을 찾는 선택자. 머리글이 없으면 null (기본: 표의 thead) */
  head?: string | null
  /** 이 너비(px) 이상일 때만 맞춘다 — 상자 높이가 화면에 맞춰 고정되는 너비 (기본 1024) */
  minWidth?: number
  fallbackRow?: number
  min?: number
}

/**
 * 목록 상자(스크롤 영역)에 행이 몇 줄 들어가는지 잰다 — 한 쪽이 스크롤 없이 화면 안에 다 보이게 하려는 값.
 * 상자 높이가 고정되지 않는 좁은 화면에서는 null을 돌려준다.
 * 상자 크기뿐 아니라 내용이 바뀔 때(행 수·행 높이)와 폰트가 로드된 뒤에도 다시 잰다.
 */
export function useFitRows(ref: RefObject<HTMLElement | null>, opts: FitOptions = {}): number | null {
  const { row: rowSel = 'tbody tr', head: headSel = 'thead', minWidth = 1024, fallbackRow = 52, min = 5 } = opts
  const [rows, setRows] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // ResizeObserver는 observe 직후에 한 번 불리므로 처음 측정도 여기서 된다
    const measure = () => {
      if (!window.matchMedia(`(min-width: ${minWidth}px)`).matches) return setRows(null)
      const head = headSel ? (el.querySelector(headSel)?.getBoundingClientRect().height ?? 0) : 0
      const row = el.querySelector(rowSel)?.getBoundingClientRect().height || fallbackRow
      setRows(Math.max(min, Math.floor((el.clientHeight - head) / row)))
    }
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    // 내용(로딩 → 목록, 쪽 이동, 행 수 변화)이 바뀌면 다시 잰다
    const mo = new MutationObserver(measure)
    mo.observe(el, { childList: true, subtree: true })
    window.addEventListener('resize', measure)
    void document.fonts?.ready.then(measure)
    return () => {
      ro.disconnect()
      mo.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [ref, rowSel, headSel, minWidth, fallbackRow, min])

  return rows
}

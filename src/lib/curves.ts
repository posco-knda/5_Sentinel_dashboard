import { useEffect, useState } from 'react'

/** 엔진 하나의 예측 남은 수명 곡선 (c = 사이클, p = 예측값) */
export type Curve = { c: number[]; p: number[] }
type Curves = Record<number, Curve>

let cache: Curves | null = null
let pending: Promise<Curves> | null = null

/** 곡선 데이터(약 200KB)는 필요한 화면에서만 처음 한 번 불러온다 */
export function loadCurves(): Promise<Curves> {
  if (cache) return Promise.resolve(cache)
  pending ??= import('../data/detectionCurves').then((m) => (cache = m.detectionCurves))
  return pending
}

export function useCurves(): Curves | null {
  const [curves, setCurves] = useState<Curves | null>(cache)
  useEffect(() => {
    let alive = true
    loadCurves().then((c) => alive && setCurves(c))
    return () => {
      alive = false
    }
  }, [])
  return curves
}

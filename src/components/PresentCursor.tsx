import { useEffect, useRef, useState } from 'react'

/** 영상용 마우스 표시 — 포인터를 따라다니는 큰 원과, 누를 때 퍼지는 물결. ?present=1 로 켠다 */
export function PresentCursor() {
  const dot = useRef<HTMLDivElement>(null)
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])
  useEffect(() => {
    let n = 0
    const move = (e: PointerEvent) => {
      if (dot.current) dot.current.style.transform = `translate(${e.clientX - 18}px, ${e.clientY - 18}px)`
    }
    const down = (e: PointerEvent) => {
      const id = ++n
      setRipples((r) => [...r, { id, x: e.clientX, y: e.clientY }])
      window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 650)
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerdown', down, { passive: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerdown', down)
    }
  }, [])
  return (
    <div className="pointer-events-none fixed inset-0 z-[200]" aria-hidden="true">
      <div ref={dot} className="present-dot" style={{ transform: 'translate(-60px, -60px)' }} />
      {ripples.map((r) => (
        <span key={r.id} className="present-ripple" style={{ left: r.x, top: r.y }} />
      ))}
    </div>
  )
}

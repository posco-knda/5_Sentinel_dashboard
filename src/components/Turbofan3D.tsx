import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'

interface Props {
  /** 모듈별 이탈도(0~1). 클수록 해당 모듈이 붉게 빛난다 (fan·lpc·hpc·core·hpt·lpt) */
  heat?: Record<string, number>
  /** 강조해서 보여줄 모듈 (목록에서 가리킨 것) */
  focus?: string | null
  className?: string
  style?: CSSProperties
  /** 3D 위에 겹쳐 보여줄 안내 (포인터는 통과한다) */
  children?: ReactNode
}

const SRC = '/turbofan_3d.html?view=engine'

/**
 * 3D 엔진 단면 애니메이션. public/turbofan_3d.html 을 iframe으로 불러오고, postMessage로 모듈 강조 값을 보낸다.
 * 화면 밖이거나 탭이 숨겨지면 그리기를 멈추고, '동작 줄이기' 설정이면 움직이지 않는 단면 장면으로 보여준다.
 */
export function Turbofan3D({ heat, focus = null, className, style, children }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const state = useRef<{ heat?: Record<string, number>; focus: string | null; visible: boolean }>({ heat, focus, visible: true })
  const reduced = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  const send = () => {
    const { heat, focus, visible } = state.current
    const run = visible && document.visibilityState === 'visible'
    frame.current?.contentWindow?.postMessage({ source: 'sentinel', heat, focus, run }, window.location.origin)
  }

  // 값이 바뀔 때마다 보낸다
  useEffect(() => {
    state.current.heat = heat
    state.current.focus = focus
    send()
  }, [heat, focus])

  useEffect(() => {
    // iframe이 준비되면 그동안 쌓인 값을 다시 보낸다
    const onMsg = (e: MessageEvent) => {
      if (e.source === frame.current?.contentWindow && e.data?.source === 'sentinel-3d' && e.data.ready) send()
    }
    window.addEventListener('message', onMsg)
    const onVis = () => send()
    document.addEventListener('visibilitychange', onVis)
    const io = new IntersectionObserver(([en]) => {
      state.current.visible = en.isIntersecting
      send()
    })
    if (box.current) io.observe(box.current)
    return () => {
      window.removeEventListener('message', onMsg)
      document.removeEventListener('visibilitychange', onVis)
      io.disconnect()
    }
  }, [])

  return (
    <div
      ref={box}
      className={`relative overflow-hidden ${className ?? ''}`}
      style={{ background: 'radial-gradient(120% 90% at 60% 30%, #3a4a63 0%, #1b2433 55%, #0e131c 100%)', ...style }}
    >
      <iframe
        ref={frame}
        src={reduced ? `${SRC}&t=6.5` : SRC}
        title="항공기 엔진 3D 단면"
        loading="lazy"
        onLoad={send}
        className="absolute inset-0 h-full w-full border-0"
      />
      {children && <div className="pointer-events-none absolute inset-0">{children}</div>}
    </div>
  )
}

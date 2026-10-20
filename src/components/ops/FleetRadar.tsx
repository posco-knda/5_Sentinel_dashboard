import { useEffect, useRef } from 'react'
import { useFleet } from '../../lib/fleet'

const PLANE = new Path2D('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z')

/** 화면 안의 상대 위치(0~1) — 공항끼리 겹치지 않게 보기 좋게 펼친 추상 배치라 실제 지형과는 다르다 */
const AIRPORTS: Record<string, [number, number]> = {
  ICN: [0.3, 0.3],
  GMP: [0.37, 0.46],
  CJJ: [0.44, 0.22],
  TAE: [0.52, 0.36],
  PUS: [0.6, 0.56],
  KWJ: [0.38, 0.66],
  CJU: [0.28, 0.84],
  FUK: [0.7, 0.76],
  KIX: [0.8, 0.5],
  NRT: [0.93, 0.3],
  PVG: [0.1, 0.52],
  TPE: [0.13, 0.88],
}
const ROUTES: [string, string][] = [
  ['ICN', 'CJU'],
  ['GMP', 'PUS'],
  ['ICN', 'NRT'],
  ['PUS', 'KIX'],
  ['ICN', 'PVG'],
  ['CJU', 'FUK'],
  ['TAE', 'CJU'],
  ['ICN', 'TPE'],
  ['KWJ', 'PUS'],
  ['CJJ', 'KIX'],
  ['PUS', 'NRT'],
  ['GMP', 'CJU'],
]
const COLORS = { ok: '#3fe08a', warn: '#ffcc33', red: '#ff5d5d' }

/** 같은 난수 순서를 쓰는 간단한 생성기 — 새로고침해도 비행기 배치가 같다 */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/**
 * 운항 현황 레이더 — 항공기들이 노선을 따라 날아다니는 비행 추적 화면.
 * 비행기의 색 비율은 실제 엔진 등급 분포(위험·주의·정상)를 따른다. 위치와 노선은 표시용이다.
 */
export function FleetRadar() {
  const fleet = useFleet()
  const ref = useRef<HTMLCanvasElement>(null)
  const red = fleet.filter((e) => e.level === 'red').length
  const warn = fleet.filter((e) => e.level === 'warn').length
  const ok = fleet.length - red - warn
  const sig = `${red}-${warn}-${ok}`

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const total = Math.max(1, red + warn + ok)
    const N = 16
    const nRed = Math.max(1, Math.round((N * red) / total))
    const nWarn = Math.round((N * warn) / total)
    const kinds: (keyof typeof COLORS)[] = Array.from({ length: N }, (_, i) => (i < nRed ? 'red' : i < nRed + nWarn ? 'warn' : 'ok'))
    const rand = rng(31)
    const planes = kinds
      .map((k) => ({ k, r: Math.floor(rand() * ROUTES.length), t: rand(), v: 0.012 + rand() * 0.014, dir: rand() < 0.5 ? 1 : -1 }))
      .sort(() => rand() - 0.5)
    let w = 0
    let h = 0
    let dpr = 1
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    const P = (code: string): [number, number] => {
      const [fx, fy] = AIRPORTS[code]
      return [28 + fx * (w - 56), 46 + fy * (h - 78)]
    }
    const curve = (a: string, b: string) => {
      const [x0, y0] = P(a)
      const [x1, y1] = P(b)
      const mx = (x0 + x1) / 2
      const my = (y0 + y1) / 2 - Math.min(46, Math.hypot(x1 - x0, y1 - y0) * 0.22)
      return { x0, y0, x1, y1, mx, my }
    }
    const at = (c: ReturnType<typeof curve>, t: number): [number, number, number, number] => {
      const u = 1 - t
      const x = u * u * c.x0 + 2 * u * t * c.mx + t * t * c.x1
      const y = u * u * c.y0 + 2 * u * t * c.my + t * t * c.y1
      const dx = 2 * u * (c.mx - c.x0) + 2 * t * (c.x1 - c.mx)
      const dy = 2 * u * (c.my - c.y0) + 2 * t * (c.y1 - c.my)
      return [x, y, dx, dy]
    }

    let raf = 0
    let t0 = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000)
      t0 = now
      ctx.clearRect(0, 0, w, h)
      // 바탕: 위도·경도 격자
      ctx.strokeStyle = 'rgba(120,150,210,0.09)'
      ctx.lineWidth = 1
      for (let i = 0; i <= 12; i++) {
        const x = 24 + (i / 12) * (w - 48)
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let j = 0; j <= 5; j++) {
        const y = 18 + (j / 5) * (h - 52)
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      // 노선
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = 'rgba(140,170,255,0.28)'
      ctx.lineWidth = 1
      for (const [a, b] of ROUTES) {
        const c = curve(a, b)
        ctx.beginPath()
        ctx.moveTo(c.x0, c.y0)
        ctx.quadraticCurveTo(c.mx, c.my, c.x1, c.y1)
        ctx.stroke()
      }
      ctx.setLineDash([])
      // 공항
      ctx.font = '600 10px ui-monospace, SFMono-Regular, Menlo, monospace'
      ctx.textAlign = 'center'
      for (const code of Object.keys(AIRPORTS)) {
        const [x, y] = P(code)
        ctx.fillStyle = 'rgba(200,215,255,0.9)'
        ctx.beginPath()
        ctx.arc(x, y, 2.6, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = 'rgba(140,170,255,0.35)'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = 'rgba(170,185,220,0.85)'
        ctx.fillText(code, x, y + 17)
      }
      // 비행기: 꼬리 흔적 + 기체
      const s = w < 520 ? 0.78 : 1
      for (const p of planes) {
        p.t += p.v * dt * p.dir
        if (p.t > 1 || p.t < 0) {
          p.dir *= -1
          p.t = Math.min(1, Math.max(0, p.t))
        }
        // 위치는 항상 노선(a→b) 위의 비율로 구하고, 되돌아갈 때는 진행 방향만 뒤집는다
        const [a, b] = ROUTES[p.r]
        const cc = curve(a, b)
        const [x, y, dx, dy] = at(cc, p.t)
        const ang = Math.atan2(p.dir * dy, p.dir * dx)
        const col = COLORS[p.k]
        for (let i = 1; i <= 9; i++) {
          const back = Math.max(0, Math.min(1, p.t - i * 0.012 * p.dir))
          const [bx, by] = at(cc, back)
          ctx.fillStyle = col
          ctx.globalAlpha = 0.5 * (1 - i / 10)
          ctx.beginPath()
          ctx.arc(bx, by, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ang + Math.PI / 4)
        ctx.scale(0.95 * s, 0.95 * s)
        ctx.translate(-12, -12)
        ctx.shadowColor = col
        ctx.shadowBlur = p.k === 'red' ? 10 : 6
        ctx.fillStyle = col
        ctx.fill(PLANE)
        ctx.restore()
      }
      raf = requestAnimationFrame(draw)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])

  return (
    <section className="no-print relative overflow-hidden" style={{ background: 'radial-gradient(120% 140% at 70% 0%, #1a2233 0%, #0b0e13 60%)', borderRadius: 'var(--radius-sm)', boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.18)' }} aria-label="운항 현황">
      <canvas ref={ref} className="block h-[190px] w-full sm:h-[250px]" role="img" aria-label="항공기가 노선을 따라 비행하는 운항 현황 화면" />
      <div className="pointer-events-none absolute left-4 top-3 flex flex-col">
        <span className="text-[15px] font-bold text-white">운항 현황</span>
        <span className="mono text-[10.5px] tracking-[0.18em]" style={{ color: '#ffcc33' }}>FLEET TRACKING</span>
      </div>
      <div className="pointer-events-none absolute right-4 top-3 flex flex-row gap-3 text-[11.5px]" style={{ color: '#c4ccda' }}>
        <span className="flex flex-row items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS.red }} />위험 <b className="mono text-white">{red}</b></span>
        <span className="flex flex-row items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS.warn }} />주의 <b className="mono text-white">{warn}</b></span>
        <span className="flex flex-row items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: COLORS.ok }} />정상 <b className="mono text-white">{ok}</b></span>
      </div>
    </section>
  )
}

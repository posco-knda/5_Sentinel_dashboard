import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { worldLand } from '../../data/worldLand'
import { useCurves } from '../../lib/curves'
import { LEVEL, URGENCY, daysText, deadlineText, useFleet, type FleetEngine } from '../../lib/fleet'
import { STATUS_LABEL, usePlan } from '../../lib/plan'

const PLANE = new Path2D('M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z')

type Kind = 'ok' | 'warn' | 'red'
const PLANES = 10

/** [경도, 위도] — 대서양을 가운데로 두지 않도록 경도를 -25°부터 335°까지로 이어 붙여 그린다(태평양이 끊기지 않게) */
const AIRPORTS: Record<string, [number, number]> = {
  ICN: [126.45, 37.46],
  NRT: [140.39, 35.77],
  PVG: [121.8, 31.14],
  HKG: [113.91, 22.31],
  BKK: [100.75, 13.69],
  SIN: [103.99, 1.36],
  DEL: [77.1, 28.56],
  DXB: [55.36, 25.25],
  FRA: [8.57, 50.03],
  LHR: [-0.46, 51.47],
  JFK: [-73.78, 40.64],
  LAX: [-118.41, 33.94],
  SYD: [151.18, -33.95],
}
const ROUTES: [string, string][] = [
  ['ICN', 'NRT'],
  ['ICN', 'PVG'],
  ['ICN', 'HKG'],
  ['ICN', 'SIN'],
  ['ICN', 'BKK'],
  ['ICN', 'DEL'],
  ['ICN', 'DXB'],
  ['ICN', 'FRA'],
  ['ICN', 'LHR'],
  ['ICN', 'JFK'],
  ['ICN', 'LAX'],
  ['ICN', 'SYD'],
  ['NRT', 'LAX'],
  ['SIN', 'SYD'],
  ['DXB', 'FRA'],
  ['PVG', 'DXB'],
]
/** 비행기마다 맡는 노선 — 한국 근처에 몰리지 않게 먼 노선과 한국 밖 노선을 골고루 섞는다 (ROUTES의 번호) */
const SPREAD = [10, 8, 7, 12, 14, 11, 13, 15, 9, 6]

const LON0 = -25
const LAT_TOP = 72
const LAT_BOTTOM = -40

/** CSS 변수(테마마다 값이 다름)를 캔버스가 쓸 수 있는 rgb 값으로 바꾼다 */
function resolve(v: string): [number, number, number] {
  const probe = document.createElement('span')
  probe.style.color = v
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  const m = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(rgb)
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [128, 128, 128]
}
const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`

/** 지금 테마에 맞는 색 — 라이트에서는 밝은 바탕에 진한 선, 다크에서는 어두운 바탕에 밝은 선 */
function palette() {
  return {
    ink: resolve('var(--text-primary)'),
    muted: resolve('var(--text-muted)'),
    line: resolve('var(--accent)'),
    kind: { ok: resolve('var(--status-good)'), warn: resolve('var(--status-warning)'), red: resolve('var(--status-critical)') },
  }
}

/** 경도를 -25°~335° 범위로 맞춘다 */
const wrap = (lon: number) => (lon < LON0 ? lon + 360 : lon)

/** 육지 윤곽: 고리마다 평균 경도로 한쪽으로 옮겨서 가장자리에서 찢어지지 않게 한다 */
const land = worldLand.map((ring) => {
  let sum = 0
  for (let i = 0; i < ring.length; i += 2) sum += ring[i]
  const shift = sum / (ring.length / 2) < LON0 ? 360 : 0
  return ring.map((v, i) => (i % 2 === 0 ? v + shift : v))
})

/** 같은 난수 순서를 쓰는 간단한 생성기 — 새로고침해도 비행기 배치가 같다 */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** 등급별로 골고루(시급한 순에서 일정 간격으로) 엔진을 뽑는다 */
function pickEngines(fleet: FleetEngine[], kind: Kind, n: number): FleetEngine[] {
  const pool = fleet.filter((e) => (kind === 'red' ? e.level === 'red' : kind === 'warn' ? e.level === 'warn' : e.level === 'ok')).sort((a, b) => a.requestIn - b.requestIn || a.unit - b.unit)
  if (!pool.length || n <= 0) return []
  const step = kind === 'red' ? 1 : Math.max(1, Math.floor(pool.length / n))
  return Array.from({ length: Math.min(n, pool.length) }, (_, i) => pool[Math.min(pool.length - 1, i * step + (kind === 'red' ? 0 : 1))])
}

interface PlaneInfo {
  unit: number
  kind: Kind
  route: [string, string]
  /** 노선을 얼마나 지났는가 0~1 */
  progress: number
  x: number
  y: number
}

/**
 * 운항 현황 — 세계 지도 위에서 항공기들이 노선을 따라 날아다니는 비행 추적 화면.
 * 비행기 한 대가 실제 엔진 한 대에 대응한다(등급 비율은 플릿 분포를 따름). 위에 올리면 엔진 정보가 뜨고, 누르면 엔진 상세로 간다.
 * 노선과 위치는 표시용이다.
 */
export function FleetRadar() {
  const fleet = useFleet()
  const plan = usePlan()
  const curves = useCurves()
  const nav = useNavigate()
  const ref = useRef<HTMLCanvasElement>(null)
  const red = fleet.filter((e) => e.level === 'red').length
  const warn = fleet.filter((e) => e.level === 'warn').length
  const ok = fleet.length - red - warn
  const sig = `${red}-${warn}-${ok}`

  // 비행기 한 대마다 대응하는 엔진
  const assigned = useMemo(() => {
    const total = Math.max(1, red + warn + ok)
    const nRed = Math.max(1, Math.round((PLANES * red) / total))
    const nWarn = Math.round((PLANES * warn) / total)
    const nOk = PLANES - nRed - nWarn
    const list: { e: FleetEngine; kind: Kind }[] = [
      ...pickEngines(fleet, 'red', nRed).map((e) => ({ e, kind: 'red' as Kind })),
      ...pickEngines(fleet, 'warn', nWarn).map((e) => ({ e, kind: 'warn' as Kind })),
      ...pickEngines(fleet, 'ok', nOk).map((e) => ({ e, kind: 'ok' as Kind })),
    ]
    return list
  }, [fleet, red, warn, ok])
  const assignedRef = useRef(assigned)
  const infoRef = useRef<PlaneInfo[]>([])
  const hoverRef = useRef(-1)
  const [hover, setHover] = useState<{ i: number; x: number; y: number; w: number; h: number; route: [string, string]; progress: number } | null>(null)

  useEffect(() => {
    assignedRef.current = assigned
  }, [assigned])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const rand = rng(17)
    const planes = assignedRef.current.map((a, i) => ({ i, kind: a.kind, r: SPREAD[i % SPREAD.length], t: 0.14 + 0.72 * (((i + 1) * 0.6180339) % 1), v: 0.012 + rand() * 0.012, dir: rand() < 0.5 ? 1 : -1 }))
    infoRef.current = planes.map((p) => ({ unit: assignedRef.current[p.i].e.unit, kind: p.kind, route: ROUTES[p.r], progress: p.t, x: -99, y: -99 }))
    let w = 0
    let h = 0
    let dpr = 1
    let sx = 1
    let sy = 1
    let ox = 0
    let pal = palette()
    // 라이트/다크 전환을 따라간다
    const refreshPal = () => (pal = palette())
    const mo = new MutationObserver(refreshPal)
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class', 'data-role'] })
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    mq.addEventListener('change', refreshPal)

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = canvas.clientWidth
      h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      // 세로는 높이에 맞추고, 가로는 약간 늘려서 가로로 긴 판을 채운다. 좁은 화면에서는 아시아·태평양 쪽을 보여 준다
      sy = (h - 24) / (LAT_TOP - LAT_BOTTOM)
      sx = Math.max(w / 360, sy * 1.15)
      const mapW = sx * 360
      ox = mapW <= w ? (w - mapW) / 2 : Math.min(0, Math.max(w - mapW, w / 2 - (140 - LON0) * sx))
    }
    const P = (code: string): [number, number] => {
      const [lon, lat] = AIRPORTS[code]
      return [ox + (wrap(lon) - LON0) * sx, 12 + (LAT_TOP - lat) * sy]
    }
    const inView = (x: number) => x > 14 && x < w - 14
    const curve = (a: string, b: string) => {
      const [x0, y0] = P(a)
      const [x1, y1] = P(b)
      const mx = (x0 + x1) / 2
      const my = (y0 + y1) / 2 - Math.min(0.28 * h, Math.hypot(x1 - x0, y1 - y0) * 0.2)
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

    // 마우스를 올린 비행기 찾기
    const near = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      const mx = e.clientX - r.left
      const my = e.clientY - r.top
      let best = -1
      let bd = 18 * 18
      infoRef.current.forEach((p, i) => {
        const d = (p.x - mx) ** 2 + (p.y - my) ** 2
        if (d < bd) {
          bd = d
          best = i
        }
      })
      return { best, w: r.width, h: r.height }
    }
    const onMove = (e: PointerEvent) => {
      const { best, w: cw, h: ch } = near(e)
      if (best !== hoverRef.current) {
        hoverRef.current = best
        const p = infoRef.current[best]
        setHover(best < 0 ? null : { i: best, x: p.x, y: p.y, w: cw, h: ch, route: p.route, progress: p.progress })
      }
      canvas.style.cursor = best >= 0 ? 'pointer' : 'default'
    }
    const onLeave = () => {
      hoverRef.current = -1
      setHover(null)
      canvas.style.cursor = 'default'
    }
    const onClick = (e: PointerEvent) => {
      const { best } = near(e)
      if (best >= 0) nav(`/equipment/engine-${infoRef.current[best].unit}`)
    }
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerdown', onMove)
    canvas.addEventListener('pointerleave', onLeave)
    canvas.addEventListener('click', onClick as EventListener)

    let raf = 0
    let t0 = performance.now()
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - t0) / 1000)
      t0 = now
      ctx.clearRect(0, 0, w, h)
      // 위도·경도 격자
      ctx.strokeStyle = rgba(pal.muted, 0.12)
      ctx.lineWidth = 1
      for (let lon = -20; lon <= 330; lon += 30) {
        const x = ox + (lon - LON0) * sx
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, h)
        ctx.stroke()
      }
      for (let lat = 60; lat >= -30; lat -= 30) {
        const y = 12 + (LAT_TOP - lat) * sy
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      // 육지
      ctx.fillStyle = rgba(pal.muted, 0.16)
      ctx.strokeStyle = rgba(pal.muted, 0.32)
      ctx.lineWidth = 0.8
      for (const ring of land) {
        ctx.beginPath()
        for (let i = 0; i < ring.length; i += 2) {
          const x = ox + (ring[i] - LON0) * sx
          const y = 12 + (LAT_TOP - ring[i + 1]) * sy
          if (i === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.fill()
        ctx.stroke()
      }
      // 노선
      ctx.setLineDash([4, 6])
      ctx.strokeStyle = rgba(pal.line, 0.42)
      ctx.lineWidth = 1
      for (const [a, b] of ROUTES) {
        const c = curve(a, b)
        if (!inView(c.x0) || !inView(c.x1)) continue
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
        if (!inView(x)) continue
        const hub = code === 'ICN'
        ctx.fillStyle = rgba(pal.ink, 0.88)
        ctx.beginPath()
        ctx.arc(x, y, hub ? 3.6 : 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = rgba(pal.line, hub ? 0.8 : 0.5)
        ctx.beginPath()
        ctx.arc(x, y, hub ? 8 : 5.5, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = rgba(pal.muted, 1)
        ctx.fillText(code, x, y + (hub ? 21 : 16))
      }
      // 비행기: 꼬리 흔적 + 기체 (마우스를 올린 비행기는 멈춰서 누르기 쉽게 한다)
      const s = w < 520 ? 0.85 : 1.05
      for (const p of planes) {
        const [a, b] = ROUTES[p.r]
        const cc = curve(a, b)
        const visible = inView(cc.x0) && inView(cc.x1)
        if (p.i !== hoverRef.current) p.t += p.v * dt * p.dir
        if (p.t > 1 || p.t < 0) {
          p.dir *= -1
          p.t = Math.min(1, Math.max(0, p.t))
        }
        const info = infoRef.current[p.i]
        info.progress = p.dir > 0 ? p.t : 1 - p.t
        info.route = p.dir > 0 ? [a, b] : [b, a]
        if (!visible) {
          info.x = -99
          info.y = -99
          continue
        }
        const [x, y, dx, dy] = at(cc, p.t)
        info.x = x
        info.y = y
        const ang = Math.atan2(p.dir * dy, p.dir * dx)
        const col = rgba(pal.kind[p.kind], 1)
        for (let i = 1; i <= 9; i++) {
          const back = Math.max(0, Math.min(1, p.t - i * 0.012 * p.dir))
          const [bx, by] = at(cc, back)
          ctx.fillStyle = col
          ctx.globalAlpha = 0.55 * (1 - i / 10)
          ctx.beginPath()
          ctx.arc(bx, by, 1.6, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        if (p.i === hoverRef.current) {
          ctx.strokeStyle = rgba(pal.kind[p.kind], 0.9)
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.arc(x, y, 15, 0, Math.PI * 2)
          ctx.stroke()
        }
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(ang + Math.PI / 4)
        ctx.scale(s, s)
        ctx.translate(-12, -12)
        ctx.shadowColor = rgba(pal.kind[p.kind], 0.45)
        ctx.shadowBlur = p.kind === 'red' ? 8 : 4
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
      mo.disconnect()
      mq.removeEventListener('change', refreshPal)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerdown', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('click', onClick as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, nav])

  const sel = hover ? assigned[hover.i] : null
  const cycles = sel && curves?.[sel.e.unit] ? curves[sel.e.unit].c[curves[sel.e.unit].c.length - 1] : null
  const tone = sel ? { ok: 'var(--status-good)', warn: 'var(--status-warning)', red: 'var(--status-critical)' }[sel.kind] : ''
  const status = sel ? plan.get(sel.e.unit).status : null

  return (
    <section className="no-print relative overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }} aria-label="운항 현황">
      <canvas ref={ref} className="block h-[200px] w-full touch-pan-y sm:h-[300px]" role="img" aria-label="세계 지도 위에서 항공기가 노선을 따라 비행하는 운항 현황 화면. 비행기를 누르면 해당 엔진 상세로 이동합니다" />
      <div className="pointer-events-none absolute left-4 top-3 flex flex-col">
        <span className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>운항 현황</span>
        <span className="mono text-[10.5px] tracking-[0.18em]" style={{ color: 'var(--accent)' }}>FLEET TRACKING</span>
      </div>
      <div className="pointer-events-none absolute right-4 top-3 flex flex-row gap-3 text-[11.5px] max-sm:bottom-2.5 max-sm:left-4 max-sm:right-auto max-sm:top-auto" style={{ color: 'var(--text-secondary)' }}>
        <span className="flex flex-row items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--status-critical)' }} />위험 <b className="mono" style={{ color: 'var(--text-primary)' }}>{red}</b></span>
        <span className="flex flex-row items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--status-warning)' }} />주의 <b className="mono" style={{ color: 'var(--text-primary)' }}>{warn}</b></span>
        <span className="flex flex-row items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: 'var(--status-good)' }} />정상 <b className="mono" style={{ color: 'var(--text-primary)' }}>{ok}</b></span>
      </div>

      {hover && sel && (
        <div
          className="pointer-events-none absolute z-10 w-[236px] border p-3 text-[12px]"
          style={{
            left: Math.max(8, Math.min(hover.w - 244, hover.x + 18)),
            // 비행기가 위쪽이면 카드를 아래로, 아래쪽이면 위로 펼쳐서 카드 높이와 상관없이 판 안에 들어오게 한다
            top: Math.max(0, Math.min(hover.h, hover.y)),
            transform: `translateY(-${Math.min(1, Math.max(0, hover.y / hover.h)) * 100}%)`,
            background: 'var(--surface-raised)',
            borderColor: 'var(--border-strong)',
            borderRadius: 'var(--radius-xs)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          }}
        >
          <div className="flex flex-row items-center justify-between gap-2">
            <span className="mono text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>{sel.e.name}</span>
            <span className="text-[11px] font-semibold" style={{ color: tone }}>● {LEVEL[sel.e.level].label} · {URGENCY[sel.e.urgency].label}</span>
          </div>
          <dl className="m-0 mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt style={{ color: 'var(--text-muted)' }}>남은 수명</dt>
            <dd className="m-0 text-right"><b className="mono" style={{ color: tone }}>{sel.e.pred}</b> cycle <span style={{ color: 'var(--text-muted)' }}>({daysText(sel.e.daysLeft)})</span></dd>
            <dt style={{ color: 'var(--text-muted)' }}>누적 비행</dt>
            <dd className="m-0 text-right">{cycles != null ? <><b className="mono">{cycles}</b> cycle</> : '—'}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>정비 요청</dt>
            <dd className="m-0 text-right" style={{ color: sel.e.requestIn <= 0 ? 'var(--status-critical)' : undefined }}>{deadlineText(sel.e.requestIn)}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>점검 부위</dt>
            <dd className="m-0 text-right">{sel.e.topPart ? sel.e.topPart.label.replace(/\(.*\)/, '') : '뚜렷한 변화 없음'}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>처리 상태</dt>
            <dd className="m-0 text-right">{status ? STATUS_LABEL[status] : '—'}</dd>
            <dt style={{ color: 'var(--text-muted)' }}>운항 노선</dt>
            <dd className="mono m-0 text-right">{hover.route[0]} → {hover.route[1]} · {Math.round(hover.progress * 100)}%</dd>
          </dl>
          <div className="mt-2 border-t pt-1.5 text-[11px]" style={{ borderColor: 'var(--border-soft)', color: 'var(--accent)' }}>눌러서 엔진 상세 보기 →</div>
        </div>
      )}
    </section>
  )
}

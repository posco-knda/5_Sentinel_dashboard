import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EngineSchematic, type SchematicPart } from './EngineSchematic'
import { partTone } from '../lib/parts'

const SHORT: Record<string, string> = { fan: '팬', lpc: 'LPC', hpc: 'HPC', core: '연소실', hpt: 'HPT', lpt: 'LPT' }

/** 모듈별 외형 — [반지름, 축 방향 위치] 점들을 엔진 축(x)으로 회전시켜 만든다 */
const PROFILES: Record<string, [number, number][]> = {
  lpc: [[0.34, -2.55], [0.5, -2.55], [0.46, -1.75], [0.34, -1.75]],
  hpc: [[0.24, -1.7], [0.46, -1.7], [0.3, 0.3], [0.2, 0.3]],
  core: [[0.26, 0.35], [0.36, 0.35], [0.43, 0.7], [0.43, 1.05], [0.38, 1.35], [0.26, 1.35]],
  hpt: [[0.26, 1.4], [0.4, 1.4], [0.44, 1.9], [0.26, 1.9]],
  lpt: [[0.26, 1.95], [0.46, 1.95], [0.66, 3.2], [0.34, 3.2]],
}
/** 단 구분 링의 [시작 반지름, 끝 반지름, 개수] */
const RINGS: Record<string, [number, number, number]> = {
  lpc: [0.5, 0.46, 3],
  hpc: [0.46, 0.3, 6],
  core: [0.43, 0.43, 2],
  hpt: [0.4, 0.44, 2],
  lpt: [0.46, 0.66, 3],
}
const CENTER_X: Record<string, number> = { fan: -3.0, lpc: -2.15, hpc: -0.7, core: 0.85, hpt: 1.65, lpt: 2.6 }

function cssColor(v: string): THREE.Color {
  const probe = document.createElement('span')
  probe.style.color = v
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  const m = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(rgb)
  return m ? new THREE.Color(Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255) : new THREE.Color('#888888')
}

function lathe(points: [number, number][]) {
  const g = new THREE.LatheGeometry(points.map(([r, x]) => new THREE.Vector2(r, x)), 48)
  g.rotateZ(-Math.PI / 2) // 회전축 y → 엔진 축 x
  return g
}

interface Handle {
  setSelected: (id: string | null) => void
  setColors: (c: Record<string, THREE.Color>) => void
}

/**
 * 엔진 3D 구조 — 드래그로 돌려 볼 수 있고, 부품에 마우스를 올리면 그 부품이 켜지며 onSelect가 불린다.
 * 색은 2D 구조도와 같은 기준(센서 변화 배수)이다. WebGL을 쓸 수 없으면 2D 구조도를 대신 보여 준다.
 */
export function EngineModel3D({ parts, selected, onSelect, topId }: { parts: SchematicPart[]; selected: string; onSelect: (id: string | null) => void; topId?: string | null }) {
  const host = useRef<HTMLDivElement>(null)
  const labels = useRef<Record<string, HTMLSpanElement | null>>({})
  const api = useRef<Handle | null>(null)
  const pick = useRef(onSelect)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    pick.current = onSelect
  }, [onSelect])

  useEffect(() => {
    const el = host.current
    if (!el) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    } catch {
      setFailed(true)
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.cursor = 'grab'

    const scene = new THREE.Scene()
    const root = new THREE.Group()
    scene.add(root)
    const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 60)
    camera.position.set(2.2, 2.6, 8.4)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0.2, 0, 0)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = true
    controls.minAzimuthAngle = -0.5
    controls.maxAzimuthAngle = 1.1
    controls.minPolarAngle = 0.5
    controls.maxPolarAngle = Math.PI - 0.5

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8892a8, 1.1))
    const sun = new THREE.DirectionalLight(0xffffff, 1.6)
    sun.position.set(4, 6, 5)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0xaecbff, 0.7)
    rim.position.set(-5, -2, -4)
    scene.add(rim)

    // body: 금속 몸체(색을 살짝만 입힌다) / mark: 단 구분 링(상태 색을 또렷하게 보여 주는 표시)
    const mats: Record<string, { m: THREE.MeshStandardMaterial; mark: boolean }[]> = {}
    const pickable: THREE.Object3D[] = []
    const add = (id: string, obj: THREE.Object3D, mat: THREE.MeshStandardMaterial, mark: THREE.MeshStandardMaterial) => {
      obj.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.userData.part = id
          pickable.push(o)
        }
      })
      ;(mats[id] ??= []).push({ m: mat, mark: false }, { m: mark, mark: true })
      root.add(obj)
    }
    const baseMat = () => new THREE.MeshStandardMaterial({ color: 0x9aa4b5, metalness: 0.55, roughness: 0.4, side: THREE.DoubleSide, emissive: 0x000000 })

    // 압축기·연소실·터빈: 축 방향 몸체 + 단 구분 링
    for (const id of Object.keys(PROFILES)) {
      const m = baseMat()
      const mk = baseMat()
      const g = new THREE.Group()
      g.add(new THREE.Mesh(lathe(PROFILES[id]), m))
      const xs = PROFILES[id].map((p) => p[1])
      const x0 = Math.min(...xs)
      const x1 = Math.max(...xs)
      const [r0, r1, n] = RINGS[id]
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1)
        const ring = new THREE.Mesh(new THREE.TorusGeometry((r0 + (r1 - r0) * t) * 1.01, 0.03, 8, 48), mk)
        ring.rotation.y = Math.PI / 2
        ring.position.x = x0 + (x1 - x0) * t
        g.add(ring)
      }
      add(id, g, m, mk)
    }

    // 팬: 허브 + 블레이드(천천히 돈다)
    const fanMat = baseMat()
    const fan = new THREE.Group()
    fan.position.x = CENTER_X.fan
    const hub = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 32), fanMat)
    hub.rotation.z = Math.PI / 2
    hub.position.x = -0.15
    fan.add(hub)
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.74, 0.3), fanMat)
      blade.position.set(0, Math.cos(a) * 0.66, Math.sin(a) * 0.66)
      blade.rotation.set(a, 0.35, 0, 'YXZ')
      fan.add(blade)
    }
    const fanMarkMat = baseMat()
    const fanRim = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.045, 8, 64), fanMarkMat)
    fanRim.rotation.y = Math.PI / 2
    fan.add(fanRim)
    add('fan', fan, fanMat, fanMarkMat)

    // 바깥 케이스(나셀)와 배기 노즐 — 반투명, 고르지 않는다
    const shell = new THREE.Mesh(
      lathe([[1.0, -3.45], [1.1, -3.3], [1.08, -2.6], [1.02, 0.6], [0.9, 2.4], [0.7, 3.4], [0.62, 3.75]]),
      new THREE.MeshStandardMaterial({ color: 0xdfe6f2, metalness: 0.2, roughness: 0.5, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    )
    root.add(shell)
    const nozzle = new THREE.Mesh(lathe([[0.34, 3.2], [0.4, 3.25], [0.2, 3.9], [0.0, 3.95]]), new THREE.MeshStandardMaterial({ color: 0x6f7787, metalness: 0.7, roughness: 0.35, side: THREE.DoubleSide }))
    root.add(nozzle)
    const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-3.6, 0, 0), new THREE.Vector3(4.1, 0, 0)]), new THREE.LineDashedMaterial({ color: 0x8892a8, dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.5 }))
    axis.computeLineDistances()
    root.add(axis)

    let sway = true
    let t0 = 0
    let sel: string | null = null
    let hover: string | null = null
    const colors: Record<string, THREE.Color> = {}
    const paint = () => {
      for (const [id, list] of Object.entries(mats)) {
        const on = id === sel
        for (const { m, mark } of list) {
          const c = colors[id] ?? new THREE.Color(0x9aa4b5)
          if (mark) {
            m.color.copy(c)
            m.emissive.copy(c)
            m.emissiveIntensity = on ? 0.9 : 0.45
          } else {
            // 몸체는 강철색에 상태 색을 조금만 섞고, 고른 부품만 밝게 켠다
            m.color.set(0xaab3c2).lerp(c, on ? 0.45 : 0.14)
            m.emissive.copy(c)
            m.emissiveIntensity = on ? 0.4 : 0
          }
        }
      }
    }
    api.current = {
      setSelected: (id) => {
        sel = id
        paint()
      },
      setColors: (c) => {
        Object.assign(colors, c)
        paint()
      },
    }

    const ray = new THREE.Raycaster()
    const mouse = new THREE.Vector2()
    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(mouse, camera)
      const hit = ray.intersectObjects(pickable, false)[0]
      const id = (hit?.object.userData.part as string | undefined) ?? null
      if (id !== hover) {
        hover = id
        pick.current(id)
      }
      sway = id == null
      renderer.domElement.style.cursor = id ? 'pointer' : 'grab'
    }
    const onLeave = () => {
      hover = null
      pick.current(null)
      sway = true
    }
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerleave', onLeave)

    const size = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    size()
    const ro = new ResizeObserver(size)
    ro.observe(el)

    const v = new THREE.Vector3()
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      fan.rotation.x += 0.012
      if (sway) t0 += 0.012
      root.rotation.y = Math.sin(t0) * 0.28
      controls.update()
      renderer.render(scene, camera)
      const w = el.clientWidth
      const h = el.clientHeight
      for (const [id, node] of Object.entries(labels.current)) {
        if (!node) continue
        v.set(CENTER_X[id], 0, 0).applyMatrix4(root.matrixWorld).project(camera)
        node.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${h - 26}px)`
      }
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      controls.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
      })
      Object.values(mats).flat().forEach(({ m }) => m.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      api.current = null
    }
  }, [])

  const colorKey = parts.map((p) => `${p.id}:${partTone(p.score).label}`).join('|')
  useEffect(() => {
    const c: Record<string, THREE.Color> = {}
    for (const p of parts) c[p.id] = cssColor(partTone(p.score).color)
    api.current?.setColors(c)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey])
  useEffect(() => {
    api.current?.setSelected(selected)
  }, [selected, colorKey])

  if (failed) return <EngineSchematic parts={parts} selected={selected} onSelect={onSelect} topId={topId} />
  return (
    <div ref={host} className="relative h-[340px] w-full touch-pan-y select-none overflow-hidden" role="img" aria-label="엔진 3D 구조 — 끌어서 돌려 볼 수 있습니다">
      {parts.map((p) => (
        <span
          key={p.id}
          ref={(n) => {
            labels.current[p.id] = n
          }}
          className="pointer-events-none absolute left-0 top-0 flex flex-col items-center whitespace-nowrap text-[12px] leading-tight"
          style={{ fontWeight: p.id === selected ? 700 : 500, color: p.id === selected ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          {topId === p.id && <span className="mb-0.5 rounded-full px-1.5 py-px text-[10px] font-bold text-white" style={{ background: 'var(--status-critical)' }}>점검</span>}
          <span>{SHORT[p.id] ?? p.label}</span>
          {p.score != null && <span className="mono text-[11px]" style={{ color: partTone(p.score).color }}>×{p.score.toFixed(1)}</span>}
        </span>
      ))}
      <span className="pointer-events-none absolute right-2 top-1 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>끌어서 회전</span>
    </div>
  )
}

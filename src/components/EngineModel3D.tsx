import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { EngineSchematic, type SchematicPart } from './EngineSchematic'
import { FlyLoading } from './FlyLoading'
import { partTone } from '../lib/parts'

const MODEL_URL = '/models/turbofan-cutaway.glb'
const SHORT: Record<string, string> = { fan: '팬', lpc: 'LPC', hpc: 'HPC', core: '연소실', hpt: 'HPT', lpt: 'LPT' }

/** 모델 파일의 부품 이름 → 우리 6개 모듈. 여기에 없는 것(케이스·축·노즐·나셀)은 고를 수 없는 외형이다 */
const PART_OF: Record<string, string> = {
  Fan_20_blades: 'fan',
  Spinner: 'fan',
  Compressor_rotor_1: 'lpc',
  Compressor_rotor_2: 'lpc',
  Compressor_rotor_3: 'lpc',
  Compressor_rotor_4: 'hpc',
  Compressor_rotor_5: 'hpc',
  Compressor_rotor_6: 'hpc',
  Compressor_rotor_7: 'hpc',
  Perforated_combustor_liner: 'core',
  High_pressure_turbine_1: 'hpt',
  High_pressure_turbine_2: 'hpt',
  Low_pressure_turbine_3: 'lpt',
  Low_pressure_turbine_4: 'lpt',
}
/** 돌아가는 부품과 속도(라디안/프레임) */
const SPIN: Record<string, number> = { Fan_20_blades: 0.012, Spinner: 0.012 }
/** 모델 좌표: 엔진 축은 z, 축의 높이는 y=0.8, 앞(팬)이 +z */
const AXIS_Y = 0.8
const SCALE = 2.1
/** 각 모듈의 축 방향 중심(모델 z) — 라벨 위치용 */
const CENTER_Z: Record<string, number> = { fan: 1.32, lpc: 0.84, hpc: 0.53, core: -0.07, hpt: -0.52, lpt: -0.84 }

function cssColor(v: string): THREE.Color {
  const probe = document.createElement('span')
  probe.style.color = v
  document.body.appendChild(probe)
  const rgb = getComputedStyle(probe).color
  probe.remove()
  const m = /(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)[ ,]+(\d+(?:\.\d+)?)/.exec(rgb)
  return m ? new THREE.Color(Number(m[1]) / 255, Number(m[2]) / 255, Number(m[3]) / 255) : new THREE.Color('#888888')
}

interface Handle {
  setSelected: (id: string | null) => void
  setColors: (c: Record<string, THREE.Color>) => void
}

/**
 * 엔진 3D 구조(단면 모델) — 드래그로 돌려 볼 수 있고, 부품에 마우스를 올리면 그 부품이 켜지며 onSelect가 불린다.
 * 팬·압축기·연소실·터빈의 색은 2D 구조도와 같은 기준(센서 변화 배수)이다. 모델을 못 불러오면 2D 구조도를 대신 보여 준다.
 */
export function EngineModel3D({ parts, selected, onSelect, topId }: { parts: SchematicPart[]; selected: string; onSelect: (id: string | null) => void; topId?: string | null }) {
  const host = useRef<HTMLDivElement>(null)
  const labels = useRef<Record<string, HTMLSpanElement | null>>({})
  const api = useRef<Handle | null>(null)
  const pick = useRef(onSelect)
  const [failed, setFailed] = useState(false)
  const [loaded, setLoaded] = useState(false)

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
    let alive = true
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)
    renderer.domElement.style.display = 'block'
    renderer.domElement.style.cursor = 'grab'

    const scene = new THREE.Scene()
    // 모델의 z축(엔진 축)을 화면의 가로(x)로 눕히고, 축 높이를 원점으로 옮긴다
    const root = new THREE.Group()
    scene.add(root)
    const model = new THREE.Group()
    model.rotation.y = -Math.PI / 2
    model.scale.setScalar(SCALE)
    model.position.y = -AXIS_Y * SCALE
    root.add(model)

    const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 60)
    camera.position.set(1.8, 3.2, 8.6)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 0, 0)
    controls.enablePan = false
    controls.enableZoom = false
    controls.enableDamping = true
    controls.minAzimuthAngle = -0.6
    controls.maxAzimuthAngle = 1.0

    // 금속 재질은 주변을 비춰 줄 환경(반사)이 있어야 검게 죽지 않는다
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8892a8, 0.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(4, 6, 5)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(0xaecbff, 0.7)
    rim.position.set(-5, -2, -4)
    scene.add(rim)

    const mats: Record<string, THREE.MeshStandardMaterial[]> = {}
    const base = new Map<THREE.MeshStandardMaterial, THREE.Color>()
    const pickable: THREE.Object3D[] = []
    const spinners: { pivot: THREE.Group; speed: number }[] = []
    const colors: Record<string, THREE.Color> = {}
    let sel: string | null = null
    let hover: string | null = null
    let sway = true
    let t0 = 0

    const paint = () => {
      for (const [id, list] of Object.entries(mats)) {
        const on = id === sel
        const c = colors[id] ?? new THREE.Color(0x9aa4b5)
        for (const m of list) {
          // 모델의 원래 색은 그대로 두고, 고른 부품만 상태 색으로 은은하게 빛나게 한다
          m.color.copy(base.get(m) ?? m.color)
          m.emissive.copy(c)
          m.emissiveIntensity = on ? 0.5 : 0
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

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (!alive) return
        const meshes: THREE.Mesh[] = []
        gltf.scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
        })
        for (const mesh of meshes) {
          const part = PART_OF[mesh.name]
          const src = mesh.material as THREE.MeshStandardMaterial
          const m = src.clone()
          m.side = THREE.DoubleSide
          mesh.material = m
          if (mesh.name === 'Nacelle') {
            m.transparent = true
            m.opacity = 0.28
            m.depthWrite = false
          }
          if (part) {
            mesh.userData.part = part
            pickable.push(mesh)
            ;(mats[part] ??= []).push(m)
            base.set(m, m.color.clone())
          }
          // 회전축(엔진 축)을 지나는 피벗에 달아 돌릴 수 있게 한다
          if (SPIN[mesh.name]) {
            const pivot = new THREE.Group()
            pivot.position.set(0, AXIS_Y, 0)
            mesh.removeFromParent()
            mesh.position.set(0, -AXIS_Y, 0)
            pivot.add(mesh)
            model.add(pivot)
            spinners.push({ pivot, speed: SPIN[mesh.name] })
          } else {
            mesh.removeFromParent()
            model.add(mesh)
          }
        }
        paint()
        setLoaded(true)
      },
      undefined,
      () => alive && setFailed(true),
    )

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
      for (const s of spinners) s.pivot.rotation.z += s.speed
      if (sway) t0 += 0.012
      root.rotation.y = Math.sin(t0) * 0.22
      controls.update()
      root.updateMatrixWorld(true)
      renderer.render(scene, camera)
      const w = el.clientWidth
      const h = el.clientHeight
      for (const [id, node] of Object.entries(labels.current)) {
        if (!node) continue
        // 모델 z → 화면 가로(앞쪽 팬이 왼쪽)
        v.set(-CENTER_Z[id] * SCALE, 0, 0).applyMatrix4(root.matrixWorld).project(camera)
        node.style.transform = `translate(-50%, -50%) translate(${((v.x + 1) / 2) * w}px, ${h - 26}px)`
      }
    }
    tick()

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      renderer.domElement.removeEventListener('pointermove', onMove)
      renderer.domElement.removeEventListener('pointerleave', onLeave)
      controls.dispose()
      scene.traverse((o) => {
        const m = o as THREE.Mesh
        m.geometry?.dispose()
        const mat = m.material as THREE.Material | undefined
        mat?.dispose?.()
      })
      envTex.dispose()
      pmrem.dispose()
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
  }, [colorKey, loaded])
  useEffect(() => {
    api.current?.setSelected(selected)
  }, [selected, colorKey, loaded])

  if (failed) return <EngineSchematic parts={parts} selected={selected} onSelect={onSelect} topId={topId} />
  return (
    <div ref={host} className="relative h-[340px] w-full touch-pan-y select-none overflow-hidden" role="img" aria-label="엔진 3D 단면 구조 — 끌어서 돌려 볼 수 있습니다">
      {!loaded && (
        <div className="absolute inset-0 z-10">
          <FlyLoading label="3D 모델 불러오는 중…" height="100%" />
        </div>
      )}
      {parts.map((p) => (
        <span
          key={p.id}
          ref={(n) => {
            labels.current[p.id] = n
          }}
          className="pointer-events-none absolute left-0 top-0 flex flex-col items-center whitespace-nowrap text-[12px] leading-tight"
          style={{ fontWeight: p.id === selected ? 700 : 500, color: p.id === selected ? 'var(--text-primary)' : 'var(--text-secondary)', opacity: loaded ? 1 : 0 }}
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

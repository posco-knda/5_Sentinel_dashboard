export interface SensorCallout {
  id: string
  label: string
  value: string
  color: string
  /** point on the equipment line-art this callout refers to */
  anchor: { x: number; y: number }
  /** where the label text sits */
  label_at: { x: number; y: number; anchor: 'start' | 'middle' | 'end' }
}

const EQUIP_STROKE = 'var(--axis)'
const EQUIP_FILL = 'var(--surface-2)'

const STAND_XS = [110, 235, 360, 485, 610]
const STRIP_Y = 110

/**
 * 5단 텐덤 냉간압연기(TCM) 개략도 — 권출 코일(entry) -> 스탠드 1~5(각 스탠드는 워크롤
 * 닙을 지나는 스트립) -> 권취 코일(exit) 순서의 단순 박스 다이어그램. 센서 콜아웃은
 * Stand 3(상세 페이지 기준)에 실제 물리적으로 붙는 위치에 앵커됩니다.
 */
export function EquipmentDiagram({ sensors, highlightStand = 3 }: { sensors: SensorCallout[]; highlightStand?: number }) {
  return (
    <figure className="m-0">
      <svg
        viewBox="0 0 720 220"
        style={{ width: '100%', maxWidth: 680, height: 'auto', display: 'block', margin: '0 auto' }}
        role="img"
        aria-label="5단 텐덤 냉간압연기 개략도 — 권출 코일에서 5개 스탠드를 거쳐 권취 코일로 이어지며, force·torque·tension 센서 위치를 표시"
      >
        <g id="equipment-body" fill="none" stroke={EQUIP_STROKE} strokeWidth="2" strokeLinejoin="round">
          {/* 권출 코일 (entry payoff reel) */}
          <circle cx="35" cy={STRIP_Y} r="26" fill={EQUIP_FILL} />
          <circle cx="35" cy={STRIP_Y} r="17" />
          <circle cx="35" cy={STRIP_Y} r="8" fill="var(--surface-1)" />

          {/* 권취 코일 (exit tension reel) */}
          <circle cx="685" cy={STRIP_Y} r="26" fill={EQUIP_FILL} />
          <circle cx="685" cy={STRIP_Y} r="17" />
          <circle cx="685" cy={STRIP_Y} r="8" fill="var(--surface-1)" />

          {/* 스트립 라인 (권출 -> 스탠드1 -> ... -> 스탠드5 -> 권취) */}
          <line x1="61" y1={STRIP_Y} x2="659" y2={STRIP_Y} strokeWidth="2.5" strokeDasharray="1 0" />

          {/* 5개 스탠드 */}
          {STAND_XS.map((x, i) => {
            const n = i + 1
            const active = n === highlightStand
            return (
              <g key={n}>
                {/* 스탠드 프레임 */}
                <rect
                  x={x - 32}
                  y={STRIP_Y - 55}
                  width="64"
                  height="110"
                  rx="4"
                  fill={active ? 'color-mix(in oklab, var(--accent) 10%, transparent)' : EQUIP_FILL}
                  stroke={active ? 'var(--accent)' : EQUIP_STROKE}
                  strokeWidth={active ? 2.5 : 2}
                />
                {/* 워크롤 (위/아래) — 닙 사이로 스트립이 지나감 */}
                <rect x={x - 24} y={STRIP_Y - 16} width="48" height="12" rx="3" fill="var(--surface-1)" stroke={EQUIP_STROKE} />
                <rect x={x - 24} y={STRIP_Y + 4} width="48" height="12" rx="3" fill="var(--surface-1)" stroke={EQUIP_STROKE} />
                {/* 스탠드 번호 */}
                <text
                  x={x}
                  y={STRIP_Y + 82}
                  textAnchor="middle"
                  fontSize="12.5"
                  fontWeight="700"
                  fill={active ? 'var(--accent)' : 'var(--text-muted)'}
                  className="mono"
                >
                  ST.{n}
                </text>
              </g>
            )
          })}
        </g>

        {/* 센서 콜아웃 */}
        {sensors.map((s) => (
          <g key={s.id}>
            <line x1={s.anchor.x} y1={s.anchor.y} x2={s.label_at.x} y2={s.label_at.y - 20} stroke={s.color} strokeWidth="1.5" strokeDasharray="2 3" />
            <circle cx={s.anchor.x} cy={s.anchor.y} r="5" fill={s.color} stroke="var(--surface-1)" strokeWidth="1.5" />
            <text x={s.label_at.x} y={s.label_at.y} textAnchor={s.label_at.anchor} fontSize="12.5" fontWeight="600" fill="var(--text-primary)">
              {s.label}
            </text>
            <text x={s.label_at.x} y={s.label_at.y + 15} textAnchor={s.label_at.anchor} fontSize="11.5" fill="var(--text-muted)" className="mono">
              {s.value}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        5단 텐덤 냉간압연기 개략도(단순화) — 권출 코일 → Stand 1~5 → 권취 코일 순서. 강조된 스탠드가 이 상세 페이지의 대상이며, 점은 각 센서가 실제로 붙어있는 위치입니다.
      </figcaption>
    </figure>
  )
}

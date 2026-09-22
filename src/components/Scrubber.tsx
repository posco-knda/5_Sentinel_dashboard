import { formatHour, anomalyWindow } from '../data/mock'

const TICKS = [0, 6, 12, 18, 24]

/** 타임레인지 셀렉터 스타일 스크러버 — 채워지는 진행바 대신, 눈금 위를 움직이는 얇은 마커 방식.
 *  Datadog/Grafana류 모니터링 툴의 타임레인지 셀렉터에서 착안. */
export function Scrubber({
  hour,
  onChange,
  playing,
  onTogglePlay,
}: {
  hour: number
  onChange: (h: number) => void
  playing: boolean
  onTogglePlay: () => void
}) {
  const pct = (hour / 24) * 100
  const anomalyX1 = (anomalyWindow.start / 24) * 100
  const anomalyX2 = (anomalyWindow.end / 24) * 100
  const labelPct = Math.min(94, Math.max(6, pct))

  return (
    <div
      className="surface-card flex flex-row items-center gap-4 border px-5 py-4"
      style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
    >
      <button
        onClick={onTogglePlay}
        aria-label={playing ? '일시정지' : '재생'}
        className="icon-btn icon-btn--filled flex h-7 w-7 shrink-0 items-center justify-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        {playing ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      <div className="relative flex-1 pt-7 pb-4">
        {/* 현재 시각 플로팅 태그 (툴팁 스타일) */}
        <div
          className="mono pointer-events-none absolute top-0 -translate-x-1/2 border px-1.5 py-0.5 text-[11px] font-semibold"
          style={{
            left: `${labelPct}%`,
            background: 'var(--surface-2)',
            borderColor: 'var(--accent)',
            color: 'var(--accent)',
            borderRadius: 'var(--radius-xs)',
          }}
        >
          {formatHour(hour)}
        </div>

        {/* 이상구간 밴드 (베이스라인 바로 위 얇은 강조) */}
        <div
          className="pointer-events-none absolute h-1"
          style={{
            top: '24px',
            left: `${anomalyX1}%`,
            width: `${anomalyX2 - anomalyX1}%`,
            background: 'var(--status-critical)',
            opacity: 0.55,
          }}
        />

        {/* 베이스라인 */}
        <div className="absolute h-px w-full" style={{ top: '24.5px', background: 'var(--border)' }} />

        {/* 눈금 */}
        <div className="absolute inset-x-0" style={{ top: '20px' }}>
          {TICKS.map((t) => (
            <div key={t} className="absolute flex flex-col items-center" style={{ left: `${(t / 24) * 100}%` }}>
              <div className="h-2 w-px -translate-x-1/2" style={{ background: 'var(--border)' }} />
              <span
                className="mono mt-1 -translate-x-1/2 whitespace-nowrap text-[10.5px]"
                style={{ color: 'var(--text-muted)' }}
              >
                {formatHour(t).replace('코일 ', '')}
              </span>
            </div>
          ))}
        </div>

        {/* 플레이헤드 마커 */}
        <div className="pointer-events-none absolute -translate-x-1/2" style={{ top: '17px', left: `${pct}%` }}>
          <svg width="10" height="7" viewBox="0 0 10 7">
            <path d="M5 7L0 0h10z" fill="var(--series-1)" />
          </svg>
          <div className="mx-auto h-3.5 w-0.5" style={{ background: 'var(--series-1)' }} />
        </div>

        <input
          type="range"
          min={0}
          max={24}
          step={0.1}
          value={hour}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-x-0 -top-1 h-9 w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

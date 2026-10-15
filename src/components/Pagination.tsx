const btn = (active: boolean, disabled = false) => ({
  minWidth: 32,
  borderColor: active ? 'var(--accent)' : 'var(--border)',
  background: active ? 'var(--accent-dim)' : 'transparent',
  color: active ? 'var(--accent)' : disabled ? 'var(--text-muted)' : 'var(--text-secondary)',
  borderRadius: 'var(--radius-xs)',
  opacity: disabled ? 0.5 : 1,
})

/** 1 … 4 5 6 … 20 처럼 현재 쪽 주변만 보여 주는 쪽 번호 목록 */
function pageList(cur: number, last: number): (number | '…')[] {
  const set = new Set([1, last, cur - 1, cur, cur + 1].filter((n) => n >= 1 && n <= last))
  const nums = [...set].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) out.push('…')
    out.push(n)
  })
  return out
}

/** 쪽당 개수: 'auto'는 화면 높이에 맞춰 스크롤 없이 한 쪽이 다 보이게 한다 */
export type SizeMode = number | 'auto'
const SIZES: SizeMode[] = ['auto', 10, 20, 50]

/** 목록 아래의 쪽 이동. 표시 범위("21–40 / 172대")와 쪽당 개수 선택을 함께 둔다. */
export function Pagination({
  total,
  page,
  pageSize,
  sizeMode,
  onPage,
  onSizeMode,
  unit = '대',
}: {
  total: number
  page: number
  /** 지금 실제로 쓰는 쪽당 개수 */
  pageSize: number
  sizeMode: SizeMode
  onPage: (p: number) => void
  onSizeMode: (m: SizeMode) => void
  unit?: string
}) {
  const last = Math.max(1, Math.ceil(total / pageSize))
  const cur = Math.min(Math.max(1, page), last)
  const from = total === 0 ? 0 : (cur - 1) * pageSize + 1
  const to = Math.min(total, cur * pageSize)

  return (
    <div className="mt-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-row flex-wrap items-center gap-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
        <span>
          <span className="mono" style={{ color: 'var(--text-primary)' }}>{from}–{to}</span> / {total}{unit}
        </span>
        <select
          value={String(sizeMode)}
          onChange={(e) => onSizeMode(e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
          aria-label="쪽당 개수"
          className="border px-1.5 py-1 text-[12px]"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-xs)' }}
        >
          {SIZES.map((n) => (
            <option key={n} value={String(n)}>{n === 'auto' ? '화면에 맞춤' : `${n}개씩`}</option>
          ))}
        </select>
      </div>

      <nav aria-label="쪽 이동" className="flex flex-row flex-wrap items-center gap-1.5">
        <button onClick={() => onPage(cur - 1)} disabled={cur <= 1} aria-label="이전 쪽" className="border px-2.5 py-1 text-[12.5px]" style={btn(false, cur <= 1)}>
          ‹
        </button>
        {pageList(cur, last).map((n, i) =>
          n === '…' ? (
            <span key={`gap${i}`} className="px-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>…</span>
          ) : (
            <button key={n} onClick={() => onPage(n)} aria-label={`${n}쪽`} aria-current={n === cur ? 'page' : undefined} className="mono border px-2.5 py-1 text-[12.5px]" style={btn(n === cur)}>
              {n}
            </button>
          ),
        )}
        <button onClick={() => onPage(cur + 1)} disabled={cur >= last} aria-label="다음 쪽" className="border px-2.5 py-1 text-[12.5px]" style={btn(false, cur >= last)}>
          ›
        </button>
      </nav>
    </div>
  )
}

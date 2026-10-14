import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { StatTile } from '../components/StatTile'
import { EngineRulChart, type Curve } from '../components/EngineRulChart'
import { logRows, logSummary, type LogRow, type Verdict } from '../data/detectionLog'
import { engineDetails, dataMeta } from '../data/mock'

type Curves = Record<number, Curve>

const VERDICT: Record<Verdict, { label: string; color: string; wash: string }> = {
  tp: { label: '탐지', color: 'var(--accent)', wash: 'var(--accent-dim)' },
  fn: { label: '놓침', color: 'var(--status-critical)', wash: 'var(--status-critical-wash)' },
  fp: { label: '헛경보', color: 'var(--status-serious)', wash: 'var(--status-serious-wash)' },
  watch: { label: '관찰', color: 'var(--status-warning)', wash: 'var(--status-warning-wash)' },
  cleared: { label: '해제', color: 'var(--text-muted)', wash: 'var(--border-soft)' },
}

const FILTERS: { id: Verdict | 'all'; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'tp', label: '탐지' },
  { id: 'fn', label: '놓침' },
  { id: 'fp', label: '헛경보' },
  { id: 'watch', label: '관찰' },
  { id: 'cleared', label: '해제' },
]

type SortKey = 'unit' | 'dangerSince' | 'leadDanger' | 'predEnd'

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const v = VERDICT[verdict]
  return (
    <span
      className="inline-flex flex-row items-center gap-1.5 border px-2.5 py-[3px] text-[11px] font-medium"
      style={{
        background: v.wash,
        color: v.color,
        borderColor: `color-mix(in oklab, ${v.color} 30%, transparent)`,
        borderRadius: 'var(--radius-pill)',
      }}
    >
      <span className="inline-block h-[6px] w-[6px] shrink-0 rounded-full" style={{ background: v.color }} />
      {v.label}
    </span>
  )
}

const cyc = (n: number | null) => (n == null ? '—' : `#${n}`)

function csvOf(rows: LogRow[]) {
  const head = ['엔진', '판정', '주의 시작(cycle)', '위험 시작(cycle)', '선행 시간(cycle)', '일시 위험 경보(회)', '마지막 관측(cycle)', '마지막 예측 RUL', '실제 남은 수명']
  const body = rows.map((r) =>
    [r.unit, VERDICT[r.verdict].label, r.warnSince ?? '', r.dangerSince ?? '', r.leadDanger ?? '', r.transientDanger, r.lastCycle, r.predEnd, r.trueEnd].join(','),
  )
  return '﻿' + [head.join(','), ...body].join('\n')
}

function EngineDetail({ row, curve }: { row: LogRow; curve: Curve | undefined }) {
  const leadWarn = row.warnSince == null ? null : row.trueEnd + (row.lastCycle - row.warnSince)
  const transient = row.transientDanger + row.transientWarn
  const facts: { label: string; value: string }[] = [
    { label: '주의 시작', value: row.warnSince == null ? '—' : `cycle #${row.warnSince} · 고장 ${leadWarn}사이클 전` },
    {
      label: '위험 시작',
      value: row.dangerSince == null ? '—' : `cycle #${row.dangerSince} · 고장 ${row.leadDanger}사이클 전${row.earlyDanger ? ' (기준보다 일찍)' : ''}`,
    },
    {
      label: '일시 경보',
      value: transient === 0 ? '없음' : `위험 ${row.transientDanger}회 · 주의 ${row.transientWarn}회 (켜졌다가 마지막 관측 전에 꺼짐)`,
    },
    { label: '마지막 관측', value: `cycle #${row.lastCycle} · 예측 ${row.predEnd} / 실제 ${row.trueEnd}` },
  ]
  const hasDetail = !!engineDetails[`engine-${row.unit}`]
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.5fr_1fr]">
      <div>
        <div className="mb-2 flex flex-row flex-wrap items-center gap-x-4 gap-y-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          <span className="flex flex-row items-center gap-1.5">
            <span className="inline-block h-[2px] w-4" style={{ background: 'var(--series-1)' }} />
            예측 RUL
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <span className="inline-block w-4 border-t-2 border-dashed" style={{ borderColor: 'var(--text-muted)' }} />
            실제 남은 수명(125에서 자름)
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5" style={{ background: 'color-mix(in oklab, var(--status-critical) 25%, transparent)' }} />
            위험(≤{logSummary.red})
          </span>
          <span className="flex flex-row items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5" style={{ background: 'color-mix(in oklab, var(--status-warning) 22%, transparent)' }} />
            주의(&lt;{logSummary.yellow})
          </span>
        </div>
        <EngineRulChart row={row} curve={curve} />
      </div>
      <div className="flex flex-col gap-3">
        {facts.map((f) => (
          <div key={f.label}>
            <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{f.label}</div>
            <div className="mt-0.5 text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{f.value}</div>
          </div>
        ))}
        {hasDetail && (
          <Link
            to={`/equipment/engine-${row.unit}`}
            className="w-fit border px-3 py-1.5 text-[12.5px] no-underline"
            style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}
          >
            설비 상세 보기 →
          </Link>
        )}
      </div>
    </div>
  )
}

export function Log() {
  const [filter, setFilter] = useState<Verdict | 'all'>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey | null; dir: 1 | -1 }>({ key: null, dir: 1 })
  const [open, setOpen] = useState<number | null>(null)
  const [curves, setCurves] = useState<Curves | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [wrapW, setWrapW] = useState(0)

  // 표가 가로 스크롤될 때도 펼친 상세 영역은 화면에 보이는 폭 안에 머물게 한다
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth))
    ro.observe(el)
    setWrapW(el.clientWidth)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (open == null || curves) return
    import('../data/detectionCurves').then((m) => setCurves(m.detectionCurves))
  }, [open, curves])

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: logRows.length }
    for (const r of logRows) c[r.verdict] = (c[r.verdict] ?? 0) + 1
    return c
  }, [])

  const rows = useMemo(() => {
    const q = query.trim().replace('#', '')
    let list = logRows.filter((r) => (filter === 'all' || r.verdict === filter) && (!q || String(r.unit).includes(q)))
    if (sort.key) {
      const k = sort.key
      list = [...list].sort((a, b) => {
        const av = a[k]
        const bv = b[k]
        if (av == null && bv == null) return 0
        if (av == null) return 1
        if (bv == null) return -1
        return (av - bv) * sort.dir
      })
    }
    return list
  }, [filter, query, sort])

  const fnRows = logRows.filter((r) => r.verdict === 'fn')
  const fnMin = Math.min(...fnRows.map((r) => r.predEnd))
  const fnMax = Math.max(...fnRows.map((r) => r.predEnd))

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? (s.dir === 1 ? { key, dir: -1 } : { key: null, dir: 1 }) : { key, dir: 1 }))

  const download = () => {
    const url = URL.createObjectURL(new Blob([csvOf(rows)], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `탐지이력_${dataMeta.dataset.replace(/\s+/g, '_')}_test.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const th = (label: string, key?: SortKey, wide = false) => (
    <th
      className={`whitespace-nowrap border-b px-3 py-2.5 text-left text-[11.5px] font-semibold ${wide ? 'hidden xl:table-cell' : ''}`}
      style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}
    >
      {key ? (
        <button
          onClick={() => toggleSort(key)}
          className="flex flex-row items-center gap-1"
          style={{ color: sort.key === key ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          {label}
          <span aria-hidden>{sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : ''}</span>
        </button>
      ) : (
        label
      )}
    </th>
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="m-0 text-[22px] font-semibold tracking-[-0.01em]">탐지 이력</h1>
        <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          공식 test {logSummary.engines}대 · 시간축은 엔진별 사이클
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="탐지" value={logSummary.tp} suffix="대" foot={`실제 위험 ${logSummary.tp + logSummary.fn}대 중`} />
        <StatTile label="놓침" value={logSummary.fn} suffix="대" delay={0.05} foot={`마지막 예측 ${fnMin}~${fnMax}, 위험 기준 바로 위`} />
        <StatTile label="헛경보" value={logSummary.fp} suffix="대" delay={0.1} foot="위험 예측, 실제는 아직 여유" />
        <StatTile
          label="경보 선행 시간(중앙값)"
          value={logSummary.leadMedianTp ?? 0}
          suffix="cycle"
          delay={0.15}
          foot={`위험 시작 → 실제 고장 · 범위 ${logSummary.leadMinTp}~${logSummary.leadMaxTp}`}
        />
      </div>

      <motion.div
        className="surface-card flex flex-col border p-6"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-row flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.id
              return (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className="border px-3 py-1.5 text-[12.5px]"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    background: active ? 'var(--accent-dim)' : 'transparent',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  {f.label} <span className="mono" style={{ opacity: 0.7 }}>{counts[f.id] ?? 0}</span>
                </button>
              )
            })}
          </div>
          <div className="flex flex-row items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="엔진 번호"
              inputMode="numeric"
              className="mono w-28 border px-3 py-1.5 text-[12.5px]"
              style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 'var(--radius-pill)' }}
            />
            <button
              onClick={download}
              className="border px-3 py-1.5 text-[12.5px]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}
            >
              CSV 내보내기
            </button>
          </div>
        </div>

        <div ref={wrapRef} className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse xl:min-w-[760px]">
            <thead>
              <tr>
                {th('엔진', 'unit')}
                {th('판정')}
                {th('주의 시작', undefined, true)}
                {th('위험 시작', 'dangerSince')}
                {th('선행 시간', 'leadDanger')}
                {th('일시 경보', undefined, true)}
                {th('마지막 예측', 'predEnd')}
                {th('실제 남은 수명*', undefined, true)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isOpen = open === r.unit
                const cell = { borderBottom: '1px solid var(--border-soft)' }
                const transient = r.transientDanger + r.transientWarn
                return (
                  <Fragment key={r.unit}>
                    <tr
                      onClick={() => setOpen(isOpen ? null : r.unit)}
                      className="cursor-pointer"
                      style={{ background: isOpen ? 'var(--border-soft)' : undefined }}
                    >
                      <td className="mono px-3 py-3 text-[13px] font-medium" style={{ ...cell, color: 'var(--text-primary)' }}>#{r.unit}</td>
                      <td className="px-3 py-3" style={cell}><VerdictBadge verdict={r.verdict} /></td>
                      <td className="mono hidden px-3 py-3 text-[13px] xl:table-cell" style={{ ...cell, color: 'var(--text-secondary)' }}>{cyc(r.warnSince)}</td>
                      <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-secondary)' }}>{cyc(r.dangerSince)}</td>
                      <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>
                        {r.leadDanger == null ? '—' : `${r.leadDanger} cycle`}
                        {r.earlyDanger && <span className="ml-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>일찍</span>}
                      </td>
                      <td className="mono hidden px-3 py-3 text-[13px] xl:table-cell" style={{ ...cell, color: 'var(--text-secondary)' }}>
                        {transient === 0 ? '—' : `${transient}회`}
                      </td>
                      <td className="mono px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>{r.predEnd}</td>
                      <td className="mono hidden px-3 py-3 text-[13px] xl:table-cell" style={{ ...cell, color: 'var(--text-muted)' }}>{r.trueEnd}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td colSpan={8} className="px-3 py-5" style={{ ...cell, background: 'var(--surface-2)' }}>
                          <div className="sticky left-0" style={{ width: wrapW ? wrapW - 24 : undefined }}>
                            <EngineDetail row={r} curve={curves?.[r.unit]} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    조건에 맞는 엔진이 없습니다
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mb-0 mt-4 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          * 평가용 공식 정답(RUL)으로, 현장에서는 알 수 없는 값입니다. 시작 시점은 마지막 관측까지 구간에 계속 머무르기 시작한 사이클이고,
          중간에 구간에 들어갔다가 나온 경우는 일시 경보로 따로 셉니다. 선행 시간은 위험 시작부터 실제 고장까지 남은 사이클입니다.
        </p>
      </motion.div>
    </div>
  )
}

import { useMemo, useState, type ReactNode } from 'react'
import { DemandChart } from '../components/ops/OpsCharts'
import { ModuleChart } from '../components/ops/FleetCharts'
import { StatusChip } from '../components/ops/StatusChip'
import { callApi } from '../lib/api'
import { saveExcel } from '../lib/excel'
import { weeklySheets } from '../lib/exportData'
import { ROLE_LABEL, useAuth } from '../lib/auth'
import { daysText, deadlineText, useFleet } from '../lib/fleet'
import { ACTION_LABEL, usePlan } from '../lib/plan'
import { printLight } from '../lib/print'
import { useSettings } from '../lib/settings'
import { buildWeekly, weeklyPayload, weeklySummary } from '../lib/weekly'

type Remote = { state: 'idle' | 'loading' | 'done' | 'off' | 'error'; text?: string; model?: string }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="avoid-break mt-6">
      <h2 className="m-0 mb-2 border-b pb-1.5 text-[13px] font-semibold tracking-[0.02em]" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

const md = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })
const when = (t: number) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
const th = 'border-b px-2 py-1.5 text-left text-[11px] font-semibold'
const td = 'px-2 py-1.5 align-top text-[12px]'

/** 주간 정비 리포트 — 운영 책임자가 한 주를 돌아보고 부품·인력을 준비하는 데 쓰는 한 장짜리 요약 */
export function Weekly() {
  const fleet = useFleet()
  const plan = usePlan()
  const { settings } = useSettings()
  const { user } = useAuth()
  const [ai, setAi] = useState<Remote>({ state: 'idle' })
  // 화면을 연 시각을 기준으로 7일을 센다
  const [now] = useState(() => Date.now())
  const stats = useMemo(() => buildWeekly(fleet, plan.items, now), [fleet, plan.items, now])
  const summary = weeklySummary(stats)
  const w = stats.flow

  const askAi = async () => {
    setAi({ state: 'loading' })
    const r = await callApi('/api/summary', { kind: 'weekly', stats: weeklyPayload(stats) })
    if (r.ok && typeof r.data?.summary === 'string') setAi({ state: 'done', text: r.data.summary, model: String(r.data.model ?? '') })
    else if (r.status === 503 || r.status === 404) setAi({ state: 'off' })
    else setAi({ state: 'error' })
  }

  const saveXlsx = () => void saveExcel('주간_정비_리포트', weeklySheets(stats, summary, ai.state === 'done' ? (ai.text ?? null) : null, settings))

  const headline =
    stats.fleet.now > 0
      ? `즉시 조치 ${stats.fleet.now}대 · 결재 대기 ${w.pending}건 — 이번 주 정비 요청 ${stats.demand[1]?.n ?? 0}대 도래 예정`
      : `즉시 조치가 필요한 엔진은 없습니다 · 결재 대기 ${w.pending}건`
  const kpis = [
    { k: '결재 요청', v: w.requested },
    { k: '승인', v: w.approved },
    { k: '반려', v: w.rejected },
    { k: '정비 완료', v: w.completed },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-row flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">주간 리포트</h1>
        <div className="flex flex-row flex-wrap gap-2">
          <button onClick={askAi} disabled={ai.state === 'loading'} className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            {ai.state === 'loading' ? 'AI 요약 생성 중…' : 'AI 요약'}
          </button>
          <button onClick={saveXlsx} className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            엑셀로 저장
          </button>
          <button onClick={printLight} className="cta-primary px-4 py-1.5 text-[12.5px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            PDF로 저장
          </button>
        </div>
      </div>

      {ai.state === 'off' && <p className="no-print m-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>AI 요약은 서버 연동이 필요합니다(설정 › 연동). 지금은 아래 기본 요약을 보여 줍니다.</p>}
      {ai.state === 'error' && <p className="no-print m-0 text-[12px]" style={{ color: 'var(--text-muted)' }}>AI 요약을 가져오지 못했습니다. 기본 요약은 그대로 사용할 수 있습니다.</p>}

      <article className="force-light report-sheet mx-auto w-full max-w-[720px] border p-8" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <header className="flex flex-row items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-semibold tracking-[0.08em]" style={{ color: 'var(--accent)' }}>SENTINEL</p>
            <h1 className="m-0 mt-1 text-[22px] font-semibold tracking-[-0.01em]">주간 정비 리포트</h1>
            <p className="m-0 mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {md(stats.since)} ~ {md(stats.until)} · 하루 {settings.cyclesPerDay}회 비행, 정비 준비 {settings.prepDays}일 기준{user ? ` · 출력 ${user.name}(${ROLE_LABEL[user.role]})` : ''}
            </p>
          </div>
          <div className="text-right text-[12px]" style={{ color: 'var(--text-muted)' }}>엔진 {stats.fleet.total}대</div>
        </header>

        <p className="m-0 mt-5 border-l-4 py-1 pl-3 text-[15px] font-semibold leading-snug" style={{ borderColor: stats.fleet.now > 0 ? 'var(--status-critical)' : 'var(--status-good)' }}>
          {headline}
        </p>

        <Section title="요약">
          <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {summary.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
          {ai.state === 'done' && (
            <div className="mt-3 border p-3 text-[12.5px] leading-relaxed" style={{ borderColor: 'var(--accent)', background: 'var(--accent-dim)', borderRadius: 'var(--radius-xs)', color: 'var(--text-primary)' }}>
              <span className="mr-2 text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>AI 요약 · {ai.model}</span>
              {ai.text}
            </div>
          )}
        </Section>

        <Section title="이번 주 결재 현황">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
            {kpis.map((x) => (
              <div key={x.k} className="border px-3 py-2" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-xs)' }}>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{x.k}</div>
                <div className="mono text-[22px] font-semibold leading-tight">{x.v}</div>
              </div>
            ))}
            <div className="border px-3 py-2" style={{ borderColor: 'var(--accent)', borderRadius: 'var(--radius-xs)' }}>
              <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>현재 결재 대기</div>
              <div className="mono text-[22px] font-semibold leading-tight" style={{ color: 'var(--accent)' }}>{w.pending}</div>
            </div>
          </div>
        </Section>

        <Section title="정비 요청 도래 (주별)">
          <DemandChart engines={fleet} plan={plan.items} height={190} />
        </Section>

        <Section title="점검 예상 모듈 (부품·인력 준비용, 추정)">
          <ModuleChart engines={fleet.filter((e) => plan.items[e.unit]?.status !== 'done')} height={190} />
        </Section>

        <Section title="우선 정비 대상 (상위 10대)">
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }}>
                {['엔진', '남은 수명', '요청 기한', '점검 예상 모듈', '상태'].map((h) => (
                  <th key={h} className={th} style={{ borderColor: 'var(--border-strong)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.top.map((e) => (
                <tr key={e.unit} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                  <td className={`${td} mono font-semibold`}>#{e.unit}</td>
                  <td className={td}><span className="mono">{e.pred}</span> cycle <span style={{ color: 'var(--text-muted)' }}>{daysText(e.daysLeft)}</span></td>
                  <td className={td} style={{ color: e.requestIn <= 0 ? 'var(--status-critical)' : undefined }}>{deadlineText(e.requestIn)}</td>
                  <td className={td}>{e.topPart ? e.topPart.label : '뚜렷한 변화 없음'}</td>
                  <td className={td}><StatusChip status={plan.get(e.unit).status} /></td>
                </tr>
              ))}
              {!stats.top.length && (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>조치가 필요한 엔진이 없습니다</td>
                </tr>
              )}
            </tbody>
          </table>
        </Section>

        <Section title="이번 주 결재 이력">
          {stats.events.length ? (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  {['시각', '엔진', '처리', '담당', '내용'].map((h) => (
                    <th key={h} className={th} style={{ borderColor: 'var(--border-strong)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.events.slice(0, 15).map((ev) => (
                  <tr key={`${ev.unit}-${ev.at}`} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td className={`${td} mono whitespace-nowrap`} style={{ color: 'var(--text-muted)' }}>{when(ev.at)}</td>
                    <td className={`${td} mono font-semibold`}>#{ev.unit}</td>
                    <td className={`${td} whitespace-nowrap`} style={{ color: ev.action === 'reject' ? 'var(--status-critical)' : undefined }}>{ACTION_LABEL[ev.action]}</td>
                    <td className={`${td} whitespace-nowrap`}>{ev.by}</td>
                    <td className={td} style={{ color: 'var(--text-secondary)' }}>
                      {ev.date && <span className="mono">{ev.date.slice(5).replace('-', '/')} 정비 · </span>}
                      {ev.note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>이번 주에는 처리된 결재가 없습니다.</p>
          )}
          {stats.events.length > 15 && <p className="mb-0 mt-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{stats.events.length}건 중 최근 15건만 표시합니다.</p>}
        </Section>

        <footer className="mt-6 border-t pt-3 text-[10.5px] leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          남은 수명은 예측값이며 오차가 있습니다. 점검 예상 모듈은 센서가 가장 크게 변한 모듈을 추정한 것이며 고장 원인을 확정하지 않습니다.
        </footer>
      </article>
    </div>
  )
}

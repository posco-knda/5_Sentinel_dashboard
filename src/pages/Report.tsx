import { useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { EngineRulChart } from '../components/EngineRulChart'
import { SurvivalCurveChart } from '../components/SurvivalCurveChart'
import { callApi, notifyState, type SendState } from '../lib/api'
import { saveExcel } from '../lib/excel'
import { engineReportSheets } from '../lib/exportData'
import { NOTABLE_Z, headline, ruleSummary, toPayload } from '../lib/diagnosis'
import { ROLE_LABEL, useAuth } from '../lib/auth'
import { ACTION_LABEL, lastDecision, lastSubmit, usePlan } from '../lib/plan'
import { printLight } from '../lib/print'
import { LEVEL, URGENCY, daysText, deadlineText, limitDate, requestDate, useFleet } from '../lib/fleet'
import { useSettings } from '../lib/settings'
import { useEngineData } from '../lib/useEngine'
import { partMeta } from '../data/partFlowMeta'

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

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-row justify-between gap-4 py-1.5 text-[12.5px]" style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{k}</span>
      <span className="mono text-right font-medium" style={{ color: 'var(--text-primary)' }}>{v}</span>
    </div>
  )
}

function ReportSheet({ unit }: { unit: number }) {
  const { settings } = useSettings()
  const { user } = useAuth()
  const plan = usePlan()
  const data = useEngineData(unit)
  const [ai, setAi] = useState<Remote>({ state: 'idle' })
  const [slack, setSlack] = useState<SendState>({ state: 'idle' })
  const { engine, facts, curve, runs, interval, survival } = data
  if (!engine || !facts) return null
  const summary = ruleSummary(facts)

  const save = printLight
  const saveXlsx = () => void saveExcel(`엔진_진단_리포트_Engine${unit}`, engineReportSheets(facts, engine, plan.get(unit), summary, ai.state === 'done' ? (ai.text ?? null) : null))
  const askAi = async () => {
    setAi({ state: 'loading' })
    const r = await callApi('/api/summary', { facts: toPayload(facts) })
    if (r.ok && typeof r.data?.summary === 'string') setAi({ state: 'done', text: r.data.summary, model: String(r.data.model ?? '') })
    else if (r.status === 503 || r.status === 404) setAi({ state: 'off' })
    else setAi({ state: 'error' })
  }
  const sendSlack = async () => {
    setSlack({ state: 'loading' })
    setSlack(notifyState(await callApi('/api/notify', { facts: toPayload(facts) })))
  }

  const stamp = new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
  const item = plan.get(unit)
  const req = lastSubmit(item)
  const dec = lastDecision(item)
  const when = (t: number) => new Date(t).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  const topParts = [...facts.parts].sort((a, b) => b.score - a.score).slice(0, 3)
  const maxScore = Math.max(...facts.parts.map((p) => p.score), NOTABLE_Z)
  const dayAgo = (c: number | null) => (c == null ? '—' : `${c} cycle (${daysText(c / settings.cyclesPerDay)}) 전`)

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-row flex-wrap items-center justify-between gap-3">
        <Link to={`/equipment/engine-${unit}`} className="back-link flex flex-row items-center gap-1.5 text-[13px] no-underline" style={{ color: 'var(--text-muted)' }}>
          ← 엔진 상세
        </Link>
        <div className="flex flex-row flex-wrap gap-2">
          <button onClick={askAi} disabled={ai.state === 'loading'} className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            {ai.state === 'loading' ? 'AI 요약 생성 중…' : 'AI 요약'}
          </button>
          <button onClick={sendSlack} disabled={slack.state === 'loading'} className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            {slack.state === 'loading' ? '전송 중…' : 'Slack으로 알림'}
          </button>
          <button onClick={saveXlsx} className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            엑셀로 저장
          </button>
          <button onClick={save} className="cta-primary px-4 py-1.5 text-[12.5px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            PDF로 저장
          </button>
        </div>
      </div>

      {(ai.state === 'off' || ai.state === 'error' || slack.state !== 'idle') && (
        <div className="no-print flex flex-col gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {ai.state === 'off' && <span>AI 요약은 서버 연동이 필요합니다(설정 › 연동). 지금은 아래 기본 요약을 보여 줍니다.</span>}
          {ai.state === 'error' && <span>AI 요약을 가져오지 못했습니다. 기본 요약은 그대로 사용할 수 있습니다.</span>}
          {slack.state === 'done' && <span style={{ color: 'var(--status-good)' }}>Slack으로 알림을 보냈습니다.</span>}
          {slack.state === 'off' && <span>Slack 알림은 서버 연동이 필요합니다(설정 › 연동).</span>}
          {slack.state === 'error' && <span>Slack 전송에 실패했습니다{slack.text ? ` — ${slack.text}` : ''}.</span>}
        </div>
      )}

      <article className="force-light report-sheet mx-auto w-full max-w-[680px] border p-8" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <header className="flex flex-row items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-semibold tracking-[0.08em]" style={{ color: 'var(--accent)' }}>SENTINEL</p>
            <h1 className="m-0 mt-1 text-[22px] font-semibold tracking-[-0.01em]">엔진 진단 리포트</h1>
            <p className="m-0 mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>작성 {stamp} · 하루 {settings.cyclesPerDay}회 비행, 정비 준비 {settings.prepDays}일 기준{user ? ` · 출력 ${user.name}(${ROLE_LABEL[user.role]})` : ''}</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[20px] font-semibold">{engine.name}</span>
            <Badge status={LEVEL[engine.level].badge} />
          </div>
        </header>

        <p className="m-0 mt-5 border-l-4 py-1 pl-3 text-[15px] font-semibold leading-snug" style={{ borderColor: LEVEL[engine.level].color }}>
          {headline(facts)}
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

        <Section title="핵심 수치">
          <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            <div>
              <Row k="알림 등급" v={facts.levelLabel} />
              <Row k="긴급도" v={URGENCY[engine.urgency].label} />
              <Row k="예측 남은 수명" v={`${engine.pred} cycle (${daysText(engine.daysLeft)})`} />
              <Row k="90% 구간" v={interval ? `${interval[0]} ~ ${interval[1]} cycle` : '—'} />
            </div>
            <div>
              <Row k="정비 요청 기한" v={engine.requestIn <= 0 ? '기한 지남' : `${deadlineText(engine.requestIn)} · ${requestDate(engine.requestIn)}`} />
              <Row k="가동 한계 예상" v={limitDate(engine.daysLeft)} />
              <Row k="위험 구간 체류" v={dayAgo(facts.dangerAgo)} />
              <Row k="주의 구간 체류" v={dayAgo(facts.warnAgo)} />
            </div>
          </div>
        </Section>

        <Section title="예측 남은 수명 추이">
          {curve ? <EngineRulChart curve={curve} runs={runs} dangerN={settings.dangerN} /> : <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>경보 구간에 들어간 적이 없어 추이 그림을 생략합니다.</p>}
        </Section>

        {survival && interval && (
          <Section title="생존곡선 (앞으로 더 비행해도 아직 고장나지 않을 확률)">
            <SurvivalCurveChart data={survival} predictedRul={{ median: engine.pred, lower: interval[0], upper: interval[1] }} />
          </Section>
        )}

        <Section title="점검 예상 모듈 (센서 변화가 큰 순, 추정)">
          <div className="flex flex-col gap-1.5">
            {topParts.map((p) => (
              <div key={p.id} className="grid grid-cols-[130px_1fr_46px] items-center gap-3 text-[12px]">
                <span style={{ color: facts.topPart?.id === p.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: facts.topPart?.id === p.id ? 600 : 400 }}>{p.label}</span>
                <div className="h-2" style={{ background: 'var(--surface-2)', borderRadius: 2 }}>
                  <div className="h-full" style={{ width: `${Math.min(100, (p.score / maxScore) * 100)}%`, background: p.score >= NOTABLE_Z ? 'var(--status-critical)' : 'var(--text-muted)', borderRadius: 2 }} />
                </div>
                <span className="mono text-right">×{p.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
          {facts.topSensors.length > 0 && (
            <p className="mb-0 mt-2.5 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
              가장 크게 변한 센서: {facts.topSensors.map((s) => `${s.name}(${s.z >= 0 ? '↑' : '↓'}×${Math.abs(s.z).toFixed(1)})`).join(', ')}
            </p>
          )}
        </Section>

        <Section title="결재 이력">
          {item.history.length ? (
            <table className="w-full border-collapse">
              <thead>
                <tr style={{ color: 'var(--text-muted)' }}>
                  {['시각', '처리', '담당', '내용'].map((h) => (
                    <th key={h} className="border-b px-2 py-1.5 text-left text-[11px] font-semibold" style={{ borderColor: 'var(--border-strong)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {item.history.map((ev) => (
                  <tr key={ev.at} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td className="mono whitespace-nowrap px-2 py-1.5 align-top text-[12px]" style={{ color: 'var(--text-muted)' }}>{when(ev.at)}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 align-top text-[12px] font-medium" style={{ color: ev.action === 'reject' ? 'var(--status-critical)' : undefined }}>{ACTION_LABEL[ev.action]}</td>
                    <td className="whitespace-nowrap px-2 py-1.5 align-top text-[12px]">{ev.by}({ROLE_LABEL[ev.role]})</td>
                    <td className="px-2 py-1.5 align-top text-[12px]" style={{ color: 'var(--text-secondary)' }}>
                      {ev.date && <span className="mono">{ev.date.slice(5).replace('-', '/')} 정비 · </span>}
                      {ev.note ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>아직 결재가 올라가지 않았습니다(AI 권고 단계).</p>
          )}
        </Section>

        <Section title="확인">
          <div className="grid grid-cols-3 gap-3 text-[12px]">
            {[
              { role: 'AI 작성', who: ai.state === 'done' ? ai.model || 'AI' : '규칙 기반 요약', at: stamp },
              { role: '정비 담당자 검토', who: req ? req.by : '미검토', at: req ? when(req.at) : '' },
              { role: '운영 책임자 결재', who: dec ? `${dec.by} · ${dec.action === 'approve' ? '승인' : '반려'}` : item.status === 'submitted' ? '결재 대기' : '결재 전', at: dec ? when(dec.at) : '' },
            ].map((b) => (
              <div key={b.role} className="avoid-break border px-3 py-2.5" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-xs)' }}>
                <div style={{ color: 'var(--text-muted)' }}>{b.role}</div>
                <div className="mt-2 text-[13px] font-semibold">{b.who}</div>
                <div className="mono mt-0.5 min-h-[16px] text-[11px]" style={{ color: 'var(--text-muted)' }}>{b.at}</div>
              </div>
            ))}
          </div>
        </Section>

        <footer className="mt-6 border-t pt-3 text-[10.5px] leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          남은 수명은 예측값이며 오차가 있습니다(90% 구간 참고). 점검 모듈은 가장 크게 변한 센서가 속한 모듈을 추정한 것이며 고장 원인을 확정하지 않습니다. 모듈별 ×N은 처음{' '}
          {partMeta.baselineCycles}사이클 대비 최근 {partMeta.recentCycles}사이클 평균 변화가 평소 흔들림의 N배라는 뜻입니다.
        </footer>
      </article>
    </div>
  )
}

export function Report() {
  const { id } = useParams<{ id: string }>()
  const fleet = useFleet()
  const unit = Number((id ?? '').replace('engine-', ''))
  if (!fleet.some((e) => e.unit === unit)) return <Navigate to="/plan" replace />
  return <ReportSheet key={unit} unit={unit} />
}

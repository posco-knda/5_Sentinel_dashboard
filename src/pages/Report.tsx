import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '../components/Badge'
import { EngineRulChart, type Curve } from '../components/EngineRulChart'
import { SurvivalCurveChart } from '../components/SurvivalCurveChart'
import { buildFacts, ruleSummary, toPayload, LEVEL_LABEL, NOTABLE_Z, type DiagnosisFacts } from '../lib/diagnosis'
import { engineDetails, dataMeta, riskThresholds } from '../data/mock'
import { logRows } from '../data/detectionLog'
import { partMeta } from '../data/partFlowMeta'
import type { PartFlow } from '../data/partFlow'

type Remote = { state: 'idle' | 'loading' | 'done' | 'off' | 'error'; text?: string; model?: string }

/** 서버 함수(/api/*)를 부른다. 개발 서버처럼 함수가 없는 곳은 HTML이 돌아오므로 JSON이 아니면 "서버 기능 없음"으로 본다. */
async function callApi(path: string, body: unknown): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const ct = r.headers.get('content-type') ?? ''
    if (!ct.includes('json')) return { ok: false, status: 404, data: null }
    return { ok: r.ok, status: r.status, data: (await r.json()) as Record<string, unknown> }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
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

export function Report() {
  const { id } = useParams<{ id: string }>()
  const unit = Number((id ?? '').split('-')[1])
  const detail = id ? engineDetails[id] : undefined
  const [flow, setFlow] = useState<PartFlow | null>(null)
  const [curve, setCurve] = useState<Curve | undefined>()
  const [ai, setAi] = useState<Remote>({ state: 'idle' })
  const [slack, setSlack] = useState<Remote>({ state: 'idle' })
  const logRow = logRows.find((r) => r.unit === unit)

  useEffect(() => {
    let alive = true
    import('../data/partFlow').then((m) => alive && setFlow(m.partFlow[unit] ?? null))
    if (logRow) import('../data/detectionCurves').then((m) => alive && setCurve(m.detectionCurves[unit]))
    return () => {
      alive = false
    }
  }, [unit, logRow])

  if (!detail || !Number.isFinite(unit)) {
    return (
      <div className="flex flex-col gap-3 py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
        리포트를 만들 수 있는 엔진이 아닙니다.
        <Link to="/dashboard" className="no-underline" style={{ color: 'var(--accent)' }}>모니터링으로 →</Link>
      </div>
    )
  }
  const facts: DiagnosisFacts | null = buildFacts(unit, flow)
  if (!facts) return null
  const summary = ruleSummary(facts)

  const save = () => {
    // 인쇄는 항상 라이트 색상으로 — 다크 테마에서 눌러도 종이에서 읽히도록 잠깐 바꿨다가 되돌린다
    const root = document.documentElement
    const prev = root.getAttribute('data-theme')
    root.setAttribute('data-theme', 'light')
    window.addEventListener('afterprint', () => (prev ? root.setAttribute('data-theme', prev) : root.removeAttribute('data-theme')), { once: true })
    window.print()
  }

  const askAi = async () => {
    setAi({ state: 'loading' })
    const r = await callApi('/api/summary', { facts: toPayload(facts) })
    if (r.ok && typeof r.data?.summary === 'string') setAi({ state: 'done', text: r.data.summary, model: String(r.data.model ?? '') })
    else if (r.status === 503 || r.status === 404) setAi({ state: 'off' })
    else setAi({ state: 'error' })
  }

  const sendSlack = async () => {
    setSlack({ state: 'loading' })
    const r = await callApi('/api/notify', { facts: toPayload(facts) })
    if (r.ok) setSlack({ state: 'done' })
    else if (r.status === 503 || r.status === 404) setSlack({ state: 'off' })
    else setSlack({ state: 'error', text: r.status === 429 ? '잠시 후 다시 시도해 주세요' : undefined })
  }

  const iv = facts.interval
  const stamp = new Date().toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
  const maxScore = Math.max(...facts.parts.map((p) => p.score), NOTABLE_Z)

  return (
    <div className="flex flex-col gap-4">
      <div className="no-print flex flex-row flex-wrap items-center justify-between gap-3">
        <Link to={`/equipment/${id}?tab=diagnosis`} className="back-link flex flex-row items-center gap-1.5 text-[13px] no-underline" style={{ color: 'var(--text-muted)' }}>
          ← 고장 진단으로
        </Link>
        <div className="flex flex-row flex-wrap gap-2">
          <button onClick={askAi} disabled={ai.state === 'loading'} className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            {ai.state === 'loading' ? 'AI 요약 생성 중…' : 'AI 요약 생성'}
          </button>
          <button onClick={sendSlack} disabled={slack.state === 'loading'} className="border px-3.5 py-1.5 text-[12.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            {slack.state === 'loading' ? '전송 중…' : 'Slack으로 알림 (시연)'}
          </button>
          <button onClick={save} className="cta-primary px-4 py-1.5 text-[12.5px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            PDF로 저장
          </button>
        </div>
      </div>

      {(ai.state === 'off' || ai.state === 'error' || slack.state !== 'idle') && (
        <div className="no-print flex flex-col gap-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {ai.state === 'off' && <span>AI 요약은 배포 환경에서 서버 함수와 API 키(ANTHROPIC_API_KEY)를 설정하면 쓸 수 있습니다. 지금은 아래 규칙 기반 요약을 보여 줍니다.</span>}
          {ai.state === 'error' && <span>AI 요약을 가져오지 못했습니다. 규칙 기반 요약은 그대로 사용할 수 있습니다.</span>}
          {slack.state === 'done' && <span style={{ color: 'var(--status-good)' }}>Slack으로 알림을 보냈습니다.</span>}
          {slack.state === 'off' && <span>Slack 알림은 서버 함수와 SLACK_WEBHOOK_URL 환경변수를 설정하면 쓸 수 있습니다.</span>}
          {slack.state === 'error' && <span>Slack 전송에 실패했습니다{slack.text ? ` — ${slack.text}` : ''}.</span>}
        </div>
      )}

      <article className="force-light report-sheet mx-auto w-full max-w-[680px] border p-8" style={{ background: 'var(--surface-1)', color: 'var(--text-primary)', borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}>
        <header className="flex flex-row items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[11px] font-semibold tracking-[0.08em]" style={{ color: 'var(--accent)' }}>SENTINEL · 5조 감시자들</p>
            <h1 className="m-0 mt-1 text-[22px] font-semibold tracking-[-0.01em]">엔진 진단 리포트</h1>
            <p className="m-0 mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {dataMeta.dataset}({dataMeta.datasetDescription}) · 시뮬레이션 데이터 · 작성 {stamp}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="text-[20px] font-semibold">{facts.name}</span>
            <Badge status={detail.status} />
          </div>
        </header>

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
              <Row k="등급" v={facts.levelLabel} />
              <Row k="예측 남은 수명" v={iv ? `${iv.median} cycle` : `${facts.predRul} cycle`} />
              <Row k="90% 구간" v={iv ? `${iv.lower} ~ ${iv.upper} cycle` : '—'} />
              <Row k="누적 사이클" v={facts.cycles != null ? `${facts.cycles} cycle` : '—'} />
            </div>
            <div>
              <Row k="주의 시작" v={facts.warnSince != null ? `cycle #${facts.warnSince}` : '—'} />
              <Row k="위험 시작" v={facts.dangerSince != null ? `cycle #${facts.dangerSince}` : '—'} />
              <Row k="위험 시작 시 고장까지*" v={facts.leadDanger != null ? `${facts.leadDanger} cycle` : '—'} />
              <Row k="일시 경보" v={facts.transientDanger + facts.transientWarn === 0 ? '없음' : `위험 ${facts.transientDanger} · 주의 ${facts.transientWarn}회`} />
            </div>
          </div>
        </Section>

        <Section title="예측 남은 수명 추이">
          {logRow ? (
            <EngineRulChart row={logRow} curve={curve} />
          ) : (
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>경보 구간(&lt;{riskThresholds.warningRul})에 들어간 적이 없어 추이 그림을 생략합니다.</p>
          )}
        </Section>

        <Section title="생존곡선 (앞으로 더 가동될 때 아직 고장나지 않을 확률)">
          <SurvivalCurveChart data={detail.survivalCurve} predictedRul={detail.predictedRulCycle} />
        </Section>

        <Section title="부품별 센서 이탈도">
          <div className="flex flex-col gap-1.5">
            {facts.parts.map((p) => (
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

        <Section title="권고 조치">
          <p className="m-0 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <b style={{ color: facts.level === 'red' ? 'var(--status-critical)' : facts.level === 'warn' ? 'var(--status-warning)' : 'var(--status-good)' }}>{LEVEL_LABEL[facts.level]}</b>
            {' — '}
            {summary[summary.length - 1].replace(/^권고: /, '')}
          </p>
        </Section>

        <footer className="mt-6 border-t pt-3 text-[10.5px] leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
          * 고장까지 남은 사이클은 평가용 공식 정답(RUL)으로 계산한 값이며 현장에서는 알 수 없습니다. 부품은 가장 크게 변한 센서가 속한 부품을 추정한 것이며 고장 원인을
          판정한 것이 아닙니다(FD004에는 엔진별 고장 모드 정답이 없음). 이탈도 ×N은 처음 {partMeta.baselineCycles}사이클 대비 최근 {partMeta.recentCycles}사이클 평균 변화가 평소 흔들림의 N배라는
          뜻입니다. NASA C-MAPSS 시뮬레이션 데이터이며 실제 항공기 판정이 아닙니다. 분석 결과 생성 {dataMeta.generatedAt.slice(0, 16).replace('T', ' ')}.
        </footer>
      </article>
    </div>
  )
}

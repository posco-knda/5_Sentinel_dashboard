import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Panel } from '../components/Panel'
import { analysisExtras } from '../data/analysisExtras'
import { daysText, useFleet } from '../lib/fleet'
import { usePlan } from '../lib/plan'
import { resetUrgentBaseline } from '../lib/autoAlert'
import { DEFAULT_SETTINGS, LIMITS, useSettings } from '../lib/settings'

interface SweepRow {
  n: number
  tp: number
  fn: number
  fp: number
  cost15: number
  fail: number
}
const policy = analysisExtras.policy as unknown as { gruSweep: SweepRow[]; testN: { danger: number; safe: number } }
const gruMae = (analysisExtras.models as unknown as { name: string; testMae: number }[]).find((m) => m.name.startsWith('GRU'))?.testMae ?? 0

const row = (n: number) => policy.gruSweep.find((r) => r.n === n) ?? policy.gruSweep[0]
const base = row(DEFAULT_SETTINGS.dangerN)

/** 이 민감도에서 기대되는 효과 — 과거 검증 결과 기준 */
function effect(n: number) {
  const r = row(n)
  return {
    catchRate: (r.tp / (r.tp + r.fn)) * 100,
    falsePer100: (r.fp / policy.testN.safe) * 100,
    failure: r.fail * 100,
    cost: (r.cost15 / base.cost15 - 1) * 100,
  }
}

const PRESETS = [
  { n: 40, name: '표준', desc: '불필요한 점검을 가장 적게' },
  { n: 42, name: '민감', desc: '놓침을 줄이고 점검은 조금 늘림' },
  { n: 46, name: '매우 민감', desc: '놓침을 최소로, 점검 증가 감수' },
]

function Slider({ label, hint, value, onChange, min, max, format }: { label: string; hint: string; value: number; onChange: (v: number) => void; min: number; max: number; format: (v: number) => string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
        <span className="mono text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{format(value)}</span>
      </div>
      <input type="range" className="range-input" min={min} max={max} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} />
      <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>
    </div>
  )
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="mono text-[14px] font-semibold" style={{ color: tone ?? 'var(--text-primary)' }}>{value}</span>
    </div>
  )
}

type Link = { state: 'checking' | 'ok' | 'dev'; slack: boolean; ai: boolean; provider?: string }

function Status({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex flex-row items-center gap-1.5 text-[12.5px] font-medium" style={{ color: on ? 'var(--status-good)' : 'var(--text-muted)' }}>
      <span className="h-2 w-2 rounded-full" style={{ background: on ? 'var(--status-good)' : 'var(--border-strong)' }} />
      {label}
    </span>
  )
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-6 w-11 shrink-0 border"
      style={{ background: on ? 'var(--accent)' : 'var(--surface-2)', borderColor: on ? 'var(--accent)' : 'var(--border-strong)', borderRadius: 999, transition: 'background .15s' }}
    >
      <span className="absolute top-0.5 h-[18px] w-[18px] rounded-full" style={{ left: on ? 22 : 2, background: on ? 'var(--accent-ink)' : 'var(--text-muted)', transition: 'left .15s' }} />
    </button>
  )
}

function Row({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between" style={{ borderBottom: '1px solid var(--border-soft)' }}>
      <div>
        <div className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{title}</div>
        <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{desc}</div>
      </div>
      {children}
    </div>
  )
}

export function Settings() {
  const { settings, update, reset } = useSettings()
  const plan = usePlan()
  const fleet = useFleet()
  const [link, setLink] = useState<Link>({ state: 'checking', slack: false, ai: false })

  // 서버 기능(/api/status)이 있는 배포 환경인지, 있다면 무엇이 연결돼 있는지 확인한다
  const probe = (): Promise<Link> =>
    fetch('/api/status')
      .then(async (r) => {
        if (!(r.headers.get('content-type') ?? '').includes('json')) throw new Error('no-api')
        const d = (await r.json()) as { slack?: boolean; ai?: boolean; aiProvider?: string }
        return { state: 'ok', slack: !!d.slack, ai: !!d.ai, provider: d.aiProvider } as Link
      })
      .catch((): Link => ({ state: 'dev', slack: false, ai: false }))

  useEffect(() => {
    let alive = true
    probe().then((l) => alive && setLink(l))
    return () => {
      alive = false
    }
  }, [])
  const check = () => {
    setLink((l) => ({ ...l, state: 'checking' }))
    probe().then(setLink)
  }

  const eff = effect(settings.dangerN)
  const redCount = useMemo(() => fleet.filter((e) => e.level === 'red').length, [fleet])
  const doneCount = Object.values(plan.items).filter((i) => i.status === 'done').length
  const marked = Object.keys(plan.items).length

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[24px] font-semibold tracking-[-0.01em]">설정</h1>
        <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>이 기준에 따라 모든 화면의 등급과 정비 요청 기한이 다시 계산됩니다. 설정은 이 브라우저에 저장됩니다.</p>
      </div>

      <Panel title="알림 민감도" sub="예측 남은 수명이 몇 cycle 이하이면 '위험'으로 알릴지 정합니다. 높일수록 놓칠 위험은 줄고 불필요한 점검은 늘어납니다.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRESETS.map((p) => {
            const active = settings.dangerN === p.n
            const e = effect(p.n)
            return (
              <button
                key={p.n}
                onClick={() => update({ dangerN: p.n })}
                className="flex flex-col gap-2 border p-4 text-left"
                style={{ background: active ? 'var(--accent-dim)' : 'var(--page)', borderColor: active ? 'var(--accent)' : 'var(--border)', borderRadius: 'var(--radius-sm)' }}
              >
                <div className="flex flex-row items-center justify-between">
                  <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{p.name}</span>
                  <span className="mono text-[12px]" style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}>≤ {p.n} cycle</span>
                </div>
                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>{p.desc}</span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Metric label="위험 엔진 포착" value={`${e.catchRate.toFixed(0)}%`} />
                  <Metric label="안전 엔진 오경보" value={`${e.falsePer100.toFixed(1)}%`} />
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex flex-col gap-4 border-t pt-4" style={{ borderColor: 'var(--border-soft)' }}>
          <Slider
            label="직접 지정"
            hint="예측 남은 수명이 이 값 이하이면 위험"
            value={settings.dangerN}
            onChange={(v) => update({ dangerN: v })}
            min={LIMITS.dangerN[0]}
            max={LIMITS.dangerN[1]}
            format={(v) => `≤ ${v} cycle`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="위험 엔진 포착률" value={`${eff.catchRate.toFixed(0)}%`} />
            <Metric label="안전 엔진 오경보율" value={`${eff.falsePer100.toFixed(1)}%`} />
            <Metric label="정비 전 고장 확률" value={`${eff.failure.toFixed(2)}%`} />
            <Metric label="정비 비용(표준 대비)" value={`${eff.cost >= 0 ? '+' : ''}${eff.cost.toFixed(1)}%`} tone={eff.cost > 3 ? 'var(--status-warning)' : undefined} />
          </div>
          <p className="m-0 text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            지금 플릿에서는 <b style={{ color: 'var(--text-primary)' }}>{redCount}대</b>가 위험으로 분류됩니다. 위 효과는 과거 검증 데이터(위험 {policy.testN.danger}대·안전 {policy.testN.safe}대) 기준 추정이며, 정비 전 고장·비용은 정비 준비 7일 등을 가정한 값입니다.
          </p>
        </div>
      </Panel>

      <Panel title="운항·정비 기준" sub="남은 수명(cycle)을 일 단위로 바꾸고 정비 요청 기한을 정하는 데 씁니다.">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Slider
            label="엔진당 하루 비행 횟수"
            hint={`남은 수명 40 cycle ≈ ${daysText(40 / settings.cyclesPerDay)}`}
            value={settings.cyclesPerDay}
            onChange={(v) => update({ cyclesPerDay: v })}
            min={LIMITS.cyclesPerDay[0]}
            max={LIMITS.cyclesPerDay[1]}
            format={(v) => `${v}회/일`}
          />
          <Slider
            label="정비 준비 기간"
            hint="정비를 요청한 뒤 부품·인력이 갖춰지기까지 걸리는 기간"
            value={settings.prepDays}
            onChange={(v) => update({ prepDays: v })}
            min={LIMITS.prepDays[0]}
            max={LIMITS.prepDays[1]}
            format={(v) => `${v}일`}
          />
        </div>
      </Panel>

      <Panel
        title="연동"
        sub="알림과 AI 요약은 서버 기능입니다. 배포 환경의 환경변수가 설정돼 있으면 연결됩니다."
        action={
          <button onClick={check} className="border px-3 py-1.5 text-[12px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            상태 확인
          </button>
        }
      >
        <Row title="Slack 알림" desc="엔진 진단을 Slack 채널로 보냅니다 · SLACK_WEBHOOK_URL">
          {link.state === 'checking' ? <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>확인 중…</span> : <Status on={link.slack} label={link.slack ? '연결됨' : link.state === 'dev' ? '서버 기능 없음 (개발 모드)' : '미연결'} />}
        </Row>
        <Row title="AI 요약" desc="리포트의 요약을 생성형 AI로 다시 씁니다 · GEMINI_API_KEY(무료 한도 있음) 또는 ANTHROPIC_API_KEY">
          {link.state === 'checking' ? <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>확인 중…</span> : <Status on={link.ai} label={link.ai ? `연결됨${link.provider === 'gemini' ? ' · Gemini' : link.provider === 'claude' ? ' · Claude' : ''}` : link.state === 'dev' ? '서버 기능 없음 (개발 모드)' : '미연결'} />}
        </Row>
      </Panel>

      <Panel title="자동 알림" sub="Slack이 연결돼 있으면 아래 상황에서 사람이 누르지 않아도 알림이 갑니다.">
        <Row title="결재 알림" desc="결재 요청, 승인, 반려, 정비 완료가 처리될 때 채널로 알립니다">
          <Switch on={settings.notifyWorkflow} onChange={(v) => update({ notifyWorkflow: v })} label="결재 알림" />
        </Row>
        <Row title="신규 즉시 조치 알림" desc="엔진이 새로 '즉시 조치'가 되면 한 건으로 묶어 알립니다. 이미 알린 엔진은 다시 보내지 않습니다">
          <Switch on={settings.notifyUrgent} onChange={(v) => update({ notifyUrgent: v })} label="신규 즉시 조치 알림" />
        </Row>
      </Panel>

      <Panel title="예측 정보">
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <li>엔진의 센서 15개를 시계열 신경망(GRU)에 넣어 남은 수명(cycle)을 예측합니다. 비행 후 데이터가 들어올 때마다 갱신됩니다.</li>
          <li>
            예측의 평균 오차는 약 {gruMae.toFixed(0)} cycle({daysText(gruMae / settings.cyclesPerDay)})입니다. 그래서 날짜 하나가 아니라 90% 구간을 함께 보여 줍니다.
          </li>
          <li>센서 변화로 가리키는 점검 모듈은 가장 크게 변한 센서가 속한 모듈을 추정한 것이며, 고장 원인을 확정하지 않습니다.</li>
        </ul>
      </Panel>

      <Panel title="데이터 관리">
        <Row title="결재·처리 기록 초기화" desc={`검토·결재·정비 이력이 있는 엔진 ${marked}대 (완료 ${doneCount}대)`}>
          <button
            onClick={() => window.confirm('결재 요청·승인 이력을 포함한 모든 처리 기록을 지울까요? 되돌릴 수 없습니다.') && plan.clearAll()}
            disabled={!marked}
            className="border px-3 py-1.5 text-[12px] font-medium"
            style={{ borderColor: 'var(--border)', color: marked ? 'var(--status-critical)' : 'var(--text-muted)', borderRadius: 'var(--radius-pill)', opacity: marked ? 1 : 0.6 }}
          >
            기록 지우기
          </button>
        </Row>
        <Row title="알림 기준 다시 잡기" desc="지금 '즉시 조치'인 엔진을 모두 이미 알린 것으로 보고 새로 시작합니다">
          <button onClick={resetUrgentBaseline} className="border px-3 py-1.5 text-[12px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            다시 잡기
          </button>
        </Row>
        <Row title="설정 기본값으로" desc={`민감도 ≤${DEFAULT_SETTINGS.dangerN} · 하루 ${DEFAULT_SETTINGS.cyclesPerDay}회 · 준비 ${DEFAULT_SETTINGS.prepDays}일`}>
          <button onClick={reset} className="border px-3 py-1.5 text-[12px] font-medium" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            초기화
          </button>
        </Row>
      </Panel>
    </div>
  )
}

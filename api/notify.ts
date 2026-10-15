// Vercel 서버리스 함수 — 알림을 Slack 채널로 보낸다 (Incoming Webhook).
//  · 엔진 진단(수동 버튼):        { facts }
//  · 결재 이벤트(자동):            { kind: 'workflow', event }   — 결재 요청·승인·반려·정비 완료
//  · 신규 즉시 조치(자동):         { kind: 'digest', digest }    — 새로 즉시 조치가 된 엔진 묶음
// 환경변수 SLACK_WEBHOOK_URL(정비 알림 채널)이 있어야 동작하고, SLACK_APPROVAL_WEBHOOK_URL(결재 알림 채널)를 따로 두면 결재 알림은 그쪽으로 간다. 주소는 서버에만 있고 브라우저로 나가지 않는다.
// 메시지는 서버가 검증한 필드로만 조립한다(임의 텍스트·전체 멘션이 끼어들 수 없게 이스케이프·길이 제한).
// 키가 없으면 503 { error: 'not_configured' }.

interface Req {
  method?: string
  body?: unknown
  headers: Record<string, string | string[] | undefined>
}
interface Res {
  status(code: number): Res
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

const LEVELS: Record<string, string> = { red: '위험', warn: '주의', ok: '정상' }
// 같은 인스턴스에서 같은 종류를 연달아 보내는 것을 막는 최소 안전장치(서버리스라 완전하지는 않다)
const COOLDOWN_MS: Record<string, number> = { engine: 3000, workflow: 1200, digest: 8000 }
const lastSent: Record<string, number> = {}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
/** Slack mrkdwn에서 특수 의미를 갖는 & < > 를 이스케이프하고 길이를 자른다 */
const esc = (v: unknown, max = 80): string =>
  String(v ?? '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .slice(0, max)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
const field = (label: string, value: string) => ({ type: 'mrkdwn', text: `*${label}*\n${value}` })
const CONTEXT = { type: 'context', elements: [{ type: 'mrkdwn', text: 'Sentinel 정비 관리 · 남은 수명은 예측값이며 오차가 있습니다' }] }

function origin(req: Req): string | null {
  const h = req.headers['x-forwarded-host'] ?? req.headers.host
  const host = Array.isArray(h) ? h[0] : h
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return null
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host)
  return `${local ? 'http' : 'https'}://${host}`
}

interface Built {
  title: string
  blocks: unknown[]
}

/** 엔진 진단 알림 (수동 버튼) */
function buildEngine(f: Record<string, unknown>, base: string | null): Built | null {
  const unit = num(f.unit)
  if (unit == null || !Number.isInteger(unit) || unit < 1 || unit > 100000 || typeof f.level !== 'string' || !(f.level in LEVELS)) return null
  const level = LEVELS[f.level]
  const pred = num(f.predRul)
  const dangerAgo = num(f.dangerAgo)
  const part = typeof f.topPart === 'string' ? esc(f.topPart, 40) : null
  const sensor = isObj(f.topSensor) && typeof f.topSensor.name === 'string' ? esc(f.topSensor.name, 60) : null
  const fields = [
    field('등급', `${level}${typeof f.urgencyLabel === 'string' ? ` · ${esc(f.urgencyLabel, 12)}` : ''}`),
    field('예측 남은 수명', `${pred == null ? '—' : `${pred} cycle`}${typeof f.daysText === 'string' ? ` (${esc(f.daysText, 16)})` : ''}`),
    field('정비 요청 기한', typeof f.requestText === 'string' ? esc(f.requestText, 16) : '—'),
    field('점검 예상 모듈(추정)', `${part ?? '뚜렷한 변화 없음'}${sensor ? `\n${sensor}` : ''}`),
  ]
  if (dangerAgo != null) fields.push(field('위험 구간 체류', `${dangerAgo} cycle 전부터`))
  const title = `Engine #${unit} ${level} 감지`
  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: title } },
    { type: 'section', fields },
    { type: 'section', text: { type: 'mrkdwn', text: `*권고*  ${esc(f.action, 260)}` } },
    CONTEXT,
  ]
  if (base) blocks.push({ type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: '고장 진단 열기' }, url: `${base}/equipment/engine-${unit}?tab=diagnosis` }] })
  return { title, blocks }
}

const WORKFLOW = {
  submit: { label: '결재 요청', who: '요청자', noteLabel: '판단 사유', button: '결재함 열기', path: () => '/approvals' },
  approve: { label: '승인', who: '승인자', noteLabel: '의견', button: '엔진 이력 열기', path: (u: number) => `/equipment/engine-${u}?tab=history` },
  reject: { label: '반려', who: '반려자', noteLabel: '반려 사유', button: '엔진 이력 열기', path: (u: number) => `/equipment/engine-${u}?tab=history` },
  complete: { label: '정비 완료', who: '처리자', noteLabel: '메모', button: '엔진 이력 열기', path: (u: number) => `/equipment/engine-${u}?tab=history` },
} as const
const ROLES: Record<string, string> = { planner: '정비 담당자', manager: '운영 책임자' }
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** 결재 이벤트 알림 (자동) */
function buildWorkflow(e: Record<string, unknown>, base: string | null): Built | null {
  const unit = num(e.unit)
  if (unit == null || !Number.isInteger(unit) || unit < 1 || unit > 100000) return null
  if (typeof e.action !== 'string' || !(e.action in WORKFLOW)) return null
  const w = WORKFLOW[e.action as keyof typeof WORKFLOW]
  if (typeof e.by !== 'string' || !e.by.trim()) return null
  const pred = num(e.pred)
  const role = typeof e.role === 'string' && e.role in ROLES ? ROLES[e.role] : null
  const date = typeof e.date === 'string' && DATE.test(e.date) ? e.date.slice(5).replace('-', '/') : null
  const note = typeof e.note === 'string' && e.note.trim() ? esc(e.note, 300) : null

  const title = `${w.label} · Engine #${unit}`
  const fields = [field(w.who, `${esc(e.by, 20)}${role ? ` (${role})` : ''}`)]
  if (date) fields.push(field(e.action === 'submit' ? '희망 정비일' : '정비일', date))
  if (pred != null) fields.push(field('예측 남은 수명', `${pred} cycle${typeof e.requestText === 'string' ? ` · 기한 ${esc(e.requestText, 16)}` : ''}`))
  if (typeof e.part === 'string' && e.part) fields.push(field('점검 예상 모듈(추정)', esc(e.part, 40)))
  const blocks: unknown[] = [{ type: 'header', text: { type: 'plain_text', text: title } }, { type: 'section', fields }]
  if (note) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*${w.noteLabel}*  ${note}` } })
  blocks.push(CONTEXT)
  if (base) blocks.push({ type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: w.button }, url: `${base}${w.path(unit)}` }] })
  return { title, blocks }
}

/** 새로 즉시 조치가 된 엔진 묶음 알림 (자동) */
function buildDigest(d: Record<string, unknown>, base: string | null): Built | null {
  const count = num(d.count)
  if (count == null || !Number.isInteger(count) || count < 1 || count > 100000 || !Array.isArray(d.engines)) return null
  const engines = d.engines.slice(0, 8).filter(isObj)
  const lines = engines.map((e) => {
    const pred = num(e.predCycles)
    return `• *${esc(e.name, 30)}*  ${pred == null ? '' : `${pred} cycle · `}${esc(e.requestText, 16)}${typeof e.part === 'string' && e.part ? ` · ${esc(e.part, 30)}(추정)` : ''}`
  })
  if (count > engines.length) lines.push(`… 외 ${count - engines.length}대`)
  const title = `신규 즉시 조치 ${count}대`
  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: title } },
    { type: 'section', text: { type: 'mrkdwn', text: lines.join('\n') || '—' } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '정비 요청 기한이 지났거나 오늘까지인 엔진입니다 · Sentinel 정비 관리' }] },
  ]
  if (base) blocks.push({ type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: '정비 계획 열기' }, url: `${base}/plan` }] })
  return { title, blocks }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const body = isObj(req.body) ? req.body : {}
  const kind = body.kind === 'workflow' ? 'workflow' : body.kind === 'digest' ? 'digest' : 'engine'
  // 채널을 나눈다: 결재 흐름(요청·승인·반려·정비 완료)은 결재 알림 채널로, 엔진 상태(위험 감지·신규 즉시 조치)는 정비 알림 채널로.
  // 결재용 웹훅이 없으면 정비 알림 채널로 함께 보낸다.
  const hook = kind === 'workflow' ? process.env.SLACK_APPROVAL_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL : process.env.SLACK_WEBHOOK_URL
  if (!hook) return res.status(503).json({ error: 'not_configured' })
  const base = origin(req)
  const src = kind === 'workflow' ? body.event : kind === 'digest' ? body.digest : body.facts
  const built = isObj(src) ? (kind === 'workflow' ? buildWorkflow(src, base) : kind === 'digest' ? buildDigest(src, base) : buildEngine(src, base)) : null
  if (!built) return res.status(400).json({ error: 'bad_request' })

  const now = Date.now()
  if (now - (lastSent[kind] ?? 0) < COOLDOWN_MS[kind]) return res.status(429).json({ error: 'too_many_requests' })
  lastSent[kind] = now

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(hook, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: built.title, blocks: built.blocks }),
    })
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status })
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(504).json({ error: 'timeout_or_network' })
  } finally {
    clearTimeout(timer)
  }
}

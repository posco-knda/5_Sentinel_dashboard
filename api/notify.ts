// Vercel 서버리스 함수 — 엔진 진단 알림을 Slack 채널로 보낸다 (Incoming Webhook).
// 환경변수 SLACK_WEBHOOK_URL 이 있어야 동작한다. 주소는 서버에만 있고 브라우저로 나가지 않는다.
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
const COOLDOWN_MS = 3000 // 같은 인스턴스에서 연달아 보내는 것을 막는 최소 안전장치(서버리스라 완전하지는 않다)
let lastSent = 0

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

function origin(req: Req): string | null {
  const h = req.headers['x-forwarded-host'] ?? req.headers.host
  const host = Array.isArray(h) ? h[0] : h
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return null
  const local = /^(localhost|127\.0\.0\.1)(:|$)/.test(host)
  return `${local ? 'http' : 'https'}://${host}`
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const hook = process.env.SLACK_WEBHOOK_URL
  if (!hook) return res.status(503).json({ error: 'not_configured' })

  const f = isObj(req.body) ? req.body.facts : undefined
  const unit = isObj(f) ? num(f.unit) : null
  if (!isObj(f) || unit == null || !Number.isInteger(unit) || unit < 1 || unit > 100000 || typeof f.level !== 'string' || !(f.level in LEVELS)) {
    return res.status(400).json({ error: 'bad_request' })
  }

  const now = Date.now()
  if (now - lastSent < COOLDOWN_MS) return res.status(429).json({ error: 'too_many_requests' })
  lastSent = now

  const level = LEVELS[f.level]
  const pred = num(f.predRul)
  const dangerAgo = num(f.dangerAgo)
  const base = origin(req)
  const link = base ? `${base}/equipment/engine-${unit}?tab=diagnosis` : null
  const part = typeof f.topPart === 'string' ? esc(f.topPart, 40) : null
  const sensor = isObj(f.topSensor) && typeof f.topSensor.name === 'string' ? esc(f.topSensor.name, 60) : null

  const fields = [
    { type: 'mrkdwn', text: `*등급*\n${level}${typeof f.urgencyLabel === 'string' ? ` · ${esc(f.urgencyLabel, 12)}` : ''}` },
    { type: 'mrkdwn', text: `*예측 남은 수명*\n${pred == null ? '—' : `${pred} cycle`}${typeof f.daysText === 'string' ? ` (${esc(f.daysText, 16)})` : ''}` },
    { type: 'mrkdwn', text: `*정비 요청 기한*\n${typeof f.requestText === 'string' ? esc(f.requestText, 16) : '—'}` },
    { type: 'mrkdwn', text: `*점검 예상 모듈(추정)*\n${part ?? '뚜렷한 변화 없음'}${sensor ? `\n${sensor}` : ''}` },
  ]
  if (dangerAgo != null) fields.push({ type: 'mrkdwn', text: `*위험 구간 체류*\n${dangerAgo} cycle 전부터` })

  const blocks: unknown[] = [
    { type: 'header', text: { type: 'plain_text', text: `Engine #${unit} ${level} 감지` } },
    { type: 'section', fields },
    { type: 'section', text: { type: 'mrkdwn', text: `*권고*  ${esc(f.action, 260)}` } },
    { type: 'context', elements: [{ type: 'mrkdwn', text: 'Sentinel 정비 관리 · 남은 수명은 예측값이며 오차가 있습니다' }] },
  ]
  if (link) blocks.push({ type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: '고장 진단 열기' }, url: link }] })

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const r = await fetch(hook, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: `Engine #${unit} ${level} 감지`, blocks }),
    })
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status })
    return res.status(200).json({ ok: true })
  } catch {
    return res.status(504).json({ error: 'timeout_or_network' })
  } finally {
    clearTimeout(timer)
  }
}

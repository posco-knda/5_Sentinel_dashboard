// Vercel 서버리스 함수 — 진단 사실(JSON)을 받아 Claude로 짧은 한국어 요약을 만든다.
// 환경변수 ANTHROPIC_API_KEY 가 있어야 동작한다. 키는 서버에만 있고 브라우저로 나가지 않는다.
// 키가 없으면 503 { error: 'not_configured' } — 화면은 규칙 기반 요약을 그대로 보여 준다.

interface Req {
  method?: string
  body?: unknown
}
interface Res {
  status(code: number): Res
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001'
const MAX_BODY_CHARS = 4000

const SYSTEM = [
  '당신은 항공 엔진 예지보전 대시보드의 요약 작성기입니다.',
  '아래 JSON에 있는 사실만 사용해 정비 담당자가 읽을 한국어 요약을 3~4문장으로 씁니다.',
  '규칙: 새로운 숫자·원인·고장 모드를 만들지 않습니다. 부품은 반드시 "추정"이라고 표현합니다.',
  '규칙: 데이터는 NASA C-MAPSS 시뮬레이션이므로 실제 항공기 판정이 아님을 한 번 밝힙니다.',
  '규칙: 마크다운·목록·이모지를 쓰지 않고 평문으로만 씁니다.',
].join('\n')

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'method_not_allowed' })
  }
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return res.status(503).json({ error: 'not_configured' })

  const facts = isObj(req.body) ? req.body.facts : undefined
  if (!isObj(facts) || typeof facts.name !== 'string' || typeof facts.levelLabel !== 'string') {
    return res.status(400).json({ error: 'bad_request' })
  }
  const text = JSON.stringify(facts)
  if (text.length > MAX_BODY_CHARS) return res.status(413).json({ error: 'too_large' })

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 15000)
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        temperature: 0.2,
        system: SYSTEM,
        messages: [{ role: 'user', content: `진단 사실(JSON):\n${text}` }],
      }),
    })
    if (!r.ok) return res.status(502).json({ error: 'upstream', status: r.status })
    const data = (await r.json()) as { content?: { type: string; text?: string }[] }
    const summary = (data.content ?? [])
      .filter((c) => c.type === 'text' && c.text)
      .map((c) => c.text)
      .join('')
      .trim()
    if (!summary) return res.status(502).json({ error: 'empty' })
    return res.status(200).json({ summary, model: MODEL })
  } catch {
    return res.status(504).json({ error: 'timeout_or_network' })
  } finally {
    clearTimeout(timer)
  }
}

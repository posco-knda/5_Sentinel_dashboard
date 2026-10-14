// Vercel 서버리스 함수 — 서버 기능(Slack 알림, AI 요약)이 연결돼 있는지만 알려 준다.
// 비밀값은 돌려주지 않고 "설정돼 있는가"만 true/false로 답한다.

interface Res {
  status(code: number): Res
  json(body: unknown): void
  setHeader(name: string, value: string): void
}

export default function handler(_req: unknown, res: Res) {
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ slack: !!process.env.SLACK_WEBHOOK_URL, ai: !!process.env.ANTHROPIC_API_KEY })
}

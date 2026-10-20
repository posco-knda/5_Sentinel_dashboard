// 촬영 직전 점검 — 배포된 주소에서 화면 파일과 서버 기능이 모두 살아 있는지 확인한다.
// 실행: npm run demo:check            (기본 https://5-sentinel-dashboard.vercel.app)
//       npm run demo:check -- https://다른-주소
// Slack으로 실제 알림이 나가는 /api/notify는 호출하지 않는다.
const base = (process.argv[2] ?? process.env.DEMO_URL ?? 'https://5-sentinel-dashboard.vercel.app').replace(/\/$/, '')
let failed = 0
const ok = (name, detail = '') => console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
const bad = (name, detail = '') => {
  failed++
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
}
async function check(name, fn) {
  try {
    const d = await fn()
    ok(name, d)
  } catch (e) {
    bad(name, e instanceof Error ? e.message : String(e))
  }
}
const get = async (path, init) => {
  const t = performance.now()
  const r = await fetch(base + path, init)
  return { r, ms: Math.round(performance.now() - t) }
}

console.log(`\n점검 대상: ${base}\n`)

await check('첫 화면 (HTML)', async () => {
  const { r } = await get('/')
  const html = await r.text()
  if (!r.ok || !html.includes('id="root"')) throw new Error(`상태 ${r.status}`)
})
await check('파비콘이 비행기 모양', async () => {
  const { r } = await get('/favicon.svg')
  const s = await r.text()
  if (!s.includes('M17.8 19.2')) throw new Error('아직 이전 모양입니다 — 최신 버전이 배포되지 않았을 수 있습니다')
})
await check('3D 엔진 단면 모델 파일', async () => {
  const { r } = await get('/models/turbofan-cutaway.glb')
  const n = (await r.arrayBuffer()).byteLength
  if (!r.ok || n < 3_000_000) throw new Error(`상태 ${r.status}, ${n}바이트`)
  return `${(n / 1e6).toFixed(1)}MB`
})
await check('로그인 화면 3D 파일', async () => {
  const { r } = await get('/turbofan_original.html')
  if (!r.ok) throw new Error(`상태 ${r.status}`)
})
for (const f of ['planner', 'manager', 'bot']) {
  await check(`프로필 사진 ${f}`, async () => {
    const { r } = await get(`/avatars/${f}.webp`)
    if (!r.ok) throw new Error(`상태 ${r.status}`)
  })
}
await check('서버 연동 상태 (/api/status)', async () => {
  const { r } = await get('/api/status')
  const s = await r.json()
  if (!s.slack) throw new Error('Slack 연결 안 됨 (SLACK_WEBHOOK_URL)')
  if (!s.ai) throw new Error('AI 연결 안 됨 (GEMINI_API_KEY)')
  return `Slack ✓ · 결재 알림 ${s.slackApprovals === 'separate' ? '별도 채널' : s.slackApprovals === 'shared' ? '같은 채널' : '없음'} · AI ${s.aiProvider}`
})
await check('챗봇 인사 응답', async () => {
  const body = { contents: [{ role: 'user', parts: [{ text: '안녕' }] }], context: { role: 'planner', today: new Date().toISOString().slice(0, 10), path: '/' } }
  const { r, ms } = await get('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const s = await r.json()
  if (!r.ok || s.type !== 'answer') throw new Error(`상태 ${r.status} ${JSON.stringify(s).slice(0, 80)}`)
  if (ms > 6000) throw new Error(`응답이 느립니다 (${ms}ms)`)
  return `${ms}ms`
})
await check('챗봇이 도구를 고름 (엔진 질문)', async () => {
  const body = { contents: [{ role: 'user', parts: [{ text: '지금 먼저 처리할 엔진 5대 알려줘' }] }], context: { role: 'planner', today: new Date().toISOString().slice(0, 10), path: '/' } }
  const { r, ms } = await get('/api/chat', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const s = await r.json()
  if (!r.ok || s.type !== 'tool_calls') throw new Error(`상태 ${r.status} ${JSON.stringify(s).slice(0, 80)}`)
  return `${ms}ms · ${s.calls.map((c) => c.name).join(', ')}`
})

console.log(failed ? `\n실패 ${failed}건 — 위 항목을 고친 뒤 다시 실행하세요.\n` : '\n모두 통과 — 촬영해도 좋습니다.\n')
process.exit(failed ? 1 : 0)

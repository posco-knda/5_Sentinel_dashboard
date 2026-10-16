import { callApi } from '../api'
import { describeCall, runTool, type ToolEnv } from './tools'

export interface ToolLog {
  label: string
  detail: string
}

export interface BotContext {
  role: 'planner' | 'manager'
  today: string
  path: string
  engineUnit: number | null
}

type Part = Record<string, unknown>
export interface Content {
  role: 'user' | 'model'
  parts: Part[]
}

export type BotResult = { ok: true; text: string; tools: ToolLog[] } | { ok: false; reason: 'off' | 'quota' | 'error'; message: string }

const MAX_ROUNDS = 4

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * 질문 하나를 처리한다: 서버(/api/chat)가 고른 도구를 이 브라우저에서 실행해 결과를 돌려주는 일을 답이 나올 때까지 반복한다.
 * onStep은 지금 하는 일을 화면에 알리는 데 쓴다.
 */
export async function askBot(history: Content[], ctx: BotContext, env: ToolEnv, onStep?: (label: string) => void): Promise<BotResult> {
  const contents: Content[] = [...history]
  const tools: ToolLog[] = []
  for (let round = 0; round <= MAX_ROUNDS; round++) {
    let r = await callApi('/api/chat', { contents, context: ctx })
    // 무료 한도에 걸리면 잠깐 기다렸다가 한 번만 다시 시도한다
    if (r.status === 429) {
      await sleep(4000)
      r = await callApi('/api/chat', { contents, context: ctx })
    }
    if (!r.ok || !r.data) {
      if (r.status === 503 || r.status === 404) return { ok: false, reason: 'off', message: '챗봇이 아직 연결되지 않았습니다. 서버에 GEMINI_API_KEY 설정이 필요합니다.' }
      if (r.status === 429) return { ok: false, reason: 'quota', message: '요청이 많아 지금은 답하기 어렵습니다. 잠시 후 다시 물어봐 주세요.' }
      return { ok: false, reason: 'error', message: '답변을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }
    }
    if (r.data.type === 'answer' && typeof r.data.text === 'string') return { ok: true, text: r.data.text, tools }
    if (r.data.type !== 'tool_calls' || !Array.isArray(r.data.parts) || !Array.isArray(r.data.calls)) return { ok: false, reason: 'error', message: '답변을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.' }
    if (round === MAX_ROUNDS) break
    contents.push({ role: 'model', parts: r.data.parts as Part[] })
    const responses: Part[] = []
    for (const c of r.data.calls as { name: string; args: Record<string, unknown> }[]) {
      onStep?.(describeCall(c.name, c.args, {}).label)
      const result = await runTool(c.name, c.args, env)
      tools.push(describeCall(c.name, c.args, result))
      responses.push({ functionResponse: { name: c.name, response: result } })
    }
    contents.push({ role: 'user', parts: responses })
  }
  return { ok: false, reason: 'error', message: '조회가 길어져 답을 마무리하지 못했습니다. 질문을 조금 더 구체적으로 해 주세요.' }
}

/** 처음 열었을 때 보여 줄 추천 질문 — 역할과 보고 있는 화면에 맞춘다 */
export function starterQuestions(role: 'planner' | 'manager', engineUnit: number | null): string[] {
  if (engineUnit) return [`Engine #${engineUnit}은 왜 위험해?`, `Engine #${engineUnit}은 며칠에 정비하면 돼?`, `Engine #${engineUnit} 예측을 얼마나 믿어도 돼?`]
  return role === 'planner'
    ? ['지금 먼저 처리할 엔진 5대 알려줘', '기한 지났는데 아직 검토 안 한 엔진은?', '다음 주에 정비 가능한 날은?', '긴급도별 엔진 수는?']
    : ['다음 주 정비 일정에 여유 있어?', '기한이 가장 급한 엔진 3대 설명해줘', '점검 예상 모듈별로 몇 대야?', '만석인 날은 언제야?']
}

/** 답변 뒤에 붙일 후속 질문 — 쓴 도구에 따라 정한다. 모델이 만들지 않으니 항상 답할 수 있는 질문만 나온다 */
export function followUps(tools: ToolLog[], text: string): string[] {
  const used = tools.map((t) => t.label)
  const unit = /Engine #(\d+)/.exec(text)?.[1] ?? /Engine #(\d+)/.exec(used.join(' '))?.[1]
  const out: string[] = []
  const hasDetail = used.some((l) => l.includes('상세 조회'))
  if (hasDetail && unit) out.push(`Engine #${unit}은 며칠에 정비하면 돼?`, `Engine #${unit} 예측을 얼마나 믿어도 돼?`)
  else if (used.some((l) => l.includes('추천 날짜')) && unit) out.push(`Engine #${unit}은 왜 위험해?`, '다음 주 정비 일정에 여유 있어?')
  else if (used.some((l) => l.includes('엔진 목록')) && unit) out.push(`Engine #${unit}은 왜 위험해?`, '다음 주에 정비 가능한 날은?')
  else if (used.some((l) => l.includes('정비 일정'))) out.push('만석인 날은 언제야?', '기한이 가장 급한 엔진은 며칠에 정비하면 돼?')
  else if (used.some((l) => l.includes('집계'))) out.push('즉시 조치 엔진 목록 보여줘', '점검 예상 모듈별로 몇 대야?')
  else out.push('지금 먼저 처리할 엔진 5대 알려줘', '다음 주에 정비 가능한 날은?')
  return out.slice(0, 3)
}

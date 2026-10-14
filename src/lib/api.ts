export type ApiResult = { ok: boolean; status: number; data: Record<string, unknown> | null }

/** 서버 함수(/api/*)를 부른다. 개발 서버처럼 함수가 없는 곳은 HTML이 돌아오므로 JSON이 아니면 "서버 기능 없음"(404)으로 본다. */
export async function callApi(path: string, body: unknown): Promise<ApiResult> {
  try {
    const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
    const ct = r.headers.get('content-type') ?? ''
    if (!ct.includes('json')) return { ok: false, status: 404, data: null }
    return { ok: r.ok, status: r.status, data: (await r.json()) as Record<string, unknown> }
  } catch {
    return { ok: false, status: 0, data: null }
  }
}

export type SendState = { state: 'idle' | 'loading' | 'done' | 'off' | 'error'; text?: string }

/** /api/notify 응답을 화면 상태로 바꾼다 */
export function notifyState(r: ApiResult): SendState {
  if (r.ok) return { state: 'done' }
  if (r.status === 503 || r.status === 404) return { state: 'off' }
  return { state: 'error', text: r.status === 429 ? '잠시 후 다시 시도해 주세요' : undefined }
}

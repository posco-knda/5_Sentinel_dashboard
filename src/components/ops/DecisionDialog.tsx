import { useEffect, useState } from 'react'
import { daysText, deadlineText, limitDate, requestDate, type FleetEngine } from '../../lib/fleet'
import { useAuth } from '../../lib/auth'
import { announceWorkflow } from '../../lib/notify'
import { lastSubmit, todayStr, usePlan } from '../../lib/plan'
import { availableDays, label as dayLabel, problem, used } from '../../lib/schedule'
import { useSettings } from '../../lib/settings'

export type DecisionMode = 'submit' | 'approve' | 'reject'

const TITLE: Record<DecisionMode, string> = { submit: '결재 요청', approve: '정비 승인', reject: '반려' }
const CONFIRM: Record<DecisionMode, string> = { submit: '결재 올리기', approve: '승인하기', reject: '반려하기' }
const SUGGEST = ['AI 권고대로 정비가 필요하다고 판단', '센서 변화가 뚜렷해 조기 점검 필요', '운항 일정을 조정해 정비 가능']

const field = { background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-xs)' } as const
const md = (d: string) => d.slice(5).replace('-', '/')
const when = (at: number) => new Date(at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })

/** 결재 요청(담당자) · 승인/반려(운영 책임자)를 받는 창 — 판단한 사람과 사유가 이력에 남는다 */
export function DecisionDialog({ mode, engine, onClose }: { mode: DecisionMode; engine: FleetEngine; onClose: () => void }) {
  const plan = usePlan()
  const { user } = useAuth()
  const { settings } = useSettings()
  const item = plan.get(engine.unit)
  const req = lastSubmit(item)
  const rules = { today: todayStr(), prepDays: settings.prepDays, slotsPerDay: settings.slotsPerDay }
  // 처음 보여 줄 날짜: 원하는 날(요청 기한·희망일)이 가능하면 그대로, 아니면 그 뒤로 가장 가까운 가능한 날
  const [date, setDate] = useState(() => {
    const want = item.date ?? requestDate(engine.requestIn)
    return problem(want, rules, plan.items, engine.unit) === null ? want : (availableDays(want, 1, rules, plan.items, engine.unit)[0]?.date ?? want)
  })
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')
  const needDate = mode !== 'reject'
  const tooLate = needDate && !!date && date > limitDate(engine.daysLeft)
  const issue = needDate ? problem(date, rules, plan.items, engine.unit) : null
  // 가동 한계일보다 늦은 일정을 승인하는 것은 일반 승인이 아니라 '긴급 예외 승인'이다 — 사유가 필수이고 이력에 예외로 남는다
  const exception = mode === 'approve' && tooLate
  const left = date ? settings.slotsPerDay - used(plan.items, date, engine.unit) : 0
  const picks = needDate ? availableDays(rules.today, 5, rules, plan.items, engine.unit) : []

  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [onClose])

  const confirm = () => {
    if (issue) return setErr(issue)
    if (exception && note.trim().length < 5) return setErr('가동 한계일보다 늦은 일정은 예외 승인 사유를 적어야 합니다')
    const finalNote = exception ? `[긴급 예외] ${note.trim()}` : note
    const r = plan.act(engine.unit, mode, { note: finalNote, date: needDate ? date : undefined })
    if (r.ok) {
      if (settings.notifyWorkflow && user) void announceWorkflow(engine, mode, user, { note: finalNote, date: needDate ? date : undefined })
      onClose()
    }
    else setErr(r.error ?? '처리하지 못했습니다')
  }

  const label = mode === 'submit' ? '판단 사유 (필수)' : mode === 'reject' ? '반려 사유 (필수)' : exception ? '예외 승인 사유 (필수)' : '의견 (선택)'
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0, 0, 0, 0.55)' }} onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={`${engine.name} ${TITLE[mode]}`} className="w-full max-w-[480px] border p-5" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 'var(--radius-sm)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-row items-baseline justify-between gap-3">
          <h2 className="m-0 text-[16px] font-semibold">{exception ? '정비 긴급 예외 승인' : TITLE[mode]}</h2>
          <span className="mono text-[13px]" style={{ color: 'var(--text-secondary)' }}>{engine.name}</span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 border p-3 text-[12px]" style={{ borderColor: 'var(--border-soft)', background: 'var(--surface-1)', borderRadius: 'var(--radius-xs)' }}>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>예측 남은 수명</div>
            <div className="mono mt-0.5 font-semibold">{engine.pred} cycle</div>
            <div style={{ color: 'var(--text-muted)' }}>{daysText(engine.daysLeft)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>정비 요청 기한</div>
            <div className="mt-0.5 font-semibold">{deadlineText(engine.requestIn)}</div>
            <div className="mono" style={{ color: 'var(--text-muted)' }}>{md(requestDate(engine.requestIn))}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-muted)' }}>점검 예상 모듈</div>
            <div className="mt-0.5 font-semibold">{engine.topPart ? engine.topPart.label : '뚜렷한 변화 없음'}</div>
          </div>
        </div>

        {mode !== 'submit' && req && (
          <div className="mt-3 border-l-2 pl-3 text-[12.5px]" style={{ borderColor: 'var(--accent)' }}>
            <div style={{ color: 'var(--text-muted)' }}>
              {req.by} 요청 · {when(req.at)}
              {req.date && <span className="mono"> · 희망 {md(req.date)}</span>}
            </div>
            <div className="mt-0.5" style={{ color: 'var(--text-primary)' }}>{req.note}</div>
          </div>
        )}

        {needDate && (
          <div className="mt-4 flex flex-col gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <label htmlFor="plan-date">{mode === 'submit' ? '희망 정비일' : '확정 정비일'}</label>
            <input id="plan-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setErr('') }} className="mono w-fit border px-2.5 py-1.5 text-[13px]" style={{ ...field, borderColor: issue ? 'var(--status-critical)' : 'var(--border)' }} />
            {issue ? (
              <span role="alert" style={{ color: 'var(--status-critical)' }}>{issue}</span>
            ) : (
              <span>정비 가능 자리 <span className="mono" style={{ color: 'var(--text-primary)' }}>{left}/{settings.slotsPerDay}</span>대 · 주간 계획이라 다음 주부터, 월~금</span>
            )}
            {tooLate && <span style={{ color: 'var(--status-critical)' }}>남은 수명이 다하는 날({md(limitDate(engine.daysLeft))})보다 늦은 일정입니다{exception && ' — 승인하면 긴급 예외로 기록됩니다'}</span>}
            {picks.length > 0 && (
              <div className="flex flex-row flex-wrap items-center gap-1.5 pt-0.5">
                <span title="규칙에 맞는 날 중 가장 빠른 순서로 보여 줍니다">추천 날짜</span>
                {picks.map((d) => (
                  <button key={d.date} type="button" onClick={() => { setDate(d.date); setErr('') }} className="border px-2.5 py-1 text-[11.5px]" style={{ borderColor: d.date === date ? 'var(--accent)' : 'var(--border)', background: d.date === date ? 'var(--accent-dim)' : 'transparent', color: d.date === date ? 'var(--accent)' : 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
                    {dayLabel(d.date)} <span className="mono" style={{ opacity: 0.7 }}>{d.left}자리</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="mt-4 flex flex-col gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {label}
          <textarea
            autoFocus
            rows={3}
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={mode === 'submit' ? 'AI 권고를 보고 내린 판단을 적어 주세요' : mode === 'reject' ? '담당자가 다시 검토할 수 있게 이유를 적어 주세요' : '담당자에게 남길 말이 있으면 적어 주세요'}
            className="resize-none border px-2.5 py-2 text-[13px] leading-relaxed"
            style={field}
          />
        </label>
        {mode === 'submit' && (
          <div className="mt-2 flex flex-row flex-wrap gap-1.5">
            {SUGGEST.map((s) => (
              <button key={s} type="button" onClick={() => setNote(s)} className="border px-2.5 py-1 text-[11.5px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {err && <p className="mb-0 mt-3 text-[12.5px]" style={{ color: 'var(--status-critical)' }} role="alert">{err}</p>}

        <div className="mt-5 flex flex-row justify-end gap-2">
          <button onClick={onClose} className="border px-4 py-1.5 text-[13px]" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
            취소
          </button>
          <button onClick={confirm} disabled={!!issue} className="px-4 py-1.5 text-[13px] font-semibold" style={{ opacity: issue ? 0.45 : 1, background: mode === 'reject' ? 'var(--status-critical)' : 'var(--accent)', color: mode === 'reject' ? '#fff' : 'var(--accent-ink)', borderRadius: 'var(--radius-pill)' }}>
            {exception ? '예외 승인하기' : CONFIRM[mode]}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { FlyLoading } from '../components/FlyLoading'
import { Turbofan3D } from '../components/Turbofan3D'
import { ACCOUNTS, AVATARS_FULL } from '../lib/accounts'
import { ROLE_LABEL, useAuth } from '../lib/auth'

/** 로그인 뒤 비행기 로딩 화면을 보여 주는 시간(ms) */
const ENTER_DELAY = 2200

const field = { background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-xs)' } as const

export function Login() {
  const { login } = useAuth()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [entering, setEntering] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // 계정이 맞으면 비행기가 지나가는 화면을 잠시 보여 준 뒤 들어간다
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (entering) return
    const ok = ACCOUNTS.some((a) => a.id === id.trim().toLowerCase() && a.password === pw)
    if (!ok) return setErr(true)
    setEntering(true)
    timer.current = window.setTimeout(() => login(id, pw), ENTER_DELAY)
  }
  const fill = (i: string, p: string) => {
    setId(i)
    setPw(p)
    setErr(false)
  }

  return (
    <div className="relative flex min-h-screen" style={{ background: 'var(--page)', color: 'var(--text-primary)' }}>
      <div className="hidden h-screen w-[56%] shrink-0 lg:block">
        <Turbofan3D className="h-full">
          <div className="absolute bottom-10 left-10 max-w-[420px]">
            <p className="m-0 text-[22px] font-semibold leading-snug tracking-[-0.01em]" style={{ color: '#fff', wordBreak: 'keep-all' }}>
              엔진이 멈추기 전에,<br />정비할 때를 먼저 알려드립니다
            </p>
            <p className="m-0 mt-2 text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,.7)', wordBreak: 'keep-all' }}>
              비행 데이터로 남은 수명을 예측하고,<br />담당자 검토와 책임자 승인을 거쳐 정비 일정을 확정합니다.
            </p>
          </div>
        </Turbofan3D>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-[460px]">
        <div className="mb-6 flex flex-row items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
            </svg>
          </div>
          <div>
            <div className="text-[18px] font-semibold tracking-[-0.01em]">Sentinel</div>
            <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>항공 엔진 정비 관리</div>
          </div>
        </div>

        <form onSubmit={submit} className="surface-card flex flex-col gap-3.5 border p-6" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
          <label className="flex flex-col gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            아이디
            <input value={id} onChange={(e) => { setId(e.target.value); setErr(false) }} autoComplete="username" autoFocus className="border px-3 py-2 text-[14px]" style={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            비밀번호
            <input type="password" value={pw} onChange={(e) => { setPw(e.target.value); setErr(false) }} autoComplete="current-password" className="border px-3 py-2 text-[14px]" style={field} />
          </label>
          {err && <p className="m-0 text-[12.5px]" style={{ color: 'var(--status-critical)' }} role="alert">아이디 또는 비밀번호가 맞지 않습니다</p>}
          <button type="submit" className="cta-primary mt-1 px-4 py-2.5 text-[14px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}>
            로그인
          </button>
        </form>

        <div className="mt-5">
          <p className="m-0 mb-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>계정 선택</p>
          <div className="grid grid-cols-2 gap-3">
            {ACCOUNTS.map((a) => {
              const on = id.trim().toLowerCase() === a.id
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => fill(a.id, a.password)}
                  aria-pressed={on}
                  className="flex flex-col items-center gap-2 border p-2 pb-3 text-center transition-colors"
                  style={{ borderColor: on ? 'var(--accent)' : 'var(--border)', background: on ? 'var(--accent-dim)' : 'var(--surface-1)', borderRadius: 'var(--radius-md)', boxShadow: on ? '0 0 0 1px var(--accent)' : 'none' }}
                >
                  <img src={AVATARS_FULL[a.name]} alt="" width={560} height={560} draggable={false} className="block aspect-square w-full object-cover" style={{ borderRadius: 'var(--radius-sm)' }} />
                  <span className="flex flex-col items-center gap-0.5">
                    <span className="text-[14px] font-semibold">{ROLE_LABEL[a.role]}</span>
                    <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>{a.name}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
      </div>
      {entering && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'var(--page)' }}>
          <FlyLoading label="로그인 중…" height="100vh" />
        </div>
      )}
    </div>
  )
}

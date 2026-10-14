import { useState, type FormEvent } from 'react'
import { ACCOUNTS } from '../lib/accounts'
import { ROLE_LABEL, useAuth } from '../lib/auth'
import { ThemeToggle } from '../components/ThemeToggle'

const field = { background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-primary)', borderRadius: 'var(--radius-xs)' } as const

export function Login() {
  const { login } = useAuth()
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!login(id, pw)) setErr(true)
  }
  const fill = (i: string, p: string) => {
    setId(i)
    setPw(p)
    setErr(false)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--page)', color: 'var(--text-primary)' }}>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-[380px]">
        <div className="mb-6 flex flex-row items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center" style={{ background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
              <path d="M12 8 L12 12 L15 14" />
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
          <p className="m-0 mb-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>시연 계정으로 입력</p>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNTS.map((a) => (
              <button key={a.id} type="button" onClick={() => fill(a.id, a.password)} className="flex flex-col items-start gap-0.5 border px-3 py-2.5 text-left" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-[13px] font-semibold">{ROLE_LABEL[a.role]}</span>
                <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{a.name}</span>
              </button>
            ))}
          </div>
          <p className="mb-0 mt-4 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            시연용 로그인입니다. 계정 정보는 이 브라우저에서만 확인하며 실제 인증이 아닙니다. 탭 두 개에 각각 다른 계정으로 들어가면 결재가 오가는 모습을 볼 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}

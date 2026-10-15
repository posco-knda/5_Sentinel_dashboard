import { useState, type FormEvent } from 'react'
import { Turbofan3D } from '../components/Turbofan3D'
import { ACCOUNTS } from '../lib/accounts'
import { ROLE_LABEL, useAuth } from '../lib/auth'

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
    <div className="relative flex min-h-screen" style={{ background: 'var(--page)', color: 'var(--text-primary)' }}>
      <div className="absolute inset-0 hidden lg:block">
        <Turbofan3D full className="h-full">
          <div className="absolute bottom-10 left-10 max-w-[380px]">
            <p className="m-0 text-[22px] font-semibold leading-snug tracking-[-0.01em]" style={{ color: '#fff' }}>
              엔진이 멈추기 전에,<br />정비할 때를 먼저 알려드립니다
            </p>
            <p className="m-0 mt-2 text-[13px]" style={{ color: 'rgba(255,255,255,.7)' }}>
              비행 데이터로 남은 수명을 예측하고, 담당자 검토와 책임자 승인을 거쳐 정비 일정을 확정합니다.
            </p>
          </div>
        </Turbofan3D>
      </div>
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 lg:justify-end lg:pr-[8%]">
      <div className="w-full max-w-[380px] lg:border lg:p-7" style={{ background: 'var(--page)', borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)' }}>
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
          <p className="m-0 mb-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>계정 선택</p>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNTS.map((a) => (
              <button key={a.id} type="button" onClick={() => fill(a.id, a.password)} className="flex flex-col items-start gap-0.5 border px-3 py-2.5 text-left" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)', borderRadius: 'var(--radius-sm)' }}>
                <span className="text-[13px] font-semibold">{ROLE_LABEL[a.role]}</span>
                <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

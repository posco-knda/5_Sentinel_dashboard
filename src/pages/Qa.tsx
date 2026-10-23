import { ROLE_LABEL } from '../lib/auth'

const SHORT_URL = 'https://m.site.naver.com/2jkNN'
const SHOW_URL = '5-sentinel-dashboard.vercel.app'

/**
 * 질의응답 화면 — 발표 마지막에 띄워 두는 안내 페이지. 로그인 없이 열린다.
 * 오른쪽의 큰 QR로 청중이 바로 써 볼 수 있다(멀리서도 읽히도록 흰 여백을 넉넉히 둔 사각형 QR).
 */
export function Qa() {
  return (
    <main className="flex min-h-screen items-center justify-center px-[5vw] py-[4vh]" style={{ background: 'var(--page)', color: 'var(--text-primary)' }}>
      <div className="grid w-full max-w-[1700px] grid-cols-1 items-center gap-[5vw] lg:grid-cols-[1fr_minmax(0,min(46vw,82vh))]">
        <section className="flex flex-col gap-[3.2vh]">
          <div className="flex flex-row items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
              </svg>
            </span>
            <span className="text-[clamp(18px,1.6vw,28px)] font-semibold">Sentinel</span>
          </div>
          <h1 className="m-0 text-[clamp(44px,6.2vw,120px)] font-bold leading-[1.05] tracking-[-0.02em]">질의응답</h1>
          <p className="m-0 text-[clamp(18px,2.1vw,40px)] leading-[1.45]" style={{ color: 'var(--text-secondary)' }}>
            휴대폰 카메라로 오른쪽 QR을 비추면
            <br />
            지금 바로 써 볼 수 있습니다.
          </p>
          <ol className="m-0 flex list-none flex-col gap-[1.6vh] p-0 text-[clamp(16px,1.6vw,30px)]" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex flex-row items-baseline gap-3">
              <span className="mono font-semibold" style={{ color: 'var(--accent)' }}>1</span>
              <span>{ROLE_LABEL.planner}로 로그인해서 엔진을 열고 결재를 올립니다.</span>
            </li>
            <li className="flex flex-row items-baseline gap-3">
              <span className="mono font-semibold" style={{ color: 'var(--accent)' }}>2</span>
              <span>로그아웃하고 {ROLE_LABEL.manager}로 로그인해서 승인합니다.</span>
            </li>
            <li className="flex flex-row items-baseline gap-3">
              <span className="mono font-semibold" style={{ color: 'var(--accent)' }}>3</span>
              <span>메신저에서 @센티널을 불러 질문해 봅니다.</span>
            </li>
          </ol>
          <p className="m-0 text-[clamp(13px,1.1vw,20px)]" style={{ color: 'var(--text-muted)' }}>
            시험용 화면입니다. 입력한 내용은 이 기기에만 저장되고, 개인정보는 입력하지 마세요.
          </p>
        </section>

        <section className="flex flex-col items-center gap-[2vh]">
          <a href={SHORT_URL} className="block w-full rounded-[2.2vmin] bg-white p-[1.6vmin] shadow-[0_1.5vmin_6vmin_rgba(0,0,0,0.18)]" aria-label="Sentinel 열기 QR 코드">
            <img src="/qr-sentinel.svg" alt="Sentinel을 여는 QR 코드" className="block aspect-square w-full" style={{ imageRendering: 'pixelated' }} />
          </a>
          <span className="mono text-[clamp(14px,1.5vw,28px)] font-medium" style={{ color: 'var(--text-secondary)' }}>
            {SHOW_URL}
          </span>
        </section>
      </div>
    </main>
  )
}

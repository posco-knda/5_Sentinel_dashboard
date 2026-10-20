import { createPortal } from 'react-dom'
import { AVATARS } from '../lib/accounts'

const PLANE = 'M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z'

/**
 * 할 일을 하나 끝낼 때마다 나오는 연출 — 왼쪽 아래 프로필 사진 속 인물이 튀어나와 비행기를 타고 날아간다(마지막 할 일이면 퇴근 인사).
 * 끝나면 onDone으로 스스로 사라진다.
 */
export function LeaveFx({ name, last, onDone }: { name: string; last: boolean; onDone: () => void }) {
  const src = AVATARS[name]
  return createPortal(
    <div className="leave-fx no-print" onAnimationEnd={(e) => e.target === e.currentTarget && onDone()} aria-hidden="true">
      <span className="leave-bubble">{last ? '퇴근합니다! 수고하셨어요' : '하나 끝! 다음 할 일로 출발'}</span>
      <div className="leave-rider">
        {src ? <img src={src} alt="" /> : <span className="leave-initial">{name.slice(0, 1)}</span>}
      </div>
      <svg className="leave-plane" width="76" height="76" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="0.8" strokeLinejoin="round">
        <path d={PLANE} transform="rotate(45 12 12)" />
      </svg>
      <span className="leave-trail" />
    </div>,
    document.body,
  )
}

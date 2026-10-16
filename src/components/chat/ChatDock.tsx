import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ROLE_LABEL, useAuth } from '../../lib/auth'
import { MAX_LENGTH, useChat, type ChatMessage } from '../../lib/chat'

const time = (t: number) => new Date(t).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
const dayLabel = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()

function ChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  )
}

function Avatar({ name, online, size = 36 }: { name: string; online?: boolean; size?: number }) {
  return (
    <span className="relative flex shrink-0 items-center justify-center text-[13px] font-semibold" style={{ width: size, height: size, background: 'var(--surface-2)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-pill)' }}>
      {name.slice(0, 1)}
      {online !== undefined && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2" style={{ background: online ? 'var(--status-good)' : 'var(--text-muted)', borderColor: 'var(--surface-1)' }} />}
    </span>
  )
}

function Bubble({ m, mine }: { m: ChatMessage; mine: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 ${mine ? 'items-end' : 'items-start'}`}>
      {!mine && <span className="px-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.name}</span>}
      <div className={`flex items-end gap-1.5 ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
        <div
          className="max-w-[240px] whitespace-pre-wrap break-words px-3 py-2 text-[13px] leading-relaxed"
          style={{ background: mine ? 'var(--accent)' : 'var(--surface-2)', color: mine ? 'var(--accent-ink)' : 'var(--text-primary)', borderRadius: 14, borderBottomRightRadius: mine ? 4 : 14, borderBottomLeftRadius: mine ? 14 : 4 }}
        >
          {m.text}
        </div>
        <span className="shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{time(m.at)}</span>
      </div>
    </div>
  )
}

function Thread() {
  const { messages, send } = useChat()
  const { user } = useAuth()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const submit = () => {
    if (!text.trim()) return
    send(text)
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-3">
        {messages.length === 0 && (
          <p className="m-auto text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
            아직 대화가 없습니다.<br />먼저 인사를 건네 보세요.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-2.5">
            {(i === 0 || !sameDay(messages[i - 1].at, m.at)) && (
              <span className="self-center px-2 py-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{dayLabel(m.at)}</span>
            )}
            <Bubble m={m} mine={m.from === user?.role} />
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="flex shrink-0 flex-row items-end gap-2 border-t px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKey}
          rows={1}
          placeholder="메시지 입력 (Enter로 전송)"
          aria-label="메시지 입력"
          className="max-h-[96px] min-h-[36px] flex-1 resize-none border px-3 py-2 text-[13px] leading-snug"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 10 }}
        />
        <button onClick={submit} disabled={!text.trim()} className="shrink-0 px-3.5 py-2 text-[12.5px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 10, opacity: text.trim() ? 1 : 0.45 }}>
          보내기
        </button>
      </div>
    </>
  )
}

function RoomList() {
  const { peer, messages, unread, setView } = useChat()
  const last = messages[messages.length - 1]
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <button onClick={() => setView('thread')} className="row-link flex w-full flex-row items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Avatar name={peer.name} online={peer.online} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-row items-center gap-2">
            <span className="text-[13.5px] font-semibold">{peer.name}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[peer.role]}</span>
            {last && <span className="ml-auto shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{time(last.at)}</span>}
          </div>
          <div className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>{last ? `${last.from === peer.role ? '' : '나: '}${last.text}` : peer.online ? '접속 중' : '대화를 시작해 보세요'}</div>
        </div>
        {unread > 0 && <span className="mono shrink-0 px-1.5 text-[11px] font-semibold" style={{ background: 'var(--status-critical)', color: '#fff', borderRadius: 999 }}>{unread}</span>}
      </button>
    </div>
  )
}

/** 화면 우측 하단 메신저 — 작은 버튼을 누르면 대화방 목록이, 대화방을 누르면 대화가 열린다 */
export function ChatDock() {
  const { open, setOpen, view, setView, expanded, setExpanded, unread, peer, preview, dismissPreview } = useChat()

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  if (!open) {
    return (
      <div className="no-print fixed bottom-4 right-4 z-[55] flex flex-row items-end gap-2">
        {preview && (
          <button onClick={() => setOpen(true)} onMouseEnter={dismissPreview} className="max-w-[240px] border px-3 py-2 text-left" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 12 }}>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{preview.name}</div>
            <div className="line-clamp-2 text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{preview.text}</div>
          </button>
        )}
        <button onClick={() => { setOpen(true); setView(unread > 0 ? 'thread' : 'list') }} aria-label="메신저 열기" className="relative flex h-14 w-14 items-center justify-center border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-strong)', color: 'var(--accent)', borderRadius: 14 }}>
          <ChatIcon size={26} />
          {unread > 0 && <span className="mono absolute -right-1.5 -top-1.5 min-w-[18px] px-1 text-center text-[10.5px] font-semibold" style={{ background: 'var(--status-critical)', color: '#fff', borderRadius: 999 }}>{unread}</span>}
        </button>
      </div>
    )
  }

  const size = expanded ? 'sm:h-[min(680px,calc(100dvh-2rem))] sm:w-[min(560px,calc(100vw-2rem))]' : 'sm:h-[min(520px,calc(100dvh-2rem))] sm:w-[360px]'
  return (
    <section className={`no-print fixed inset-0 z-[55] flex flex-col border sm:inset-auto sm:bottom-4 sm:right-4 ${size}`} style={{ background: 'var(--surface-1)', borderColor: 'var(--border-strong)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,.28)' }} aria-label="메신저">
      <header className="flex shrink-0 flex-row items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
        {view === 'thread' ? (
          <>
            <button onClick={() => setView('list')} aria-label="대화방 목록" className="icon-btn flex h-7 w-7 items-center justify-center" style={{ color: 'var(--text-muted)' }}>←</button>
            <Avatar name={peer.name} online={peer.online} size={30} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold leading-tight">{peer.name} <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[peer.role]}</span></div>
              <div className="text-[11px]" style={{ color: peer.online ? 'var(--status-good)' : 'var(--text-muted)' }}>{peer.online ? '접속 중' : '접속 안 함'}</div>
            </div>
          </>
        ) : (
          <div className="flex min-w-0 flex-1 flex-row items-center gap-2 pl-1 text-[14px] font-semibold"><ChatIcon size={16} /> 메신저</div>
        )}
        <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? '작게 보기' : '크게 보기'} className="icon-btn hidden h-7 w-7 items-center justify-center text-[13px] sm:flex" style={{ color: 'var(--text-muted)' }}>{expanded ? '▭' : '⤢'}</button>
        <button onClick={() => setOpen(false)} aria-label="메신저 닫기" className="icon-btn flex h-7 w-7 items-center justify-center text-[15px]" style={{ color: 'var(--text-muted)' }}>✕</button>
      </header>
      {view === 'thread' ? <Thread /> : <RoomList />}
    </section>
  )
}

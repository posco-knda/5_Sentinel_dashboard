import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ACCOUNTS } from '../../lib/accounts'
import { ROLE_LABEL, useAuth } from '../../lib/auth'
import { BOT_NAME, MAX_LENGTH, useChat, type ChatMessage, type ChatRoom } from '../../lib/chat'

const time = (t: number) => new Date(t).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
const dayLabel = (t: number) => new Date(t).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })
const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()
const askerName = (m: ChatMessage) => ACCOUNTS.find((a) => a.role === m.asker)?.name

function ChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" />
    </svg>
  )
}

function Avatar({ name, online, size = 36, bot = false }: { name: string; online?: boolean; size?: number; bot?: boolean }) {
  return (
    <span className="relative flex shrink-0 items-center justify-center text-[13px] font-semibold" style={{ width: size, height: size, background: bot ? 'var(--accent)' : 'var(--surface-2)', color: bot ? 'var(--accent-ink)' : 'var(--text-secondary)', borderRadius: bot ? 10 : 'var(--radius-pill)' }}>
      {bot ? (
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
          <path d="M12 8 L12 12 L15 14" />
        </svg>
      ) : (
        name.slice(0, 1)
      )}
      {online !== undefined && <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2" style={{ background: online ? 'var(--status-good)' : 'var(--text-muted)', borderColor: 'var(--surface-1)' }} />}
    </span>
  )
}

/** 글 속의 "Engine #31"·"#31"을 엔진 상세로 가는 링크로 바꾼다 (링크는 코드가 만들어서 틀릴 수 없다) */
function linkify(text: string, mine: boolean): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(Engine\s*)?#(\d{1,5})/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(
      <Link key={`${m.index}-${m[2]}`} to={`/equipment/engine-${m[2]}?tab=diagnosis`} className="font-semibold underline" style={{ color: mine ? 'var(--accent-ink)' : 'var(--accent)' }}>
        {m[0]}
      </Link>,
    )
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
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
          {linkify(m.text, mine).map((n, i) => (
            <Fragment key={i}>{n}</Fragment>
          ))}
        </div>
        <span className="shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{time(m.at)}</span>
      </div>
    </div>
  )
}

function BotBubble({ m, showAsker, last, onAsk, busy }: { m: ChatMessage; showAsker: boolean; last: boolean; onAsk: (q: string) => void; busy: boolean }) {
  return (
    <div className="flex flex-row items-start gap-2">
      <Avatar name={BOT_NAME} size={28} bot />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="px-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          {BOT_NAME} 봇{showAsker && askerName(m) ? ` · ${askerName(m)} 님의 질문` : ''}
        </span>
        <div className="flex items-end gap-1.5">
          <div className="max-w-[250px] whitespace-pre-wrap break-words border px-3 py-2 text-[13px] leading-relaxed" style={{ background: 'var(--surface-1)', borderColor: m.error ? 'var(--status-warning)' : 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 14, borderBottomLeftRadius: 4 }}>
            {linkify(m.text, false).map((n, i) => (
              <Fragment key={i}>{n}</Fragment>
            ))}
          </div>
          <span className="shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{time(m.at)}</span>
        </div>
        {m.tools && m.tools.length > 0 && (
          <details className="px-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            <summary className="cursor-pointer select-none">근거 보기 · 조회 {m.tools.length}건</summary>
            <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
              {m.tools.map((t, i) => (
                <li key={i}>
                  <span style={{ color: 'var(--text-secondary)' }}>{t.label}</span> — {t.detail}
                </li>
              ))}
            </ul>
          </details>
        )}
        {last && !busy && m.followups && m.followups.length > 0 && (
          <div className="flex flex-row flex-wrap gap-1.5 pt-0.5">
            {m.followups.map((q) => (
              <button key={q} onClick={() => onAsk(q)} className="chip-btn border px-2.5 py-1 text-left text-[12px]" style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)', borderRadius: 999 }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Thread({ room }: { room: ChatRoom }) {
  const { messages, send, busy, starters } = useChat()
  const { user } = useAuth()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  const inRoom = messages.filter((m) => (m.room ?? 'peer') === room && (room === 'peer' || m.owner === user?.role))
  const mentioning = room === 'peer' && /^\s*@/.test(text)
  const waiting = busy?.room === room
  const botBusy = !!busy // 한 번에 하나만 묻는다

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [inRoom.length, busy])

  const ask = (q: string) => {
    if (botBusy) return
    send(room === 'peer' ? `@${BOT_NAME} ${q}` : q, room)
  }
  const willAskBot = room === 'bot' || /@sentinel/i.test(text)
  const submit = () => {
    if (!text.trim() || (willAskBot && botBusy)) return
    send(text, room)
    setText('')
  }
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }
  const lastId = inRoom[inRoom.length - 1]?.id

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-3.5 py-3">
        {inRoom.length === 0 && (
          <div className="m-auto flex w-full flex-col items-center gap-3 text-center">
            <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              {room === 'bot' ? <>현황·엔진 설명·정비 일정을 물어보세요.<br />숫자는 시스템 데이터에서만 가져옵니다.</> : <>아직 대화가 없습니다.<br />먼저 인사를 건네 보세요.<br /><span className="text-[11.5px]">@Sentinel 을 붙이면 봇이 대화방에서 함께 답합니다.</span></>}
            </p>
            {room === 'bot' && (
              <div className="flex w-full flex-col gap-1.5">
                {starters.map((q) => (
                  <button key={q} onClick={() => ask(q)} className="chip-btn border px-3 py-2 text-left text-[12.5px]" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-primary)', borderRadius: 10 }}>{q}</button>
                ))}
              </div>
            )}
          </div>
        )}
        {inRoom.map((m, i) => (
          <div key={m.id} className="flex flex-col gap-2.5">
            {(i === 0 || !sameDay(inRoom[i - 1].at, m.at)) && <span className="self-center px-2 py-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{dayLabel(m.at)}</span>}
            {m.from === 'bot' ? <BotBubble m={m} showAsker={room === 'peer'} last={m.id === lastId} onAsk={ask} busy={botBusy} /> : <Bubble m={m} mine={m.from === user?.role} />}
          </div>
        ))}
        {waiting && (
          <div className="flex flex-row items-center gap-2">
            <Avatar name={BOT_NAME} size={28} bot />
            <span className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{busy?.label}…</span>
          </div>
        )}
        <div ref={end} />
      </div>
      {room === 'peer' && (mentioning || inRoom.length === 0) && starters.length > 0 && mentioning && (
        <div className="flex shrink-0 flex-row flex-wrap gap-1.5 px-3 pb-2">
          {starters.slice(0, 3).map((q) => (
            <button key={q} onClick={() => ask(q)} className="chip-btn border px-2.5 py-1 text-left text-[12px]" style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)', borderRadius: 999 }}>{q}</button>
          ))}
        </div>
      )}
      <div className="flex shrink-0 flex-row items-end gap-2 border-t px-3 py-2.5" style={{ borderColor: 'var(--border)' }}>
        {room === 'peer' && (
          <button onClick={() => setText((t) => (t.startsWith(`@${BOT_NAME}`) ? t : `@${BOT_NAME} ${t}`))} title="봇에게 묻기" className="shrink-0 border px-2 py-2 text-[11.5px] font-semibold" style={{ borderColor: 'var(--border-strong)', color: 'var(--accent)', borderRadius: 10 }}>
            @봇
          </button>
        )}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LENGTH))}
          onKeyDown={onKey}
          rows={1}
          placeholder={room === 'bot' ? '봇에게 질문하세요 (Enter로 전송)' : '메시지 입력 (Enter로 전송)'}
          aria-label="메시지 입력"
          className="max-h-[96px] min-h-[36px] flex-1 resize-none border px-3 py-2 text-[13px] leading-snug"
          style={{ borderColor: 'var(--border)', background: 'var(--surface-2)', color: 'var(--text-primary)', borderRadius: 10 }}
        />
        <button onClick={submit} disabled={!text.trim() || (willAskBot && botBusy)} className="shrink-0 px-3.5 py-2 text-[12.5px] font-semibold" style={{ background: 'var(--accent)', color: 'var(--accent-ink)', borderRadius: 10, opacity: text.trim() && !(willAskBot && botBusy) ? 1 : 0.45 }}>
          보내기
        </button>
      </div>
    </>
  )
}

function RoomList() {
  const { peer, messages, unread, setView } = useChat()
  const { user } = useAuth()
  const peerMsgs = messages.filter((m) => (m.room ?? 'peer') === 'peer')
  const botMsgs = messages.filter((m) => m.room === 'bot' && m.owner === user?.role)
  const lastP = peerMsgs[peerMsgs.length - 1]
  const lastB = botMsgs[botMsgs.length - 1]
  const snippet = (m: ChatMessage | undefined, empty: string) => (m ? `${m.from === user?.role ? '나: ' : m.from === 'bot' ? `${BOT_NAME}: ` : ''}${m.text.replace(/\s+/g, ' ')}` : empty)
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <button onClick={() => setView('peer')} className="row-link flex w-full flex-row items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Avatar name={peer.name} online={peer.online} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-row items-center gap-2">
            <span className="text-[13.5px] font-semibold">{peer.name}</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[peer.role]}</span>
            {lastP && <span className="ml-auto shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{time(lastP.at)}</span>}
          </div>
          <div className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>{lastP ? snippet(lastP, '') : peer.online ? '접속 중' : '대화를 시작해 보세요'}</div>
        </div>
        {unread > 0 && <span className="mono shrink-0 px-1.5 text-[11px] font-semibold" style={{ background: 'var(--status-critical)', color: '#fff', borderRadius: 999 }}>{unread}</span>}
      </button>
      <button onClick={() => setView('bot')} className="row-link flex w-full flex-row items-center gap-3 px-4 py-3 text-left" style={{ borderBottom: '1px solid var(--border-soft)' }}>
        <Avatar name={BOT_NAME} size={40} bot />
        <div className="min-w-0 flex-1">
          <div className="flex flex-row items-center gap-2">
            <span className="text-[13.5px] font-semibold">{BOT_NAME} 봇</span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>조회 도우미</span>
            {lastB && <span className="ml-auto shrink-0 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{time(lastB.at)}</span>}
          </div>
          <div className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>{snippet(lastB, '현황·엔진 설명·정비 일정을 물어보세요')}</div>
        </div>
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
          <button onClick={() => { setOpen(true); setView('peer') }} onMouseEnter={dismissPreview} className="max-w-[240px] border px-3 py-2 text-left" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border-strong)', borderRadius: 12 }}>
            <div className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{preview.name}</div>
            <div className="line-clamp-2 text-[12.5px]" style={{ color: 'var(--text-primary)' }}>{preview.text}</div>
          </button>
        )}
        <button onClick={() => { setOpen(true); setView(unread > 0 ? 'peer' : 'list') }} aria-label="메신저 열기" className="relative flex h-14 w-14 items-center justify-center border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-strong)', color: 'var(--accent)', borderRadius: 14 }}>
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
        {view !== 'list' ? (
          <>
            <button onClick={() => setView('list')} aria-label="대화방 목록" className="icon-btn flex h-7 w-7 items-center justify-center" style={{ color: 'var(--text-muted)' }}>←</button>
            {view === 'peer' ? (
              <>
                <Avatar name={peer.name} online={peer.online} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold leading-tight">{peer.name} <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[peer.role]}</span></div>
                  <div className="text-[11px]" style={{ color: peer.online ? 'var(--status-good)' : 'var(--text-muted)' }}>{peer.online ? '접속 중' : '접속 안 함'}</div>
                </div>
              </>
            ) : (
              <>
                <Avatar name={BOT_NAME} size={30} bot />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold leading-tight">{BOT_NAME} 봇</div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>나만 보는 대화 · 조회만 합니다</div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex min-w-0 flex-1 flex-row items-center gap-2 pl-1 text-[14px] font-semibold"><ChatIcon size={16} /> 메신저</div>
        )}
        <button onClick={() => setExpanded(!expanded)} aria-label={expanded ? '작게 보기' : '크게 보기'} className="icon-btn hidden h-7 w-7 items-center justify-center text-[13px] sm:flex" style={{ color: 'var(--text-muted)' }}>{expanded ? '▭' : '⤢'}</button>
        <button onClick={() => setOpen(false)} aria-label="메신저 닫기" className="icon-btn flex h-7 w-7 items-center justify-center text-[15px]" style={{ color: 'var(--text-muted)' }}>✕</button>
      </header>
      {view === 'list' ? <RoomList /> : <Thread key={view} room={view} />}
    </section>
  )
}

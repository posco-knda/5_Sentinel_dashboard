import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { ACCOUNTS } from './accounts'
import { useAuth } from './auth'
import { ChatContext, MAX_LENGTH, MAX_MESSAGES, type ChatMessage, type ChatView } from './chat'

// 두 사람의 대화는 브라우저 저장소에 두고, 다른 창에서 바뀌면 storage 이벤트로 바로 반영한다 (서버가 없는 시연 환경)
const MSG_KEY = 'sentinel-chat-v1'
const READ_KEY = 'sentinel-chat-read-v1'
const SEEN_KEY = 'sentinel-presence-v1'
const UI_KEY = 'sentinel-chat-ui-v1' // 창마다 따로 (sessionStorage)

const HEARTBEAT_MS = 4000
const ONLINE_MS = 11000

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 저장이 막힌 환경에서는 이 창에서만 유지된다 */
  }
}

function readMessages(): ChatMessage[] {
  const v = read<unknown>(MSG_KEY, [])
  if (!Array.isArray(v)) return []
  return v.filter((m): m is ChatMessage => !!m && typeof m === 'object' && typeof (m as ChatMessage).id === 'string' && typeof (m as ChatMessage).text === 'string' && typeof (m as ChatMessage).at === 'number')
}

interface UiState {
  open: boolean
  view: ChatView
  expanded: boolean
}

function readUi(): UiState {
  try {
    const raw = sessionStorage.getItem(UI_KEY)
    if (raw) {
      const v = JSON.parse(raw) as Partial<UiState>
      return { open: !!v.open, view: v.view === 'thread' ? 'thread' : 'list', expanded: !!v.expanded }
    }
  } catch {
    /* 무시 */
  }
  return { open: false, view: 'list', expanded: false }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const role = user?.role ?? 'planner'
  const peerAccount = ACCOUNTS.find((a) => a.role !== role) ?? ACCOUNTS[0]

  const [messages, setMessages] = useState<ChatMessage[]>(readMessages)
  const [readAt, setReadAt] = useState<Record<string, number>>(() => read(READ_KEY, {}))
  const [seen, setSeen] = useState<Record<string, number>>(() => read(SEEN_KEY, {}))
  const [now, setNow] = useState(() => Date.now())
  const [ui, setUi] = useState<UiState>(readUi)
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null)
  const uiRef = useRef(ui)
  const markReadRef = useRef<() => void>(() => {})

  const patchUi = useCallback((p: Partial<UiState>) => {
    setUi((prev) => {
      const next = { ...prev, ...p }
      try {
        sessionStorage.setItem(UI_KEY, JSON.stringify(next))
      } catch {
        /* 무시 */
      }
      return next
    })
  }, [])

  const markRead = useCallback(() => {
    const latest = readMessages().reduce((m, x) => Math.max(m, x.at), 0)
    const cur = read<Record<string, number>>(READ_KEY, {})
    if ((cur[role] ?? 0) >= latest) return
    const next = { ...cur, [role]: latest }
    write(READ_KEY, next)
    setReadAt(next)
  }, [role])

  useEffect(() => {
    uiRef.current = ui
    markReadRef.current = markRead
  })

  // 다른 창에서 메시지·읽음·접속 상태가 바뀌면 반영한다
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === MSG_KEY || e.key === null) {
        const next = readMessages()
        setMessages((prev) => {
          const added = next.filter((m) => !prev.some((p) => p.id === m.id) && m.from !== role)
          const last = added[added.length - 1]
          if (last && !uiRef.current.open) setPreview({ name: last.name, text: last.text })
          // 대화창이 열려 있는 동안 도착한 메시지는 바로 읽은 것으로 본다
          if (last && uiRef.current.open && uiRef.current.view === 'thread') window.setTimeout(() => markReadRef.current(), 0)
          return next
        })
      }
      if (e.key === READ_KEY || e.key === null) setReadAt(read(READ_KEY, {}))
      if (e.key === SEEN_KEY || e.key === null) setSeen(read(SEEN_KEY, {}))
    }
    window.addEventListener('storage', on)
    return () => window.removeEventListener('storage', on)
  }, [role])

  // 접속 중 표시: 내가 열려 있는 동안 주기적으로 시각을 남기고, 닫으면 지운다
  useEffect(() => {
    if (!user) return
    const beat = () => {
      const cur = read<Record<string, number>>(SEEN_KEY, {})
      write(SEEN_KEY, { ...cur, [user.role]: Date.now() })
    }
    const gone = () => {
      const cur = read<Record<string, number>>(SEEN_KEY, {})
      write(SEEN_KEY, { ...cur, [user.role]: 0 })
    }
    beat()
    const t = window.setInterval(() => {
      beat()
      setNow(Date.now())
      setSeen(read(SEEN_KEY, {}))
    }, HEARTBEAT_MS)
    window.addEventListener('pagehide', gone)
    return () => {
      window.clearInterval(t)
      window.removeEventListener('pagehide', gone)
      gone()
    }
  }, [user])

  // 미리보기는 몇 초 뒤 사라진다
  useEffect(() => {
    if (!preview) return
    const t = window.setTimeout(() => setPreview(null), 6000)
    return () => window.clearTimeout(t)
  }, [preview])

  const unread = useMemo(() => messages.filter((m) => m.from !== role && m.at > (readAt[role] ?? 0)).length, [messages, readAt, role])

  const send = useCallback(
    (text: string) => {
      const t = text.trim().slice(0, MAX_LENGTH)
      if (!t || !user) return
      const msg: ChatMessage = { id: newId(), from: user.role, name: user.name, text: t, at: Date.now() }
      // 다른 창이 방금 보낸 메시지를 덮어쓰지 않도록 저장소의 최신 목록에서 시작한다
      const next = [...readMessages(), msg].slice(-MAX_MESSAGES)
      write(MSG_KEY, next)
      setMessages(next)
    },
    [user],
  )

  const online = (seen[peerAccount.role] ?? 0) > 0 && now - (seen[peerAccount.role] ?? 0) < ONLINE_MS

  const value = useMemo(
    () => ({
      messages,
      peer: { name: peerAccount.name, role: peerAccount.role, online },
      unread,
      send,
      open: ui.open,
      setOpen: (v: boolean) => {
        patchUi({ open: v })
        if (v) {
          setPreview(null)
          if (ui.view === 'thread') markRead()
        }
      },
      view: ui.view,
      setView: (v: ChatView) => {
        patchUi({ view: v })
        if (v === 'thread') markRead()
      },
      expanded: ui.expanded,
      setExpanded: (v: boolean) => patchUi({ expanded: v }),
      markRead,
      preview,
      dismissPreview: () => setPreview(null),
    }),
    [messages, peerAccount, online, unread, send, ui, patchUi, markRead, preview],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

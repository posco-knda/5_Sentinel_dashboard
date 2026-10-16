import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { ACCOUNTS } from './accounts'
import { ROLE_LABEL, useAuth } from './auth'
import { BOT_NAME, ChatContext, MAX_LENGTH, MAX_MESSAGES, type ChatMessage, type ChatRoom, type ChatView } from './chat'
import { askBot, followUps, starterQuestions, type Content } from './chat/bot'
import type { ToolEnv } from './chat/tools'
import { useFleet } from './fleet'
import { todayStr, usePlan } from './plan'
import { useSettings } from './settings'

// 두 사람의 대화는 브라우저 저장소에 두고, 다른 창에서 바뀌면 storage 이벤트로 바로 반영한다 (서버가 없는 시연 환경)
const MSG_KEY = 'sentinel-chat-v1'
const READ_KEY = 'sentinel-chat-read-v1'
const SEEN_KEY = 'sentinel-presence-v1'
const UI_KEY = 'sentinel-chat-ui-v1' // 창마다 따로 (sessionStorage)

const HEARTBEAT_MS = 4000
const ONLINE_MS = 11000
/** 봇에게 보여 줄 최근 대화 수 */
const HISTORY = 12

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
      const v = JSON.parse(raw) as { open?: boolean; view?: string; expanded?: boolean }
      const view: ChatView = v.view === 'peer' || v.view === 'thread' ? 'peer' : v.view === 'bot' ? 'bot' : 'list'
      return { open: !!v.open, view, expanded: !!v.expanded }
    }
  } catch {
    /* 무시 */
  }
  return { open: false, view: 'list', expanded: false }
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
const roomOf = (m: ChatMessage): ChatRoom => m.room ?? 'peer'
/** 봇을 부르는 말: @Sentinel · @센티널 · @봇 */
const MENTION = /@(sentinel|센티널|봇)/i
const MENTION_ALL = /@(sentinel|센티널|봇)\s*/gi

/** 저장된 대화를 모델에 보낼 대화로 바꾼다 — 같은 쪽이 연달아 말하면 한 차례로 묶는다 */
function toContents(msgs: ChatMessage[]): Content[] {
  const out: Content[] = []
  for (const m of msgs) {
    if (m.error) continue
    const isBot = m.from === 'bot'
    const role = isBot ? 'model' : 'user'
    const text = isBot ? m.text : `${m.name}(${ROLE_LABEL[m.from as 'planner' | 'manager']}): ${m.text.replace(MENTION_ALL, '')}`
    const last = out[out.length - 1]
    if (last && last.role === role) last.parts.push({ text })
    else out.push({ role, parts: [{ text }] })
  }
  // 대화는 사용자 차례로 시작해야 한다
  while (out.length && out[0].role === 'model') out.shift()
  return out
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const role = user?.role ?? 'planner'
  const peerAccount = ACCOUNTS.find((a) => a.role !== role) ?? ACCOUNTS[0]
  const fleet = useFleet()
  const plan = usePlan()
  const { settings } = useSettings()
  const { pathname } = useLocation()

  const [messages, setMessages] = useState<ChatMessage[]>(readMessages)
  const [readAt, setReadAt] = useState<Record<string, number>>(() => read(READ_KEY, {}))
  const [seen, setSeen] = useState<Record<string, number>>(() => read(SEEN_KEY, {}))
  const [now, setNow] = useState(() => Date.now())
  const [ui, setUi] = useState<UiState>(readUi)
  const [preview, setPreview] = useState<{ name: string; text: string } | null>(null)
  const [busy, setBusy] = useState<{ room: ChatRoom; label: string } | null>(null)
  const uiRef = useRef(ui)
  const markReadRef = useRef<() => void>(() => {})
  const envRef = useRef<ToolEnv>({ fleet, items: plan.items, settings, today: todayStr() })
  const busyRef = useRef(false)

  const engineUnit = useMemo(() => {
    const m = /\/(?:equipment|report)\/engine-(\d+)/.exec(pathname)
    return m ? Number(m[1]) : null
  }, [pathname])

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
    const latest = readMessages().reduce((m, x) => (roomOf(x) === 'peer' ? Math.max(m, x.at) : m), 0)
    const cur = read<Record<string, number>>(READ_KEY, {})
    if ((cur[role] ?? 0) >= latest) return
    const next = { ...cur, [role]: latest }
    write(READ_KEY, next)
    setReadAt(next)
  }, [role])

  useEffect(() => {
    uiRef.current = ui
    markReadRef.current = markRead
    envRef.current = { fleet, items: plan.items, settings, today: todayStr() }
  })

  // 다른 창에서 메시지·읽음·접속 상태가 바뀌면 반영한다
  useEffect(() => {
    const on = (e: StorageEvent) => {
      if (e.key === MSG_KEY || e.key === null) {
        const next = readMessages()
        setMessages((prev) => {
          const added = next.filter((m) => !prev.some((p) => p.id === m.id) && m.from !== role && roomOf(m) === 'peer')
          const last = added[added.length - 1]
          if (last && !uiRef.current.open) setPreview({ name: last.name, text: last.text })
          // 대화창이 열려 있는 동안 도착한 메시지는 바로 읽은 것으로 본다
          if (last && uiRef.current.open && uiRef.current.view === 'peer') window.setTimeout(() => markReadRef.current(), 0)
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

  // 내가 물어서 나온 봇 답변은 이미 읽은 것으로 센다
  const unread = useMemo(
    () => messages.filter((m) => roomOf(m) === 'peer' && m.from !== role && !(m.from === 'bot' && m.asker === role) && m.at > (readAt[role] ?? 0)).length,
    [messages, readAt, role],
  )

  const append = useCallback((msg: ChatMessage) => {
    // 다른 창이 방금 보낸 메시지를 덮어쓰지 않도록 저장소의 최신 목록에서 시작한다
    const next = [...readMessages(), msg].slice(-MAX_MESSAGES)
    write(MSG_KEY, next)
    setMessages(next)
  }, [])

  const runBot = useCallback(
    async (room: ChatRoom) => {
      if (!user || busyRef.current) return
      busyRef.current = true
      setBusy({ room, label: '질문을 읽는 중' })
      const base = { id: newId(), from: 'bot' as const, name: BOT_NAME, at: Date.now(), room, asker: user.role, ...(room === 'bot' ? { owner: user.role } : {}) }
      try {
        const recent = readMessages()
          .filter((m) => roomOf(m) === room && (room === 'peer' || m.owner === user.role))
          .slice(-HISTORY)
        const result = await askBot(toContents(recent), { role: user.role, today: todayStr(), path: window.location.pathname, engineUnit }, envRef.current, (label) => setBusy({ room, label: `${label} 중` }))
        append(result.ok ? { ...base, text: result.text, tools: result.tools, followups: followUps(result.tools, result.text) } : { ...base, text: result.message, error: true, at: Date.now() })
      } catch {
        // 어떤 이유로든 실패해도 '조회 중' 상태에 갇히지 않고 안내를 남긴다
        append({ ...base, text: '답변을 만드는 중에 문제가 생겼습니다. 잠시 후 다시 물어봐 주세요.', error: true, at: Date.now() })
      } finally {
        busyRef.current = false
        setBusy(null)
      }
    },
    [user, engineUnit, append],
  )

  const send = useCallback(
    (text: string, room: ChatRoom = 'peer') => {
      const t = text.trim().slice(0, MAX_LENGTH)
      if (!t || !user) return
      const toBot = room === 'bot' || MENTION.test(t)
      if (toBot && busyRef.current) return
      append({ id: newId(), from: user.role, name: user.name, text: t, at: Date.now(), room, ...(room === 'bot' ? { owner: user.role } : {}) })
      if (toBot) void runBot(room)
    },
    [user, append, runBot],
  )

  const online = (seen[peerAccount.role] ?? 0) > 0 && now - (seen[peerAccount.role] ?? 0) < ONLINE_MS
  const starters = useMemo(() => starterQuestions(role, engineUnit), [role, engineUnit])

  const value = useMemo(
    () => ({
      messages,
      peer: { name: peerAccount.name, role: peerAccount.role, online },
      unread,
      send,
      busy,
      starters,
      open: ui.open,
      setOpen: (v: boolean) => {
        patchUi({ open: v })
        if (v) {
          setPreview(null)
          if (ui.view === 'peer') markRead()
        }
      },
      view: ui.view,
      setView: (v: ChatView) => {
        patchUi({ view: v })
        if (v === 'peer') markRead()
      },
      expanded: ui.expanded,
      setExpanded: (v: boolean) => patchUi({ expanded: v }),
      markRead,
      preview,
      dismissPreview: () => setPreview(null),
    }),
    [messages, peerAccount, online, unread, send, busy, starters, ui, patchUi, markRead, preview],
  )

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

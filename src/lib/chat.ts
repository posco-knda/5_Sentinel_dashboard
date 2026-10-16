import { createContext, useContext } from 'react'
import type { Role } from './auth'
import type { ToolLog } from './chat/bot'

export type ChatRoom = 'peer' | 'bot'

export interface ChatMessage {
  id: string
  /** 사람이 보낸 메시지는 역할, 봇 답변은 'bot' */
  from: Role | 'bot'
  name: string
  text: string
  at: number
  /** 어느 대화방의 메시지인가 (없으면 사람 대화방) */
  room?: ChatRoom
  /** 봇 대화방은 질문한 사람만 본다 */
  owner?: Role
  /** 봇 답변: 누가 물어서 나온 답인가 */
  asker?: Role
  /** 봇 답변: 조회한 도구 (근거 보기) */
  tools?: ToolLog[]
  /** 봇 답변: 이어서 물어볼 만한 질문 */
  followups?: string[]
  /** 봇 답변을 만들지 못한 경우 */
  error?: boolean
}

export interface Peer {
  name: string
  role: Role
  online: boolean
}

export type ChatView = 'list' | ChatRoom

export interface ChatContextValue {
  messages: ChatMessage[]
  peer: Peer
  /** 사람 대화방에서 아직 읽지 않은 메시지 수 */
  unread: number
  /** 메시지를 보낸다. 봇 대화방이거나 @Sentinel이 들어 있으면 봇이 답한다 */
  send: (text: string, room?: ChatRoom) => void
  /** 봇이 답을 만드는 중이면 어느 대화방인지와 지금 하는 일 */
  busy: { room: ChatRoom; label: string } | null
  /** 지금 역할·화면에 맞춘 추천 질문 */
  starters: string[]
  open: boolean
  setOpen: (v: boolean) => void
  view: ChatView
  setView: (v: ChatView) => void
  expanded: boolean
  setExpanded: (v: boolean) => void
  /** 지금까지 온 메시지를 모두 읽음으로 표시 */
  markRead: () => void
  /** 창이 닫혀 있을 때 새로 도착한 메시지 미리보기 */
  preview: { name: string; text: string } | null
  dismissPreview: () => void
}

export const ChatContext = createContext<ChatContextValue | null>(null)

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}

export const MAX_MESSAGES = 300
export const MAX_LENGTH = 1000
export const BOT_NAME = 'Sentinel'

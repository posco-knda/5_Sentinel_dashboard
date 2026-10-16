import { createContext, useContext } from 'react'
import type { Role } from './auth'

export interface ChatMessage {
  id: string
  /** 사람이 보낸 메시지는 역할, 봇 답변은 'bot' */
  from: Role | 'bot'
  name: string
  text: string
  at: number
}

export interface Peer {
  name: string
  role: Role
  online: boolean
}

export type ChatView = 'list' | 'thread'

export interface ChatContextValue {
  messages: ChatMessage[]
  peer: Peer
  unread: number
  send: (text: string) => void
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

import { create } from 'zustand'
import { useAuthStore } from './auth-store'
import { aiApi, aiErrorKey } from '@/services/ai'
import type { AiCapabilities, AiConversation, AiConversationInput, AiLocale, AiMessage, AiSendInput } from '@/types/ai'

interface AiState {
  projectId: string | null
  generation: number
  selection: number
  capabilities: AiCapabilities | null
  capabilityLoading: boolean
  capabilityError: string | null
  conversations: AiConversation[]
  activeId: string | null
  messages: AiMessage[]
  loading: boolean
  sending: boolean
  error: string | null
  pending: Record<string, AiSendInput>
  provider: string
  reset: () => void
  loadCapabilities: (projectId: string) => Promise<void>
  loadConversations: (projectId: string) => Promise<void>
  open: (id: string | null) => Promise<void>
  createConversation: (input: AiConversationInput) => Promise<string | null>
  remove: (id: string) => Promise<void>
  setProvider: (provider: string) => void
  send: (message: string, locale: AiLocale, direction?: string, webSearch?: boolean) => Promise<boolean>
  retry: () => Promise<boolean>
}

const initial = {
  projectId: null, capabilities: null, capabilityLoading: false, capabilityError: null,
  conversations: [], activeId: null, messages: [], loading: false, sending: false,
  error: null, pending: {}, provider: '',
}

export const useAiStore = create<AiState>()((set, get) => {
  const current = (generation: number) => get().generation === generation
  const sendRequest = async (input: AiSendInput): Promise<boolean> => {
    const { projectId, generation, selection, activeId, sending } = get()
    if (!projectId || !activeId || sending) return false
    set({ sending: true, error: null, pending: { ...get().pending, [activeId]: input } })
    try {
      const result = await aiApi.send(projectId, activeId, input)
      if (!current(generation)) return false
      const pending = { ...get().pending }
      delete pending[activeId]
      if (get().selection === selection) {
        const ids = new Set(result.messages.map((message) => message.id))
        set({ messages: [...get().messages.filter((message) => !ids.has(message.id)), ...result.messages], sending: false, pending })
      } else {
        set({ sending: false, pending })
      }
      return true
    } catch (error) {
      if (current(generation) && get().selection === selection) set({ sending: false, error: aiErrorKey(error) })
      else if (current(generation)) set({ sending: false })
      return false
    }
  }
  return {
    ...initial, generation: 0, selection: 0,
    reset: () => set({ ...initial, generation: get().generation + 1, selection: get().selection + 1 }),
    async loadCapabilities(projectId) {
      if (get().projectId !== projectId) set({ ...initial, projectId, generation: get().generation + 1, selection: get().selection + 1 })
      if (get().capabilityLoading) return
      const generation = get().generation
      set({ capabilityLoading: true, capabilityError: null })
      try {
        const capabilities = await aiApi.capabilities(projectId)
        if (current(generation)) set({ capabilities, capabilityLoading: false })
      } catch (error) {
        if (current(generation)) set({ capabilities: null, capabilityLoading: false, capabilityError: aiErrorKey(error) })
      }
    },
    async loadConversations(projectId) {
      const generation = get().generation
      if (get().projectId !== projectId) return
      set({ loading: true, error: null })
      try {
        const conversations = await aiApi.conversations(projectId)
        if (!current(generation)) return
        const known = get().conversations
        const ids = new Set(conversations.map((item) => item.id))
        set({
          conversations: [...conversations, ...known.filter((item) => !ids.has(item.id))],
          loading: false,
        })
      } catch (error) {
        if (current(generation)) set({ error: aiErrorKey(error), loading: false })
      }
    },
    async open(id) {
      const { projectId, generation } = get()
      const selection = get().selection + 1
      set({ activeId: id, messages: [], selection, sending: false, loading: !!id, error: null })
      if (!id || !projectId) return
      try {
        const conversation = await aiApi.conversation(projectId, id)
        if (current(generation) && get().selection === selection) set({ messages: conversation.messages, loading: false })
      } catch (error) {
        if (current(generation) && get().selection === selection) set({ loading: false, error: aiErrorKey(error) })
      }
    },
    async createConversation(input) {
      const { projectId, generation, selection } = get()
      if (!projectId) return null
      set({ loading: true, error: null })
      try {
        const conversation = await aiApi.createConversation(projectId, input)
        if (!current(generation)) return null
        const conversations = [conversation, ...get().conversations.filter((item) => item.id !== conversation.id)]
        if (get().selection === selection) {
          set({ conversations, activeId: conversation.id, messages: [], loading: false, sending: false, selection: selection + 1 })
        } else {
          set({ conversations, loading: false })
        }
        return conversation.id
      } catch (error) {
        if (current(generation)) set({ loading: false, error: aiErrorKey(error) })
        return null
      }
    },
    async remove(id) {
      const { projectId, generation } = get()
      if (!projectId) return
      try {
        await aiApi.deleteConversation(projectId, id)
        if (!current(generation)) return
        set({ conversations: get().conversations.filter((conversation) => conversation.id !== id) })
        if (get().activeId === id) await get().open(null)
      } catch (error) {
        if (current(generation)) set({ error: aiErrorKey(error) })
      }
    },
    setProvider: (provider) => set({ provider }),
    send(message, locale, direction, webSearch) {
      const previous = get().activeId ? get().pending[get().activeId!] : undefined
      const trimmedDirection = direction?.trim() || undefined
      const useWeb = webSearch === true
      const input = previous?.message === message.trim() && previous.direction === trimmedDirection && Boolean(previous.webSearch) === useWeb ? previous : {
        message: message.trim(), ...(trimmedDirection ? { direction: trimmedDirection } : {}), ...(useWeb ? { webSearch: true } : {}), locale, requestId: crypto.randomUUID(), ...(get().provider ? { provider: get().provider } : {}),
      }
      return sendRequest(input)
    },
    retry() {
      const { activeId, pending } = get()
      return activeId && pending[activeId] ? sendRequest(pending[activeId]) : Promise.resolve(false)
    },
  }
})

const unsubscribeAuth = useAuthStore.subscribe((state, previous) => {
  if (state.user?.id !== previous.user?.id) useAiStore.getState().reset()
})

if (import.meta.hot) import.meta.hot.dispose(unsubscribeAuth)

import { create } from 'zustand'

export interface Toast {
  id: string
  type: 'success' | 'error'
  message: string
}

interface ToastState {
  toasts: Toast[]
  success: (message: string) => void
  error: (message: string) => void
  remove: (id: string) => void
}

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  success: (message) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type: 'success', message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3000)
  },
  error: (message) => {
    const id = crypto.randomUUID()
    set((s) => ({ toasts: [...s.toasts, { id, type: 'error', message }] }))
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 4000)
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

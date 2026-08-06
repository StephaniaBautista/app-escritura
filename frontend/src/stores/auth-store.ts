import { create } from 'zustand'

interface User {
  id: string
  email: string
  name?: string
  role?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isInitialized: boolean
  error: string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  register: (email: string, password: string, name?: string) => Promise<void>
  logout: () => Promise<void>
  checkSession: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitialized: false,
  error: null,

  login: async (email: string, password: string, rememberMe?: boolean) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      })

      if (!response.ok) {
        const raw = await response.text()
        console.error(`[auth] sign-in ${response.status}:`, raw)
        let message = 'Error al iniciar sesión'
        try {
          const error = JSON.parse(raw)
          message = error.message || error.error?.message || message
        } catch { message = raw || message }
        throw new Error(message)
      }

      const data = await response.json()
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  register: async (email: string, password: string, name?: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, name }),
      })

      if (!response.ok) {
        const raw = await response.text()
        console.error(`[auth] sign-up ${response.status}:`, raw)
        let message = 'Error al registrar usuario'
        try {
          const error = JSON.parse(raw)
          message = error.message || error.error?.message || message
        } catch { message = raw || message }
        throw new Error(message)
      }

      const data = await response.json()
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al registrar usuario'
      set({ error: message, isLoading: false })
      throw error
    }
  },

  logout: async () => {
    set({ isLoading: true, error: null })
    try {
      await fetch('/api/auth/sign-out', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    } finally {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },

  checkSession: async () => {
    set({ isLoading: true })
    try {
      const response = await fetch('/api/auth/get-session', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Sesión inválida')
      }

      const data = await response.json()
      set({
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      })
    } catch (error) {
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      })
    }
  },

  clearError: () => set({ error: null }),
}))

import type { OptionType } from '@/types/story'

export interface StoryOption {
  id: string
  type: string
  value: string
  label: string
  fandoms: string[]
  isDefault: boolean
  createdAt: string
}

const API = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...headers, ...options?.headers as Record<string, string> },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
    throw new Error(error.error?.message || `Error ${res.status}`)
  }
  return res.json()
}

export const storyOptionsApi = {
  list: (type: OptionType, fandoms?: string[]) => {
    const base = `${API}/story-options?type=${encodeURIComponent(type)}`
    const fandomQuery = fandoms === undefined ? '' : `&fandoms=${encodeURIComponent(fandoms.join(','))}`
    return fetchJson<StoryOption[]>(base + fandomQuery)
  },

  listAll: () =>
    fetchJson<StoryOption[]>(`${API}/story-options/all`),

  create: (type: OptionType, value: string, label: string, fandoms?: string[]) =>
    fetchJson<StoryOption>(`${API}/story-options`, {
      method: 'POST',
      body: JSON.stringify({ type, value, label, fandoms }),
    }),

  delete: (id: string) =>
    fetchJson<{ ok: boolean }>(`${API}/story-options/${id}`, {
      method: 'DELETE',
    }),
}

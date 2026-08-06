import type { OptionType } from '@/types/story'
import type { StoryOption } from './options'

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
    const error = await res.json().catch(() => ({ error: { message: 'Error' } }))
    throw new Error(error.error?.message || `Error ${res.status}`)
  }
  return res.json()
}

export const adminApi = {
  listGroups: (type: OptionType) =>
    fetchJson<{ groups: StoryOption[][] }>(`${API}/admin/story-options/groups?type=${encodeURIComponent(type)}`),

  delete: (id: string) =>
    fetchJson<{ ok: boolean }>(`${API}/admin/story-options/${id}`, {
      method: 'DELETE',
    }),
}

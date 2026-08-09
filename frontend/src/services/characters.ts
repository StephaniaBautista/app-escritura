import type { Character, CharacterInput } from '@/types/character'

const API = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
    throw new Error(error.error?.message || `Error ${res.status}`)
  }
  return res.json()
}

export const charactersApi = {
  list: (projectId: string) =>
    fetchJson<Character[]>(`${API}/projects/${projectId}/characters`),

  get: (id: string) =>
    fetchJson<Character>(`${API}/characters/${id}`),

  create: (projectId: string, data: CharacterInput) =>
    fetchJson<Character>(`${API}/projects/${projectId}/characters`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: CharacterInput) =>
    fetchJson<Character>(`${API}/characters/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchJson<{ message: string }>(`${API}/characters/${id}`, {
      method: 'DELETE',
    }),

  evolve: (id: string, reason: string, changes: CharacterInput) =>
    fetchJson<Character>(`${API}/characters/${id}/evolve`, {
      method: 'POST',
      body: JSON.stringify({ reason, changes }),
    }),

  uploadImage: (id: string, dataUrl: string) =>
    fetchJson<Character>(`${API}/characters/${id}/image`, {
      method: 'PUT',
      body: JSON.stringify({ dataUrl }),
    }),

  deleteImage: (id: string) =>
    fetchJson<Character>(`${API}/characters/${id}/image`, {
      method: 'DELETE',
    }),
}

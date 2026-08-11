import type { CharacterRelationship, RelationshipInput, RelationshipType } from '@/types/relationship'

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
  if (res.status === 204) return undefined as T
  return res.json()
}

export const relationshipsApi = {
  list: (projectId: string, type?: RelationshipType) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : ''
    return fetchJson<CharacterRelationship[]>(`${API}/projects/${projectId}/relationships${query}`)
  },

  create: (projectId: string, data: RelationshipInput) =>
    fetchJson<CharacterRelationship>(`${API}/projects/${projectId}/relationships`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: RelationshipInput) =>
    fetchJson<CharacterRelationship>(`${API}/relationships/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: async (id: string): Promise<void> => {
    const res = await fetch(`${API}/relationships/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (!res.ok && res.status !== 404) {
      const error = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
      throw new Error(error.error?.message || `Error ${res.status}`)
    }
  },
}

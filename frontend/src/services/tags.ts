const API = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body) headers['Content-Type'] = 'application/json'
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: `Error ${res.status}` } }))
    throw new Error(error.error?.message || `Error ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export type TagKind = 'rating' | 'warning' | 'category' | 'fandom' | 'relationship' | 'character' | 'freeform'

export interface Tag {
  id: string
  projectId: string
  name: string
  kind: TagKind
  createdAt: string
}

export const tagsApi = {
  listByProject: (projectId: string) => fetchJson<Tag[]>(`${API}/projects/${projectId}/tags`),

  listAll: () => fetchJson<Tag[]>(`${API}/tags`),

  create: (projectId: string, data: { name: string; kind?: TagKind }) =>
    fetchJson<Tag>(`${API}/projects/${projectId}/tags`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { name?: string; kind?: TagKind }) =>
    fetchJson<Tag>(`${API}/tags/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    fetchJson<void>(`${API}/tags/${id}`, { method: 'DELETE' }),
}

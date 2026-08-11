import type { Diagram, DiagramInput, DiagramType } from '@/types/diagram'

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

export const diagramsApi = {
  list: (projectId: string) =>
    fetchJson<Diagram[]>(`${API}/projects/${projectId}/diagrams`),

  get: (id: string) =>
    fetchJson<Diagram>(`${API}/diagrams/${id}`),

  create: (projectId: string, data: DiagramInput) =>
    fetchJson<Diagram>(`${API}/projects/${projectId}/diagrams`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generate: (projectId: string, type: Extract<DiagramType, 'familyTree' | 'relationships'>, name?: string) =>
    fetchJson<Diagram>(`${API}/projects/${projectId}/diagrams/generate`, {
      method: 'POST',
      body: JSON.stringify({ type, name: name ?? null }),
    }),

  update: (id: string, data: DiagramInput) =>
    fetchJson<Diagram>(`${API}/diagrams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchJson<{ message: string }>(`${API}/diagrams/${id}`, {
      method: 'DELETE',
    }),
}

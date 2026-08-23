import type { TimelineEra, TimelineEraInput, TimelineEvent, TimelineEventInput } from '@/types/timeline'

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

export const timelineApi = {
  list: (projectId: string) =>
    fetchJson<TimelineEvent[]>(`${API}/projects/${projectId}/timeline`),

  create: (projectId: string, data: TimelineEventInput) =>
    fetchJson<TimelineEvent>(`${API}/projects/${projectId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: TimelineEventInput) =>
    fetchJson<TimelineEvent>(`${API}/timeline/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchJson<{ message: string }>(`${API}/timeline/${id}`, {
      method: 'DELETE',
    }),

  listEras: (projectId: string) =>
    fetchJson<TimelineEra[]>(`${API}/projects/${projectId}/timeline-eras`),

  createEra: (projectId: string, data: TimelineEraInput) =>
    fetchJson<TimelineEra>(`${API}/projects/${projectId}/timeline-eras`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteEra: (id: string) =>
    fetchJson<{ message: string }>(`${API}/timeline-eras/${id}`, {
      method: 'DELETE',
    }),
}

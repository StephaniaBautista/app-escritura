import type { MapBoard, MapBoardInput, MapCanvas } from '@/types/maps'

const API = '/api'

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {}
  if (options?.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
    const message = typeof payload.error === 'string'
      ? payload.error
      : payload.error?.message || `Error ${res.status}`
    throw new Error(message)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const mapsApi = {
  list: (projectId: string) =>
    fetchJson<MapBoard[]>(`${API}/projects/${projectId}/maps`),
  create: (projectId: string, name: string) =>
    fetchJson<MapBoard>(`${API}/projects/${projectId}/maps`, { method: 'POST', body: JSON.stringify({ name }) }),
  update: (id: string, data: MapBoardInput) =>
    fetchJson<MapBoard>(`${API}/maps/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  saveCanvas: (id: string, canvas: MapCanvas) =>
    fetchJson<MapBoard>(`${API}/maps/${id}`, { method: 'PUT', body: JSON.stringify({ canvas }) }),
  delete: (id: string) =>
    fetchJson<void>(`${API}/maps/${id}`, { method: 'DELETE' }),
  uploadBackground: (id: string, dataUrl: string) =>
    fetchJson<MapBoard>(`${API}/maps/${id}/background`, { method: 'PUT', body: JSON.stringify({ dataUrl }) }),
  deleteBackground: (id: string) =>
    fetchJson<MapBoard>(`${API}/maps/${id}/background`, { method: 'DELETE' }),
}

import type {
  LoreEntry, LoreEntryInput,
  Race, RaceInput,
  GlossaryEntry, GlossaryEntryInput,
  Creature, CreatureInput,
  Location, LocationInput,
  WorldRoute, WorldRouteInput,
} from '@/types/worldbuilding'

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

export const worldbuildingApi = {
  listLore: (projectId: string) =>
    fetchJson<LoreEntry[]>(`${API}/projects/${projectId}/lore`),
  createLore: (projectId: string, data: LoreEntryInput) =>
    fetchJson<LoreEntry>(`${API}/projects/${projectId}/lore`, { method: 'POST', body: JSON.stringify(data) }),
  updateLore: (id: string, data: LoreEntryInput) =>
    fetchJson<LoreEntry>(`${API}/lore/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLore: (id: string) =>
    fetchJson<{ message: string }>(`${API}/lore/${id}`, { method: 'DELETE' }),
  uploadLorePdf: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return fetchJson<LoreEntry>(`${API}/lore/${id}/pdf`, { method: 'PUT', body })
  },
  deleteLorePdf: (id: string) =>
    fetchJson<LoreEntry>(`${API}/lore/${id}/pdf`, { method: 'DELETE' }),

  listRaces: (projectId: string) =>
    fetchJson<Race[]>(`${API}/projects/${projectId}/races`),
  createRace: (projectId: string, data: RaceInput) =>
    fetchJson<Race>(`${API}/projects/${projectId}/races`, { method: 'POST', body: JSON.stringify(data) }),
  updateRace: (id: string, data: RaceInput) =>
    fetchJson<Race>(`${API}/races/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRace: (id: string) =>
    fetchJson<{ message: string }>(`${API}/races/${id}`, { method: 'DELETE' }),
  uploadRaceImage: (id: string, dataUrl: string) =>
    fetchJson<Race>(`${API}/races/${id}/image`, { method: 'PUT', body: JSON.stringify({ dataUrl }) }),
  deleteRaceImage: (id: string) =>
    fetchJson<Race>(`${API}/races/${id}/image`, { method: 'DELETE' }),
  uploadRacePdf: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return fetchJson<Race>(`${API}/races/${id}/pdf`, { method: 'PUT', body })
  },
  deleteRacePdf: (id: string) =>
    fetchJson<Race>(`${API}/races/${id}/pdf`, { method: 'DELETE' }),

  listGlossary: (projectId: string) =>
    fetchJson<GlossaryEntry[]>(`${API}/projects/${projectId}/glossary`),
  createGlossary: (projectId: string, data: GlossaryEntryInput) =>
    fetchJson<GlossaryEntry>(`${API}/projects/${projectId}/glossary`, { method: 'POST', body: JSON.stringify(data) }),
  updateGlossary: (id: string, data: GlossaryEntryInput) =>
    fetchJson<GlossaryEntry>(`${API}/glossary/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGlossary: (id: string) =>
    fetchJson<{ message: string }>(`${API}/glossary/${id}`, { method: 'DELETE' }),

  listCreatures: (projectId: string) =>
    fetchJson<Creature[]>(`${API}/projects/${projectId}/creatures`),
  createCreature: (projectId: string, data: CreatureInput) =>
    fetchJson<Creature>(`${API}/projects/${projectId}/creatures`, { method: 'POST', body: JSON.stringify(data) }),
  updateCreature: (id: string, data: CreatureInput) =>
    fetchJson<Creature>(`${API}/creatures/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCreature: (id: string) =>
    fetchJson<{ message: string }>(`${API}/creatures/${id}`, { method: 'DELETE' }),
  uploadCreatureImage: (id: string, dataUrl: string) =>
    fetchJson<Creature>(`${API}/creatures/${id}/image`, { method: 'PUT', body: JSON.stringify({ dataUrl }) }),
  deleteCreatureImage: (id: string) =>
    fetchJson<Creature>(`${API}/creatures/${id}/image`, { method: 'DELETE' }),

  listLocations: (projectId: string) =>
    fetchJson<Location[]>(`${API}/projects/${projectId}/locations`),
  createLocation: (projectId: string, data: LocationInput) =>
    fetchJson<Location>(`${API}/projects/${projectId}/locations`, { method: 'POST', body: JSON.stringify(data) }),
  updateLocation: (id: string, data: LocationInput) =>
    fetchJson<Location>(`${API}/locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLocation: (id: string) =>
    fetchJson<{ message: string }>(`${API}/locations/${id}`, { method: 'DELETE' }),

  listRoutes: (projectId: string) =>
    fetchJson<WorldRoute[]>(`${API}/projects/${projectId}/routes`),
  createRoute: (projectId: string, data: WorldRouteInput) =>
    fetchJson<WorldRoute>(`${API}/projects/${projectId}/routes`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRoute: (id: string) =>
    fetchJson<{ message: string }>(`${API}/routes/${id}`, { method: 'DELETE' }),
}

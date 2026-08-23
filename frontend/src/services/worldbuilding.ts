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

export const worldbuildingApi = {
  listLore: (projectId: string) =>
    fetchJson<LoreEntry[]>(`${API}/projects/${projectId}/lore`),
  createLore: (projectId: string, data: LoreEntryInput) =>
    fetchJson<LoreEntry>(`${API}/projects/${projectId}/lore`, { method: 'POST', body: JSON.stringify(data) }),
  updateLore: (id: string, data: LoreEntryInput) =>
    fetchJson<LoreEntry>(`${API}/lore/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLore: (id: string) =>
    fetchJson<{ message: string }>(`${API}/lore/${id}`, { method: 'DELETE' }),

  listRaces: (projectId: string) =>
    fetchJson<Race[]>(`${API}/projects/${projectId}/races`),
  createRace: (projectId: string, data: RaceInput) =>
    fetchJson<Race>(`${API}/projects/${projectId}/races`, { method: 'POST', body: JSON.stringify(data) }),
  updateRace: (id: string, data: RaceInput) =>
    fetchJson<Race>(`${API}/races/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteRace: (id: string) =>
    fetchJson<{ message: string }>(`${API}/races/${id}`, { method: 'DELETE' }),

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

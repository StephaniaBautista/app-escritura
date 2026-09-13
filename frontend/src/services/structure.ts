import type {
  StructureBoard, BoardInput,
  StructureColumn, ColumnInput,
  StructureCard, CardInput,
  Subplot, SubplotInput,
} from '@/types/structure'

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

export const structureApi = {
  listBoards: (projectId: string) =>
    fetchJson<StructureBoard[]>(`${API}/projects/${projectId}/boards`),
  createBoard: (projectId: string, data: BoardInput) =>
    fetchJson<StructureBoard>(`${API}/projects/${projectId}/boards`, { method: 'POST', body: JSON.stringify(data) }),
  updateBoard: (id: string, data: BoardInput) =>
    fetchJson<StructureBoard>(`${API}/boards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBoard: (id: string) =>
    fetchJson<void>(`${API}/boards/${id}`, { method: 'DELETE' }),

  createColumn: (boardId: string, data: ColumnInput) =>
    fetchJson<StructureColumn>(`${API}/boards/${boardId}/columns`, { method: 'POST', body: JSON.stringify(data) }),
  updateColumn: (id: string, data: ColumnInput) =>
    fetchJson<StructureColumn>(`${API}/columns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteColumn: (id: string) =>
    fetchJson<void>(`${API}/columns/${id}`, { method: 'DELETE' }),
  reorderColumns: (boardId: string, columnIds: string[]) =>
    fetchJson<StructureColumn[]>(`${API}/boards/${boardId}/columns/reorder`, { method: 'PUT', body: JSON.stringify({ columnIds }) }),

  createCard: (columnId: string, data: CardInput) =>
    fetchJson<StructureCard>(`${API}/columns/${columnId}/cards`, { method: 'POST', body: JSON.stringify(data) }),
  updateCard: (id: string, data: CardInput) =>
    fetchJson<StructureCard>(`${API}/cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCard: (id: string) =>
    fetchJson<void>(`${API}/cards/${id}`, { method: 'DELETE' }),
  reorderCards: (columnId: string, cardIds: string[]) =>
    fetchJson<StructureCard[]>(`${API}/columns/${columnId}/cards/reorder`, { method: 'PUT', body: JSON.stringify({ cardIds }) }),
  moveCard: (id: string, toColumnId: string, toIndex: number) =>
    fetchJson<StructureCard>(`${API}/cards/${id}/move`, { method: 'PUT', body: JSON.stringify({ toColumnId, toIndex }) }),
  syncChapters: (boardId: string) =>
    fetchJson<{ created: number; board: StructureBoard }>(`${API}/boards/${boardId}/sync-chapters`, { method: 'POST' }),
}

export const subplotsApi = {
  list: (projectId: string) =>
    fetchJson<Subplot[]>(`${API}/projects/${projectId}/subplots`),
  create: (projectId: string, data: SubplotInput) =>
    fetchJson<Subplot>(`${API}/projects/${projectId}/subplots`, { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: SubplotInput) =>
    fetchJson<Subplot>(`${API}/subplots/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) =>
    fetchJson<void>(`${API}/subplots/${id}`, { method: 'DELETE' }),
  reorder: (projectId: string, subplotIds: string[]) =>
    fetchJson<Subplot[]>(`${API}/projects/${projectId}/subplots/reorder`, { method: 'PUT', body: JSON.stringify({ subplotIds }) }),
}

export type ActivityType = 'folder_created' | 'document_created' | 'document_edited'

export interface ActivityItem {
  id: string
  type: ActivityType
  title: string
  folderId?: string
  documentId?: string
  timestamp: number
}

export interface ActivityPayload {
  type: ActivityType
  title: string
  folderId?: string
  documentId?: string
}

export interface ActivityRow {
  id: string
  type: string
  title: string
  folderId: string | null
  documentId: string | null
  createdAt: string
}

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
    const error = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
    throw new Error(error.error?.message || `Error ${res.status}`)
  }
  return res.json()
}

export const activityApi = {
  list: () => fetchJson<ActivityRow[]>(`${API}/activity`),

  create: (data: ActivityPayload) =>
    fetchJson<ActivityRow>(`${API}/activity`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  removeByDocument: (documentId: string) =>
    fetchJson<{ ok: boolean }>(`${API}/activity/document/${documentId}`, {
      method: 'DELETE',
    }),

  removeByFolder: (folderId: string) =>
    fetchJson<{ ok: boolean }>(`${API}/activity/folder/${folderId}`, {
      method: 'DELETE',
    }),
}

export function toActivityItem(row: ActivityRow): ActivityItem {
  return {
    id: row.id,
    type: row.type as ActivityType,
    title: row.title,
    folderId: row.folderId ?? undefined,
    documentId: row.documentId ?? undefined,
    timestamp: new Date(row.createdAt).getTime(),
  }
}

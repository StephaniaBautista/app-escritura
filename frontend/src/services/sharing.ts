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

export interface SharedLink {
  id: string
  token: string
  documentId: string
  includeChildren: boolean
  allowComments: boolean
  revokedAt: string | null
  createdAt: string
}

export interface SharedComment {
  id: string
  blockIndex: number
  quote: string
  body: string
  authorName: string
  resolved: boolean
  createdAt: string
  orphan: boolean
  effectiveBlockIndex: number | null
}

export interface BlockOutline {
  type: string
  text: string
}

export interface SharedDocument {
  token: string
  title: string
  blocks: BlockOutline[]
  ownerName: string
  includeChildren: boolean
  allowComments: boolean
  children: { title: string; blocks: BlockOutline[] }[]
  comments: SharedComment[]
}

export interface SharedWithMeItem {
  token: string
  documentId: string
  title: string
  ownerName: string
  lastViewedAt: string
  allowComments: boolean
}

export const sharingApi = {
  createLink: (documentId: string, data: { includeChildren?: boolean; allowComments?: boolean }) =>
    fetchJson<SharedLink>(`${API}/documents/${documentId}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLink: (documentId: string) => fetchJson<SharedLink>(`${API}/documents/${documentId}/share`),

  revokeLink: (documentId: string) =>
    fetchJson<void>(`${API}/documents/${documentId}/share`, { method: 'DELETE' }),

  readShared: (token: string) => fetchJson<SharedDocument>(`${API}/shared/${token}`),

  listComments: (token: string) => fetchJson<SharedComment[]>(`${API}/shared/${token}/comments`),

  addComment: (
    token: string,
    data: { blockIndex: number; quote?: string; body: string; authorName?: string },
  ) =>
    fetchJson<SharedComment>(`${API}/shared/${token}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordView: (token: string) =>
    fetchJson<{ ok: boolean }>(`${API}/shared/${token}/view`, { method: 'POST' }),

  resolveComment: (token: string, commentId: string, resolved: boolean) =>
    fetchJson<SharedComment>(`${API}/shared/${token}/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved }),
    }),

  deleteComment: (token: string, commentId: string) =>
    fetchJson<void>(`${API}/shared/${token}/comments/${commentId}`, { method: 'DELETE' }),

  listSharedWithMe: () => fetchJson<SharedWithMeItem[]>(`${API}/shared-with-me`),
}

export function sharedDocumentUrl(token: string): string {
  return `${window.location.origin}/shared/${token}`
}

import type { Project, Document, CreateProjectInput, CreateDocumentInput, UpdateDocumentInput, DocumentNode, Note, DocumentVersion } from '@/types/document'

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

export const projectsApi = {
  list: () => fetchJson<Project[]>(`${API}/projects`),

  getById: (id: string) => fetchJson<Project>(`${API}/projects/${id}`),

  create: (data: CreateProjectInput) =>
    fetchJson<Project>(`${API}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<CreateProjectInput>) =>
    fetchJson<Project>(`${API}/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchJson<{ message: string }>(`${API}/projects/${id}`, {
      method: 'DELETE',
    }),
}

export const documentsApi = {
  getTree: (projectId: string) =>
    fetchJson<DocumentNode[]>(`${API}/projects/${projectId}/documents`),

  getById: (id: string) => fetchJson<Document>(`${API}/documents/${id}`),

  create: (data: CreateDocumentInput) =>
    fetchJson<Document>(`${API}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateDocumentInput) =>
    fetchJson<Document>(`${API}/documents/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchJson<{ message: string }>(`${API}/documents/${id}`, {
      method: 'DELETE',
    }),

  duplicate: (id: string) =>
    fetchJson<Document>(`${API}/documents/${id}/duplicate`, {
      method: 'POST',
    }),
}


export const notesApi = {
  list: (documentId: string) =>
    fetchJson<Note[]>(`${API}/documents/${documentId}/notes`),

  listByProject: (projectId: string) =>
    fetchJson<Note[]>(`${API}/projects/${projectId}/notes`),

  create: (documentId: string, data: { title: string; content?: string }) =>
    fetchJson<Note>(`${API}/documents/${documentId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createForProject: (projectId: string, data: { title: string; content?: string }) =>
    fetchJson<Note>(`${API}/projects/${projectId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { title?: string; content?: string; isHidden?: boolean }) =>
    fetchJson<Note>(`${API}/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchJson<{ message: string }>(`${API}/notes/${id}`, {
      method: 'DELETE',
    }),
}

export const versionsApi = {
  list: (documentId: string) =>
    fetchJson<DocumentVersion[]>(`${API}/documents/${documentId}/versions`),

  create: (documentId: string) =>
    fetchJson<DocumentVersion>(`${API}/documents/${documentId}/versions`, {
      method: 'POST',
    }),

  get: (id: string) =>
    fetchJson<DocumentVersion>(`${API}/versions/${id}`),

  restore: (id: string) =>
    fetchJson<Document>(`${API}/versions/${id}/restore`, {
      method: 'POST',
    }),
}

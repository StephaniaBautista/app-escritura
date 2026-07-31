import type { Project, Document, CreateProjectInput, CreateDocumentInput, UpdateDocumentInput, DocumentNode } from '@/types/document'

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
}

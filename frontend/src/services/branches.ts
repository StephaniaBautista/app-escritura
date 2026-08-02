import type { Branch, CreateBranchInput, BranchGraphData, MergeResult, MergeInput } from '@/types/branch'

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

export const branchesApi = {
  list: (documentId: string) =>
    fetchJson<Branch[]>(`${API}/documents/${documentId}/branches`),

  create: (documentId: string, data: CreateBranchInput) =>
    fetchJson<Branch>(`${API}/documents/${documentId}/branches`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  get: (branchId: string) =>
    fetchJson<Branch>(`${API}/branches/${branchId}`),

  rename: (branchId: string, name: string) =>
    fetchJson<Branch>(`${API}/branches/${branchId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),

  delete: (branchId: string) =>
    fetchJson<{ ok: boolean }>(`${API}/branches/${branchId}`, {
      method: 'DELETE',
    }),

  getGraph: (documentId: string) =>
    fetchJson<BranchGraphData>(`${API}/documents/${documentId}/branches/graph`),

  merge: async (sourceBranchId: string, data: MergeInput): Promise<MergeResult> => {
    const res = await fetch(`${API}/branches/${sourceBranchId}/merge`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await res.json().catch(() => null)
    if (res.status === 409 && body?.merged === false) {
      return body as MergeResult
    }
    if (!res.ok) {
      throw new Error(body?.error?.message || `Error ${res.status}`)
    }
    return body as MergeResult
  },
}

import type { UserSettings, UpdateSettingsInput, AutoVersionCheckResult } from '@/types/settings'

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

export const settingsApi = {
  get: () => fetchJson<UserSettings>(`${API}/settings`),

  update: (data: UpdateSettingsInput) =>
    fetchJson<UserSettings>(`${API}/settings`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

export const autoVersionApi = {
  check: (documentId: string, trigger: string, lastActivityAt?: string, branchId?: string) =>
    fetchJson<AutoVersionCheckResult>(`${API}/auto-version/check/${documentId}`, {
      method: 'POST',
      body: JSON.stringify({ trigger, lastActivityAt, branchId }),
    }),

  updateActivity: (documentId: string, lastActivityAt: string) =>
    fetchJson<{ ok: boolean }>(`${API}/documents/${documentId}/activity`, {
      method: 'PATCH',
      body: JSON.stringify({ lastActivityAt }),
    }),
}

import type { OptionType } from '@/types/story'
import type { StoryOption } from './options'

export interface Role {
  id: string
  name: string
  label: string
  permissions: string[]
  isSystem: boolean
  userCount: number
  createdAt: string
}

export type UserStatus = 'active' | 'suspended' | 'banned'

export interface AdminUser {
  id: string
  email: string
  name: string | null
  role: string
  status: UserStatus
  suspendedUntil: string | null
  createdAt: string
}

export interface FandomNode {
  id: string
  value: string
  label: string
  isDefault: boolean
  counts: { ship: number; character: number }
}

export interface FandomChildren {
  ship: StoryOption[]
  character: StoryOption[]
}

export interface FandomTree {
  fandoms: FandomNode[]
  children: Record<string, FandomChildren>
}

export const ALL_PERMISSIONS = ['admin', 'moderate'] as const

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
    const error = await res.json().catch(() => ({ error: { message: 'Error' } }))
    throw new Error(error.error?.message || `Error ${res.status}`)
  }
  return res.json()
}

export const adminApi = {
  listFandomTree: () => fetchJson<FandomTree>(`${API}/admin/story-options/tree`),

  moveOption: (id: string, fandom: string) =>
    fetchJson<{ ok: boolean }>(`${API}/admin/story-options/${id}/fandom`, {
      method: 'PATCH',
      body: JSON.stringify({ fandom }),
    }),

  listGroups: (type: OptionType) =>
    fetchJson<{ groups: StoryOption[][] }>(`${API}/admin/story-options/groups?type=${encodeURIComponent(type)}`),

  deleteOption: (id: string) =>
    fetchJson<{ ok: boolean }>(`${API}/admin/story-options/${id}`, { method: 'DELETE' }),

  listRoles: () => fetchJson<Role[]>(`${API}/admin/roles`),

  createRole: (data: { name: string; label: string; permissions: string[] }) =>
    fetchJson<Role>(`${API}/admin/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateRole: (id: string, data: { label?: string; permissions?: string[] }) =>
    fetchJson<Role>(`${API}/admin/roles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteRole: (id: string) =>
    fetchJson<{ ok: boolean }>(`${API}/admin/roles/${id}`, { method: 'DELETE' }),

  listUsers: () => fetchJson<AdminUser[]>(`${API}/admin/users`),

  assignRole: (userId: string, role: string) =>
    fetchJson<{ ok: boolean }>(`${API}/admin/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  setUserStatus: (userId: string, status: UserStatus, until?: string) =>
    fetchJson<{ ok: boolean }>(`${API}/admin/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, until: until ?? null }),
    }),

  deleteUser: (userId: string) =>
    fetchJson<{ ok: boolean }>(`${API}/admin/users/${userId}`, { method: 'DELETE' }),
}

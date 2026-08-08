export interface StoryQuestion {
  id: string
  text: string
  textEn: string | null
  isDefault: boolean
  createdAt: string
}

export interface TemplateSection {
  id: string
  title?: string
  titleEn?: string
  questionIds: string[]
}

export interface StoryTemplate {
  id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
  sections: TemplateSection[]
  isDefault: boolean
  createdAt: string
}

export interface TemplateInput {
  name: string
  nameEn?: string | null
  description?: string | null
  descriptionEn?: string | null
  sections: TemplateSection[]
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
    headers: { ...headers, ...(options?.headers as Record<string, string>) },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: 'Error de red' } }))
    throw new Error(error.error?.message || `Error ${res.status}`)
  }
  return res.json()
}

export const storyBankApi = {
  listQuestions: () => fetchJson<StoryQuestion[]>(`${API}/story-questions`),

  createQuestion: (text: string, textEn?: string) =>
    fetchJson<StoryQuestion>(`${API}/story-questions`, {
      method: 'POST',
      body: JSON.stringify({ text, textEn }),
    }),

  updateQuestion: (id: string, input: { text: string; textEn?: string | null }) =>
    fetchJson<StoryQuestion>(`${API}/story-questions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteQuestion: (id: string) =>
    fetchJson<{ ok: boolean }>(`${API}/story-questions/${id}`, {
      method: 'DELETE',
    }),

  listTemplates: () => fetchJson<StoryTemplate[]>(`${API}/story-templates`),

  createTemplate: (input: TemplateInput) =>
    fetchJson<StoryTemplate>(`${API}/story-templates`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  updateTemplate: (id: string, input: Partial<TemplateInput>) =>
    fetchJson<StoryTemplate>(`${API}/story-templates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }),

  deleteTemplate: (id: string) =>
    fetchJson<{ ok: boolean }>(`${API}/story-templates/${id}`, {
      method: 'DELETE',
    }),
}

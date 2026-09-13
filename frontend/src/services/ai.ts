import type { AiAnalysis, AiAnalysisInput, AiAnalysisKind, AiCapabilities, AiCharacterFillInput, AiCharacterFillResult, AiConversation, AiConversationDetail, AiConversationInput, AiGenerationInput, AiMessage, AiSendInput, AiTagSuggestions, AiTimelineFillResult, AiWizardCompletion, AiWizardInput } from '@/types/ai'

export class AiRequestError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code)
    this.name = 'AiRequestError'
  }
}

async function request<T>(projectId: string, path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/ai${path}`, {
    credentials: 'include', method, signal,
    ...(body === undefined ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null)
    const code = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
      ? data.error : 'AI_REQUEST_FAILED'
    throw new AiRequestError(response.status, code)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const aiApi = {
  capabilities: (projectId: string) => request<AiCapabilities>(projectId, '/capabilities'),
  conversations: (projectId: string) => request<AiConversation[]>(projectId, '/conversations'),
  createConversation: (projectId: string, input: AiConversationInput) => request<AiConversation>(projectId, '/conversations', 'POST', input),
  conversation: (projectId: string, id: string) => request<AiConversationDetail>(projectId, `/conversations/${encodeURIComponent(id)}`),
  deleteConversation: (projectId: string, id: string) => request<void>(projectId, `/conversations/${encodeURIComponent(id)}`, 'DELETE'),
  send: (projectId: string, id: string, input: AiSendInput) => request<{ conversationId: string; messages: AiMessage[] }>(projectId, `/conversations/${encodeURIComponent(id)}/messages`, 'POST', input),
  analyze: (projectId: string, kind: AiAnalysisKind, input: AiAnalysisInput, signal?: AbortSignal) => request<AiAnalysis>(projectId, `/${kind}`, 'POST', input, signal),
  completeWizard: (projectId: string, input: AiWizardInput) => request<AiWizardCompletion>(projectId, '/wizard-completion', 'POST', input),
  suggestTags: (projectId: string, input: AiGenerationInput) => request<AiTagSuggestions>(projectId, '/tag-suggestions', 'POST', input),
  fillCharacters: (projectId: string, input: AiCharacterFillInput) => request<AiCharacterFillResult>(projectId, '/character-fill', 'POST', input),
  fillTimeline: (projectId: string, input: AiGenerationInput) => request<AiTimelineFillResult>(projectId, '/timeline-fill', 'POST', input),
}

export function aiErrorKey(error: unknown): string {
  if (error instanceof AiRequestError) {
    if (error.code === 'AI_WRITING_BLOCKED') return 'aiApp.errors.writing'
    if (error.code === 'AI_WIZARD_EMPTY') return 'aiApp.errors.empty'
    if (error.code === 'AI_WIZARD_INSUFFICIENT') return 'aiApp.errors.insufficient'
    if (error.code === 'AI_CHARACTER_COMPLETE') return 'aiApp.errors.characterComplete'
    if (error.status === 401) return 'aiApp.errors.session'
    if (error.status === 403) return 'aiApp.errors.permission'
    if (error.status === 429) return 'aiApp.errors.rateLimit'
    if (error.status === 409) return 'aiApp.errors.busy'
    if (error.code === 'AI_INVALID_RESPONSE' || error.status === 502) return 'aiApp.errors.invalidResponse'
    if (error.status === 503) return 'aiApp.errors.unavailable'
    if (error.status === 422 || error.status === 400) return 'aiApp.errors.invalid'
  }
  return 'aiApp.errors.request'
}

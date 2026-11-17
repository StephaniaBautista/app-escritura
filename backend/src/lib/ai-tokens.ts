export interface AiTokenUsage {
  promptTokens: number
  completionTokens: number
}

export function extractTokenUsage(payload: unknown): AiTokenUsage {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { promptTokens: 0, completionTokens: 0 }
  }
  const usage = (payload as { usage?: unknown }).usage
  if (typeof usage !== 'object' || usage === null || Array.isArray(usage)) {
    return { promptTokens: 0, completionTokens: 0 }
  }
  const record = usage as Record<string, unknown>
  const prompt = Number(record.prompt_tokens ?? record.input_tokens ?? 0)
  const completion = Number(record.completion_tokens ?? record.output_tokens ?? 0)
  return {
    promptTokens: Number.isFinite(prompt) && prompt > 0 ? Math.min(Math.trunc(prompt), 10_000_000) : 0,
    completionTokens: Number.isFinite(completion) && completion > 0 ? Math.min(Math.trunc(completion), 10_000_000) : 0,
  }
}

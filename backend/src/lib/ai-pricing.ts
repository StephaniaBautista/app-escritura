import type { AiVendor } from './ai-presets.js'

const PER_MILLION: Record<string, { input: number; output: number }> = {
  'muse-spark-1.3-contributor': { input: 0.10, output: 0.20 },
  'muse-spark-1.3': { input: 1.25, output: 4.25 },
  'deepseek-flash': { input: 0.28, output: 0.42 },
  'glm-5.3-flash': { input: 0.075, output: 0.25 },
  'gpt-5.6-luna': { input: 0.20, output: 1.20 },
}

const VENDOR_FALLBACK: Record<AiVendor, { input: number; output: number }> = {
  muse: { input: 1.25, output: 4.25 },
  deepseek: { input: 0.28, output: 0.42 },
  glm: { input: 0.075, output: 0.25 },
  openai: { input: 0.20, output: 1.20 },
}

export function estimateCostMicros(model: string, vendor: AiVendor, promptTokens: number, completionTokens: number): number {
  const rate = PER_MILLION[model] ?? VENDOR_FALLBACK[vendor] ?? VENDOR_FALLBACK.openai
  const dollars = (Math.max(0, promptTokens) / 1_000_000) * rate.input
    + (Math.max(0, completionTokens) / 1_000_000) * rate.output
  return Math.round(dollars * 1_000_000)
}

export function microsToUsd(micros: number): number {
  return Math.round(micros) / 1_000_000
}

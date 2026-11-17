import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'
import { listPresetStatus, sanitizeDismissedTrainingModes, sanitizeSelectablePreset, type AiPreset } from '../lib/ai-presets.js'

export interface AutoVersionConfig {
  inactivity: { enabled: boolean; intervalMs: number }
  exit: { enabled: boolean }
  hourly: { enabled: boolean; intervalMs: number }
  daily: { enabled: boolean; intervalMs: number }
  weekly: { enabled: boolean; intervalMs: number }
  monthly: { enabled: boolean; intervalMs: number }
}

export const DEFAULT_AUTO_VERSION_CONFIG: AutoVersionConfig = {
  inactivity: { enabled: true, intervalMs: 5 * 60 * 1000 },
  exit: { enabled: true },
  hourly: { enabled: true, intervalMs: 60 * 60 * 1000 },
  daily: { enabled: true, intervalMs: 24 * 60 * 60 * 1000 },
  weekly: { enabled: true, intervalMs: 7 * 24 * 60 * 60 * 1000 },
  monthly: { enabled: true, intervalMs: 30 * 24 * 60 * 60 * 1000 },
}

export const AI_TOOL_PRESET_KEYS = ['review', 'wizard', 'timeline', 'characters'] as const
export type AiToolPresetKey = typeof AI_TOOL_PRESET_KEYS[number]
export type AiToolPresets = Partial<Record<AiToolPresetKey, AiPreset>>

export interface UiPrefs {
  dismissAiStructureWarning?: boolean
  dismissedAiTrainingModes?: string[]
  reviewEnabledByDefault?: boolean
  aiToolPresets?: AiToolPresets
}

export const DEFAULT_UI_PREFS: UiPrefs = {
  reviewEnabledByDefault: false,
  aiToolPresets: {},
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function sanitizeAiToolPresets(value: unknown): AiToolPresets {
  if (!isRecord(value)) return {}
  const next: AiToolPresets = {}
  for (const key of AI_TOOL_PRESET_KEYS) {
    const preset = sanitizeSelectablePreset(value[key])
    if (preset) next[key] = preset
  }
  return next
}

function sanitizeUiPrefs(value: Record<string, unknown>): UiPrefs {
  const next: UiPrefs = {
    reviewEnabledByDefault: value.reviewEnabledByDefault === true,
    aiToolPresets: sanitizeAiToolPresets(value.aiToolPresets),
  }
  if (value.dismissAiStructureWarning === true) next.dismissAiStructureWarning = true
  if ('dismissedAiTrainingModes' in value) {
    next.dismissedAiTrainingModes = sanitizeDismissedTrainingModes(value.dismissedAiTrainingModes)
  }
  return next
}

function mergeUiPrefs(existing: unknown, patch: Partial<UiPrefs>): Record<string, unknown> {
  const current = isRecord(existing) ? existing : {}
  return {
    ...current,
    ...patch,
    aiToolPresets: {
      ...(isRecord(current.aiToolPresets) ? current.aiToolPresets : {}),
      ...(patch.aiToolPresets ?? {}),
    },
  }
}

function toClientSettings<T extends { uiPrefs: unknown }>(row: T) {
  return {
    ...row,
    uiPrefs: sanitizeUiPrefs({ ...DEFAULT_UI_PREFS, ...(isRecord(row.uiPrefs) ? row.uiPrefs : {}) }),
    aiModes: listPresetStatus(),
  }
}

export const settingsService = {
  async get(userId: string) {
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    if (!settings) {
      return this.createDefaults(userId)
    }
    return toClientSettings(settings)
  },

  async createDefaults(userId: string) {
    const settings = await prisma.userSettings.create({
      data: {
        userId,
        theme: 'system',
        language: 'es',
        autoVersion: DEFAULT_AUTO_VERSION_CONFIG as unknown as Prisma.InputJsonValue,
        uiPrefs: DEFAULT_UI_PREFS as unknown as Prisma.InputJsonValue,
      },
    })
    return toClientSettings(settings)
  },

  async update(userId: string, data: { theme?: string; language?: string; autoVersion?: Partial<AutoVersionConfig>; uiPrefs?: Partial<UiPrefs> }) {
    const existing = await prisma.userSettings.findUnique({ where: { userId } })

    if (!existing) {
      const settings = await prisma.userSettings.create({
        data: {
          userId,
          theme: data.theme ?? 'system',
          language: data.language ?? 'es',
          autoVersion: (data.autoVersion ?? DEFAULT_AUTO_VERSION_CONFIG) as unknown as Prisma.InputJsonValue,
          uiPrefs: sanitizeUiPrefs(mergeUiPrefs(DEFAULT_UI_PREFS, data.uiPrefs ?? {})) as unknown as Prisma.InputJsonValue,
        },
      })
      return toClientSettings(settings)
    }

    const mergedAutoVersion = data.autoVersion
      ? { ...(existing.autoVersion as Record<string, unknown>), ...data.autoVersion }
      : undefined
    const mergedUiPrefs = data.uiPrefs
      ? sanitizeUiPrefs(mergeUiPrefs(existing.uiPrefs, data.uiPrefs))
      : undefined

    const settings = await prisma.userSettings.update({
      where: { userId },
      data: {
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.language !== undefined && { language: data.language }),
        ...(mergedAutoVersion && { autoVersion: mergedAutoVersion as Prisma.InputJsonValue }),
        ...(mergedUiPrefs && { uiPrefs: mergedUiPrefs as Prisma.InputJsonValue }),
      },
    })
    return toClientSettings(settings)
  },

  async getUiPrefs(userId: string): Promise<UiPrefs> {
    const settings = await this.get(userId)
    return settings.uiPrefs
  },

  async getAutoVersionConfig(userId: string): Promise<AutoVersionConfig> {
    const settings = await this.get(userId)
    const config = settings.autoVersion as Record<string, unknown>
    return { ...DEFAULT_AUTO_VERSION_CONFIG, ...config } as AutoVersionConfig
  },
}

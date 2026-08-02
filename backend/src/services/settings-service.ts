import { prisma } from '../lib/prisma.js'
import { Prisma } from '@generated/client'

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

export const settingsService = {
  async get(userId: string) {
    const settings = await prisma.userSettings.findUnique({ where: { userId } })
    if (!settings) {
      return this.createDefaults(userId)
    }
    return settings
  },

  async createDefaults(userId: string) {
    return prisma.userSettings.create({
      data: {
        userId,
        theme: 'system',
        language: 'es',
        autoVersion: DEFAULT_AUTO_VERSION_CONFIG as unknown as Prisma.InputJsonValue,
      },
    })
  },

  async update(userId: string, data: { theme?: string; language?: string; autoVersion?: Partial<AutoVersionConfig> }) {
    const existing = await prisma.userSettings.findUnique({ where: { userId } })

    if (!existing) {
      return prisma.userSettings.create({
        data: {
          userId,
          theme: data.theme ?? 'system',
          language: data.language ?? 'es',
          autoVersion: (data.autoVersion ?? DEFAULT_AUTO_VERSION_CONFIG) as unknown as Prisma.InputJsonValue,
        },
      })
    }

    const mergedAutoVersion = data.autoVersion
      ? { ...(existing.autoVersion as Record<string, unknown>), ...data.autoVersion }
      : undefined

    return prisma.userSettings.update({
      where: { userId },
      data: {
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.language !== undefined && { language: data.language }),
        ...(mergedAutoVersion && { autoVersion: mergedAutoVersion as Prisma.InputJsonValue }),
      },
    })
  },

  async getAutoVersionConfig(userId: string): Promise<AutoVersionConfig> {
    const settings = await this.get(userId)
    const config = settings.autoVersion as Record<string, unknown>
    return { ...DEFAULT_AUTO_VERSION_CONFIG, ...config } as AutoVersionConfig
  },
}

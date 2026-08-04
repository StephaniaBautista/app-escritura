import { prisma } from '../lib/prisma.js'
import { versionService } from './version-service.js'
import { settingsService, type AutoVersionConfig } from './settings-service.js'

export type AutoVersionTrigger = 'inactivity' | 'exit' | 'hourly' | 'daily' | 'weekly' | 'monthly'

export interface AutoVersionState {
  lastInactivityAt?: string
  lastExitAt?: string
  lastHourlyAt?: string
  lastDailyAt?: string
  lastWeeklyAt?: string
  lastMonthlyAt?: string
  lastActivityAt?: string
}

const TRIGGER_TO_STATE_KEY: Record<AutoVersionTrigger, keyof AutoVersionState> = {
  inactivity: 'lastInactivityAt',
  exit: 'lastExitAt',
  hourly: 'lastHourlyAt',
  daily: 'lastDailyAt',
  weekly: 'lastWeeklyAt',
  monthly: 'lastMonthlyAt',
}

const TRIGGER_TO_CONFIG_KEY: Record<AutoVersionTrigger, keyof AutoVersionConfig> = {
  inactivity: 'inactivity',
  exit: 'exit',
  hourly: 'hourly',
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
}

async function updateAutoVersionState(documentId: string, state: AutoVersionState) {
  await prisma.$executeRawUnsafe(
    `UPDATE "documents" SET "autoVersionState" = $1::jsonb WHERE "id" = $2`,
    JSON.stringify(state),
    documentId,
  )
}

export const autoVersionService = {
  async checkAndCreate(
    documentId: string,
    userId: string,
    trigger: AutoVersionTrigger,
    lastActivityAt?: string,
    branchId?: string,
  ): Promise<{ created: boolean; version?: unknown }> {
    const config = await settingsService.getAutoVersionConfig(userId)
    const triggerConfig = config[TRIGGER_TO_CONFIG_KEY[trigger]]

    if (!triggerConfig || !triggerConfig.enabled) {
      return { created: false }
    }

    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) return { created: false }

    const state = (doc.autoVersionState ?? {}) as AutoVersionState
    const stateKey = TRIGGER_TO_STATE_KEY[trigger]
    const lastTriggerAt = state[stateKey]

    if (lastTriggerAt) {
      const elapsed = Date.now() - new Date(lastTriggerAt).getTime()
      const interval = 'intervalMs' in triggerConfig ? triggerConfig.intervalMs : 0
      if (interval > 0 && elapsed < interval) {
        return { created: false }
      }
    }

    const lastVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: { createdAt: true },
    })

    if (lastVersion && doc.updatedAt <= lastVersion.createdAt) {
      return { created: false }
    }

    const version = await versionService.create(documentId, userId, undefined, branchId)
    if (!version) return { created: false }

    const newState: AutoVersionState = {
      ...state,
      [stateKey]: new Date().toISOString(),
    }
    if (lastActivityAt) {
      newState.lastActivityAt = lastActivityAt
    }

    await updateAutoVersionState(documentId, newState)

    return { created: true, version }
  },

  async updateActivity(documentId: string, userId: string, lastActivityAt: string) {
    const doc = await prisma.document.findFirst({ where: { id: documentId, userId } })
    if (!doc) return null

    const state = (doc.autoVersionState ?? {}) as AutoVersionState
    const newState: AutoVersionState = { ...state, lastActivityAt }

    await updateAutoVersionState(documentId, newState)
    return { ok: true }
  },

  async getState(documentId: string, userId: string): Promise<AutoVersionState | null> {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { autoVersionState: true },
    })
    if (!doc) return null
    return (doc.autoVersionState ?? {}) as AutoVersionState
  },
}

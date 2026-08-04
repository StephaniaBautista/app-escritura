import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { autoVersionApi } from '@/services/settings'
import { useSettingsStore } from '@/stores/settings-store'
import { useBranchStore } from '@/stores/branch-store'
import type { AutoVersionTrigger } from '@/types/settings'

function getActiveBranchIdForDocument(documentId: string): string | undefined {
  const active = useBranchStore.getState().activeBranch
  return active?.documentId === documentId ? active.id : undefined
}

interface UseAutoVersionOptions {
  documentId: string | null
  hasUnsavedChanges: () => boolean
  onVersionCreated?: (trigger: AutoVersionTrigger) => void
}

export function useAutoVersion({ documentId, hasUnsavedChanges, onVersionCreated }: UseAutoVersionOptions) {
  const { settings, loadSettings } = useSettingsStore()
  const location = useLocation()

  const lastKeystrokeRef = useRef<number>(Date.now())
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const periodicTimersRef = useRef<ReturnType<typeof setInterval>[]>([])
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const documentIdRef = useRef<string | null>(documentId)
  const exitingRef = useRef(false)

  useEffect(() => {
    if (!settings) loadSettings()
  }, [settings, loadSettings])

  useEffect(() => {
    documentIdRef.current = documentId
  }, [documentId])

  const checkTrigger = useCallback(async (trigger: AutoVersionTrigger) => {
    const docId = documentIdRef.current
    if (!docId) return

    const config = useSettingsStore.getState().getAutoVersionConfig()
    const triggerConfig = config[trigger]
    if (!triggerConfig || !triggerConfig.enabled) return

    if (trigger !== 'exit' && !hasUnsavedChanges()) return

    try {
      const result = await autoVersionApi.check(docId, trigger, new Date().toISOString(), getActiveBranchIdForDocument(docId))
      if (result.created) {
        onVersionCreated?.(trigger)
      }
    } catch (err) {
      console.error(`[auto-version] Error checking ${trigger}:`, err)
    }
  }, [hasUnsavedChanges, onVersionCreated])

  const resetInactivityTimer = useCallback(() => {
    lastKeystrokeRef.current = Date.now()

    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }

    const config = useSettingsStore.getState().getAutoVersionConfig()
    if (!config.inactivity.enabled) return

    inactivityTimerRef.current = setTimeout(() => {
      checkTrigger('inactivity')
    }, config.inactivity.intervalMs)
  }, [checkTrigger])

  const handleKeystroke = useCallback(() => {
    resetInactivityTimer()
  }, [resetInactivityTimer])

  useEffect(() => {
    if (!documentId) return

    resetInactivityTimer()

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
    }
  }, [documentId, resetInactivityTimer])

  useEffect(() => {
    if (!documentId) return

    const handleBeforeUnload = () => {
      if (exitingRef.current) return
      exitingRef.current = true
      if (hasUnsavedChanges()) {
        const docId = documentIdRef.current
        if (!docId) return
        const config = useSettingsStore.getState().getAutoVersionConfig()
        if (config.exit.enabled) {
          const body = JSON.stringify({
            trigger: 'exit',
            lastActivityAt: new Date().toISOString(),
            branchId: getActiveBranchIdForDocument(docId),
          })
          const blob = new Blob([body], { type: 'application/json' })
          navigator.sendBeacon(`/api/auto-version/check/${docId}`, blob)
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [documentId, hasUnsavedChanges])

  useEffect(() => {
    if (!documentId) return

    return () => {
      if (exitingRef.current) return
      exitingRef.current = true
      if (hasUnsavedChanges()) {
        const docId = documentIdRef.current
        if (!docId) return
        const config = useSettingsStore.getState().getAutoVersionConfig()
        if (config.exit.enabled) {
          fetch(`/api/auto-version/check/${docId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              trigger: 'exit',
              lastActivityAt: new Date().toISOString(),
              branchId: getActiveBranchIdForDocument(docId),
            }),
            keepalive: true,
          }).catch(() => {})
        }
      }
    }
  }, [location.pathname])

  useEffect(() => {
    if (!documentId) return

    const config = useSettingsStore.getState().getAutoVersionConfig()

    const timers: ReturnType<typeof setInterval>[] = []

    if (config.hourly.enabled) {
      timers.push(setInterval(() => checkTrigger('hourly'), Math.min(config.hourly.intervalMs, 60 * 1000)))
    }
    if (config.daily.enabled) {
      timers.push(setInterval(() => checkTrigger('daily'), Math.min(config.daily.intervalMs, 60 * 1000)))
    }
    if (config.weekly.enabled) {
      timers.push(setInterval(() => checkTrigger('weekly'), Math.min(config.weekly.intervalMs, 60 * 1000)))
    }
    if (config.monthly.enabled) {
      timers.push(setInterval(() => checkTrigger('monthly'), Math.min(config.monthly.intervalMs, 60 * 1000)))
    }

    periodicTimersRef.current = timers

    return () => {
      timers.forEach(clearInterval)
    }
  }, [documentId, checkTrigger])

  useEffect(() => {
    if (!documentId) return

    heartbeatRef.current = setInterval(() => {
      const docId = documentIdRef.current
      if (!docId) return
      const now = Date.now()
      const elapsed = now - lastKeystrokeRef.current
      if (elapsed < 60 * 1000) {
        autoVersionApi.updateActivity(docId, new Date().toISOString()).catch(() => {})
      }
    }, 30 * 1000)

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current)
    }
  }, [documentId])

  return { handleKeystroke }
}

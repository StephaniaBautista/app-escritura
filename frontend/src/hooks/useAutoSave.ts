import { useEffect, useRef, useCallback } from 'react'
import { documentsApi } from '@/services/documents'

interface UseAutoSaveOptions {
  documentId: string | null
  getContent: () => Record<string, unknown> | null
  debounceMs?: number
  enabled?: boolean
}

export function useAutoSave({ documentId, getContent, debounceMs = 500, enabled = true }: UseAutoSaveOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSavingRef = useRef(false)
  const pendingContentRef = useRef<Record<string, unknown> | null>(null)

  const triggerSave = useCallback(() => {
    if (!enabled || !documentId) return

    const content = getContent()
    if (!content) return

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(async () => {
      if (isSavingRef.current) {
        pendingContentRef.current = content
        return
      }

      isSavingRef.current = true
      try {
        await documentsApi.update(documentId, { content })
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        isSavingRef.current = false
        if (pendingContentRef.current) {
          const next = pendingContentRef.current
          pendingContentRef.current = null
          documentsApi.update(documentId, { content: next }).catch(console.error)
        }
      }
    }, debounceMs)
  }, [documentId, getContent, debounceMs, enabled])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return { triggerSave }
}

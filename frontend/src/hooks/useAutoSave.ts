import { useEffect, useRef, useCallback, useState } from 'react'
import { documentsApi } from '@/services/documents'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

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
  const [status, setStatus] = useState<SaveStatus>('idle')

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
      setStatus('saving')
      try {
        await documentsApi.update(documentId, { content })
        setStatus('saved')
      } catch (error) {
        console.error('Auto-save failed:', error)
        setStatus('error')
      } finally {
        isSavingRef.current = false
        if (pendingContentRef.current) {
          const next = pendingContentRef.current
          pendingContentRef.current = null
          setStatus('saving')
          documentsApi.update(documentId, { content: next })
            .then(() => setStatus('saved'))
            .catch(() => setStatus('error'))
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

  return { triggerSave, status }
}

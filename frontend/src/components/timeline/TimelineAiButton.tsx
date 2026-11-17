import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { aiApi, aiErrorKey, AiRequestError } from '@/services/ai'
import { useDocumentStore } from '@/stores/document-store'
import { useToastStore } from '@/stores/toast-store'
import { useAiCapabilities } from '@/components/ai/useAiCapabilities'
import { useAiToolProvider } from '@/hooks/useAiToolProvider'
import { hasLocalWrittenDocuments } from '@/components/story-setup/wizard-ai'
import type { AiTimelineFillResult } from '@/types/ai'

interface TimelineAiButtonProps {
  projectId: string
  empty: boolean
  onFilled: (result: AiTimelineFillResult) => void
}

export function TimelineAiButton({ projectId, empty, onFilled }: TimelineAiButtonProps) {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()
  const { documentTree, currentDocument } = useDocumentStore()
  const { capabilities } = useAiCapabilities(projectId)
  const provider = useAiToolProvider('timeline')
  const [loading, setLoading] = useState(false)
  if (!projectId || !capabilities?.permissions.suggestions) return null

  const handleGenerate = async () => {
    if (loading) return
    if (!hasLocalWrittenDocuments(projectId, documentTree, currentDocument)) {
      toast.error(t('timelineApp.aiEmpty'))
      return
    }
    setLoading(true)
    try {
      const locale = i18n.language.toLowerCase().startsWith('en') ? 'en' : 'es'
      const result = await aiApi.fillTimeline(projectId, { locale, ...(provider ? { provider } : {}) })
      onFilled(result)
      toast.success(t(empty ? 'timelineApp.aiReady' : 'timelineApp.aiApplied'))
    } catch (error) {
      if (error instanceof AiRequestError && error.code === 'AI_WIZARD_EMPTY') toast.error(t('timelineApp.aiEmpty'))
      else if (error instanceof AiRequestError && error.code === 'AI_WIZARD_INSUFFICIENT') toast.error(t('timelineApp.aiInsufficient'))
      else toast.error(t(aiErrorKey(error)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleGenerate()}
      disabled={loading}
      aria-busy={loading}
      className="h-10 shrink-0 px-4"
      style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-accent)' }}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {loading
        ? t('timelineApp.generatingWithAi')
        : t(empty ? 'timelineApp.generateWithAi' : 'timelineApp.completeWithAi')}
    </Button>
  )
}

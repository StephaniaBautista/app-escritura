import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { aiApi, aiErrorKey, AiRequestError } from '@/services/ai'
import { useDocumentStore } from '@/stores/document-store'
import { useToastStore } from '@/stores/toast-store'
import type { AiWizardStage, AiWizardSuggestion } from '@/types/ai'
import type { StoryMeta } from '@/types/story'
import { useAiToolProvider } from '@/hooks/useAiToolProvider'
import { hasLocalWrittenDocuments } from './wizard-ai'
import { mergeAiMetaPatch } from './wizard-stage-apply'

interface WizardAiButtonProps {
  projectId: string
  stage: AiWizardStage
  description: string
  meta: StoryMeta
  onApplied: (description: string, meta: StoryMeta) => void
  onSuggestions: (suggestions: AiWizardSuggestion[]) => void
}

export function WizardAiButton({
  projectId, stage, description, meta, onApplied, onSuggestions,
}: WizardAiButtonProps) {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()
  const { documentTree, currentDocument, updateProject, updateStoryMeta } = useDocumentStore()
  const provider = useAiToolProvider('wizard')
  const [loading, setLoading] = useState(false)

  if (!projectId) return null

  const handleGenerate = async () => {
    if (loading) return
    if (!hasLocalWrittenDocuments(projectId, documentTree, currentDocument)) {
      toast.error(t('storySetup.aiEmpty'))
      return
    }
    setLoading(true)
    try {
      const locale = i18n.language.toLowerCase().startsWith('en') ? 'en' : 'es'
      const result = await aiApi.completeWizard(projectId, { locale, stage, ...(provider ? { provider } : {}) })
      const nextDescription = result.description?.trim() ? result.description : description
      const nextMeta = mergeAiMetaPatch(meta, result.meta)
      onApplied(nextDescription, nextMeta)
      onSuggestions(result.suggestions)
      const writes: Promise<unknown>[] = []
      if (result.description?.trim() && result.description.trim() !== description.trim()) {
        writes.push(updateProject(projectId, { description: result.description.trim() }))
      }
      if (Object.keys(result.meta).length > 0) {
        writes.push(updateStoryMeta(projectId, nextMeta as Record<string, unknown>))
      }
      await Promise.all(writes)
      if (result.suggestions.length > 0 && Object.keys(result.meta).length === 0 && !result.description?.trim()) {
        toast.success(t('storySetup.aiStageSuggested'))
      } else if (Object.keys(result.meta).length > 0 || result.description?.trim()) {
        toast.success(t('storySetup.aiApplied'))
      } else {
        toast.success(t('storySetup.aiComplete'))
      }
    } catch (error) {
      if (error instanceof AiRequestError && error.code === 'AI_WIZARD_EMPTY') toast.error(t('storySetup.aiEmpty'))
      else if (error instanceof AiRequestError && error.code === 'AI_WIZARD_INSUFFICIENT') toast.error(t('storySetup.aiInsufficient'))
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
      className="shrink-0"
      style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-accent)' }}
    >
      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
      {loading ? t('storySetup.generatingWithAi') : t('storySetup.generateWithAi')}
    </Button>
  )
}

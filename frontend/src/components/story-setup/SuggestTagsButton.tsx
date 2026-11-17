import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { aiApi, aiErrorKey, AiRequestError } from '@/services/ai'
import { useDocumentStore } from '@/stores/document-store'
import { useOptionsStore } from '@/stores/options-store'
import { useToastStore } from '@/stores/toast-store'
import type { StoryMeta } from '@/types/story'
import { useAiToolProvider } from '@/hooks/useAiToolProvider'
import { hasLocalWrittenDocuments } from './wizard-ai'
import { mergeUniqueTags } from './merge-tags'

interface SuggestTagsButtonProps {
  projectId: string
  meta: StoryMeta
  update: (patch: Partial<StoryMeta>) => void
}

export function SuggestTagsButton({ projectId, meta, update }: SuggestTagsButtonProps) {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()
  const { documentTree, currentDocument } = useDocumentStore()
  const addOption = useOptionsStore((s) => s.addOption)
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
      const result = await aiApi.suggestTags(projectId, { locale, ...(provider ? { provider } : {}) })
      const current = meta.tags ?? []
      const next = mergeUniqueTags(current, result.tags)
      if (next.length === current.length) {
        toast.error(t('storySetup.tagsNoneNew'))
        return
      }
      update({ tags: next })
      await Promise.allSettled(
        next.filter((tag) => !current.some((held) => held.toLowerCase() === tag.toLowerCase()))
          .map((tag) => addOption('tag', tag, tag)),
      )
      toast.success(t('storySetup.tagsSuggested'))
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
      onClick={() => { void handleGenerate() }}
      disabled={loading}
      aria-busy={loading}
      className="shrink-0"
      style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-accent)' }}
    >
      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
      {loading ? t('storySetup.suggestingTagsWithAi') : t('storySetup.suggestTagsWithAi')}
    </Button>
  )
}

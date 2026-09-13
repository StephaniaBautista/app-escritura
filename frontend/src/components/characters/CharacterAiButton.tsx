import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { aiApi, aiErrorKey, AiRequestError } from '@/services/ai'
import { useDocumentStore } from '@/stores/document-store'
import { useToastStore } from '@/stores/toast-store'
import { useAiCapabilities } from '@/components/ai/useAiCapabilities'
import { hasLocalWrittenDocuments } from '@/components/story-setup/wizard-ai'
import type { AiCharacterFill } from '@/types/ai'

interface CharacterAiButtonProps {
  projectId: string
  characterId?: string | null
  name?: string
  tone?: 'hero' | 'toolbar'
  onFilled: (characters: AiCharacterFill[]) => void
}

export function CharacterAiButton({ projectId, characterId, name, tone = 'hero', onFilled }: CharacterAiButtonProps) {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()
  const { documentTree, currentDocument } = useDocumentStore()
  const { capabilities } = useAiCapabilities(projectId)
  const [loading, setLoading] = useState(false)
  if (!projectId || !capabilities?.permissions.characters) return null

  const handleGenerate = async () => {
    if (loading) return
    if (!hasLocalWrittenDocuments(projectId, documentTree, currentDocument)) {
      toast.error(t('characterApp.aiEmpty'))
      return
    }
    setLoading(true)
    try {
      const locale = i18n.language.toLowerCase().startsWith('en') ? 'en' : 'es'
      const result = await aiApi.fillCharacters(projectId, {
        locale,
        ...(characterId ? { characterId } : {}),
        ...(name?.trim() && !characterId ? { name: name.trim() } : {}),
      })
      onFilled(result.characters)
      toast.success(t(characterId ? 'characterApp.aiApplied' : 'characterApp.aiReady'))
    } catch (error) {
      if (error instanceof AiRequestError && error.code === 'AI_WIZARD_EMPTY') toast.error(t('characterApp.aiEmpty'))
      else if (error instanceof AiRequestError && error.code === 'AI_WIZARD_INSUFFICIENT') toast.error(t('characterApp.aiInsufficient'))
      else if (error instanceof AiRequestError && error.code === 'AI_CHARACTER_COMPLETE') toast.error(t('characterApp.aiComplete'))
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
      style={tone === 'hero'
        ? { borderColor: 'color-mix(in srgb, var(--color-paper) 55%, transparent)', color: 'var(--color-paper)' }
        : { borderColor: 'var(--color-paper-lines)', color: 'var(--color-accent)' }}
    >
      <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
      {loading
        ? t('characterApp.generatingWithAi')
        : t(characterId ? 'characterApp.completeWithAi' : 'characterApp.generateWithAi')}
    </Button>
  )
}

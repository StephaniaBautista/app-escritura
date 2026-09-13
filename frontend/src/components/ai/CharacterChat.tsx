import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAiStore } from '@/stores/ai-store'
import { ChatPanel } from './ChatPanel'

export function CharacterChat({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const capabilities = useAiStore((state) => state.projectId === projectId ? state.capabilities : null)
  const [characterId, setCharacterId] = useState('')
  const [chapterId, setChapterId] = useState('')
  const validCharacterId = capabilities?.characters.some((character) => character.id === characterId) ? characterId : ''
  const validChapterId = capabilities?.chapters.some((chapter) => chapter.id === chapterId) ? chapterId : ''
  return <div className="space-y-4">
    <p className="text-sm ai-panel__muted">{t('aiApp.characterHint')}</p>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <label className="text-sm space-y-1"><span>{t('aiApp.character')}</span><select className="ai-panel__control" value={validCharacterId} onChange={(event) => setCharacterId(event.target.value)}><option value="">{t('aiApp.chooseCharacter')}</option>{capabilities?.characters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
      <label className="text-sm space-y-1"><span>{t('aiApp.knowledgeChapter')}</span><select className="ai-panel__control" value={validChapterId} onChange={(event) => setChapterId(event.target.value)}><option value="">{t('aiApp.chooseChapter')}</option>{capabilities?.chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.title}</option>)}</select></label>
    </div>
    {(!capabilities?.characters.length || !capabilities.chapters.length) && <p role="status" className="text-sm ai-panel__muted">{t('aiApp.characterSetup')}</p>}
    <ChatPanel key={`${projectId}:${validCharacterId}:${validChapterId}`} projectId={projectId} mode="character" characterId={validCharacterId} chapterId={validChapterId} />
  </div>
}

import { useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { useCharactersStore } from '@/stores/characters-store'
import { LoadingState } from '@/components/ui/LoadingState'
import { CharacterPicker } from '@/components/characters/CharacterPicker'
import { CharacterChat } from '@/components/ai/CharacterChat'
import '@/components/ai/ai.css'

export function AiCharactersDashboard() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { projects, loadProjects, isLoading } = useDocumentStore()
  const { characters, load, isLoading: charactersLoading } = useCharactersStore()
  const requestedProject = searchParams.get('project')
  const projectId = useMemo(() => {
    if (requestedProject && projects.some((project) => project.id === requestedProject)) return requestedProject
    return projects[0]?.id ?? null
  }, [requestedProject, projects])

  useEffect(() => {
    if (projects.length === 0) void loadProjects()
  }, [projects.length, loadProjects])

  useEffect(() => {
    if (projectId) void load(projectId)
  }, [projectId, load])

  const updateParams = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next, { replace: true })
  }

  if (isLoading && projects.length === 0) {
    return <div className="p-4 sm:p-6 md:p-8"><LoadingState label={t('common.loading')} className="notebook-paper" /></div>
  }

  if (projects.length === 0) {
    return (
      <div className="p-4 sm:p-6 md:p-8">
        <div className="notebook-paper p-10 text-center">
          <Sparkles className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--color-accent)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('characterApp.emptyProjects')}</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('characterApp.emptyProjectsDesc')}</p>
        </div>
      </div>
    )
  }

  if (!projectId) return null

  const selected = characters.find((character) => character.id === (searchParams.get('character') ?? '')) ?? null
  const cast = characters.filter((character) => !character.evolvesFromId)

  return (
    <div className="mx-auto w-full max-w-5xl p-4 sm:p-6 md:p-8 space-y-6" data-testid="ai-characters-dashboard">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-3xl sm:text-4xl font-bold" style={{ color: 'var(--color-ink)' }}>
            {t('characterApp.aiTitle')}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('characterApp.aiSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to={`/app/documents/${projectId}?tab=characters`}
            className="text-sm hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}
          >
            {t('characterApp.aiManageInProject')}
          </Link>
          <label className="flex w-full items-center gap-2 text-sm sm:w-auto" style={{ color: 'var(--color-ink-light)' }}>
            <span className="sr-only sm:not-sr-only">{t('characterApp.projectFilter')}</span>
            <select
              className="ai-panel__control min-w-[10rem]"
              value={projectId}
              onChange={(event) => updateParams({ project: event.target.value, character: null, scope: null })}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selected ? (
        <div className="notebook-paper p-4 sm:p-6">
          <CharacterChat
            projectId={projectId}
            character={selected}
            scopeId={searchParams.get('scope') ?? ''}
            onSelectScope={(scopeId) => updateParams({ scope: scopeId || null })}
            onBack={() => updateParams({ character: null, scope: null })}
          />
        </div>
      ) : (
        <CharacterPicker
          projectId={projectId}
          characters={cast}
          loading={charactersLoading}
          onTalk={(characterId) => updateParams({ character: characterId, scope: null })}
        />
      )}
    </div>
  )
}

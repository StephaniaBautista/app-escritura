import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { tagsApi, type Tag, type TagKind } from '@/services/tags'
import { aiApi, aiErrorKey, AiRequestError } from '@/services/ai'
import { useToastStore } from '@/stores/toast-store'
import { useAiToolProvider } from '@/hooks/useAiToolProvider'
import { TAG_KIND_ORDER, tagKindLabel } from './tag-kinds'

interface TagManagerProps {
  projectId: string
  projectTitle: string
}

export function TagManager({ projectId, projectTitle }: TagManagerProps) {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()
  const provider = useAiToolProvider('wizard')
  const [tags, setTags] = useState<Tag[]>([])
  const [draft, setDraft] = useState('')
  const [draftKind, setDraftKind] = useState<TagKind>('freeform')
  const [error, setError] = useState<string | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [picked, setPicked] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    tagsApi.listByProject(projectId)
      .then((rows) => { if (!cancelled) setTags(rows) })
      .catch((err: unknown) => { if (!cancelled) setError(err instanceof Error ? err.message : t('tagsApp.failed')) })
    return () => { cancelled = true }
  }, [projectId, t])

  const reload = async () => {
    setTags(await tagsApi.listByProject(projectId))
  }

  const addTag = async (name: string, kind: TagKind) => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (tags.some((tag) => tag.name.toLowerCase() === trimmed.toLowerCase())) return
    try {
      await tagsApi.create(projectId, { name: trimmed, kind })
      await reload()
      toast.success(t('tagsApp.added'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('tagsApp.failed'))
    }
  }

  const removeTag = async (id: string) => {
    try {
      await tagsApi.remove(id)
      setTags((rows) => rows.filter((tag) => tag.id !== id))
      toast.success(t('tagsApp.removed'))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('tagsApp.failed'))
    }
  }

  const handleSuggest = async () => {
    if (suggesting) return
    setSuggesting(true)
    setError(null)
    try {
      const locale = i18n.language.toLowerCase().startsWith('en') ? 'en' : 'es'
      const result = await aiApi.suggestTags(projectId, { locale, ...(provider ? { provider } : {}) })
      const held = new Set(tags.map((tag) => tag.name.toLowerCase()))
      const fresh = result.tags.filter((tag) => !held.has(tag.toLowerCase()))
      setSuggestions(fresh)
      setPicked(new Set(fresh))
    } catch (err: unknown) {
      if (err instanceof AiRequestError && (err.code === 'AI_WIZARD_EMPTY' || err.code === 'AI_WIZARD_INSUFFICIENT')) {
        setError(t('storySetup.aiEmpty'))
      } else {
        setError(t(aiErrorKey(err)))
      }
    } finally {
      setSuggesting(false)
    }
  }

  const acceptSuggestions = async () => {
    const names = suggestions.filter((name) => picked.has(name))
    for (const name of names) {
      await addTag(name, 'freeform')
    }
    setSuggestions([])
    setPicked(new Set())
  }

  const togglePicked = (name: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('tagsApp.subtitle', { title: projectTitle })}
        </h3>
        <Button variant="ghost" size="sm" onClick={handleSuggest} disabled={suggesting}>
          <Sparkles className="w-4 h-4" />
          {suggesting ? t('tagsApp.suggesting') : t('tagsApp.suggest')}
        </Button>
      </div>

      <ErrorMessage message={error} />

      {tags.length === 0 ? (
        <p className="text-sm mb-3" style={{ color: 'var(--color-ink-faint)' }}>{t('tagsApp.empty')}</p>
      ) : (
        <div className="space-y-2 mb-3">
          {TAG_KIND_ORDER.map((kind) => {
            const rows = tags.filter((tag) => tag.kind === kind)
            if (rows.length === 0) return null
            return (
              <div key={kind} className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-medium w-24 shrink-0" style={{ color: 'var(--color-ink-light)' }}>
                  {tagKindLabel(t, kind)}
                </span>
                {rows.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs border"
                    style={{ borderColor: 'var(--color-accent)', background: 'var(--color-accent-light)', color: 'var(--color-ink)' }}
                  >
                    {tag.name}
                    <button type="button" onClick={() => removeTag(tag.id)} aria-label={t('common.remove')} className="hover:opacity-70">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="notebook-paper p-3 mb-3">
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-ink-light)' }}>{t('tagsApp.suggested')}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => togglePicked(name)}
                className="px-2 py-1 rounded-full text-xs border transition-opacity"
                style={{
                  borderColor: picked.has(name) ? 'var(--color-accent)' : 'var(--color-paper-lines)',
                  background: picked.has(name) ? 'var(--color-accent-light)' : 'transparent',
                  color: 'var(--color-ink)',
                  opacity: picked.has(name) ? 1 : 0.6,
                }}
              >
                {name}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={acceptSuggestions} disabled={picked.size === 0}>
            {t('tagsApp.acceptSuggested')}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={draftKind}
          onChange={(event) => setDraftKind(event.target.value as TagKind)}
          className="rounded-lg border px-2 py-2 text-sm"
          style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)', color: 'var(--color-ink)' }}
        >
          {TAG_KIND_ORDER.map((kind) => (
            <option key={kind} value={kind}>{tagKindLabel(t, kind)}</option>
          ))}
        </select>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              void addTag(draft, draftKind)
              setDraft('')
            }
          }}
          placeholder={t('tagsApp.addPlaceholder')}
          className="flex-1 min-w-40 rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)', color: 'var(--color-ink)' }}
        />
        <Button
          size="sm"
          onClick={() => { void addTag(draft, draftKind); setDraft('') }}
          disabled={!draft.trim()}
        >
          <Plus className="w-4 h-4" />
          {t('tagsApp.add')}
        </Button>
      </div>
    </div>
  )
}

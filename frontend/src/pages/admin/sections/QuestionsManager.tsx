import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react'
import { storyBankApi, type StoryQuestion } from '@/services/story-bank'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

function RowInput({
  label,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}) {
  return (
    <label className="block flex-1">
      <span className="block text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-lg border px-3 py-2 text-sm"
        style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
      />
    </label>
  )
}

export function QuestionsManager() {
  const { t, i18n } = useTranslation()
  const toast = useToastStore()

  const [questions, setQuestions] = useState<StoryQuestion[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [showCreate, setShowCreate] = useState(false)
  const [createText, setCreateText] = useState('')
  const [createTextEn, setCreateTextEn] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [editTextEn, setEditTextEn] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<StoryQuestion | null>(null)

  const lang = i18n.language
  const qText = (q: StoryQuestion): string => (lang === 'en' && q.textEn ? q.textEn : q.text)

  const load = async () => {
    setBusy(true)
    setError(null)
    try {
      setQuestions(await storyBankApi.listQuestions())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [])

  const handleCreate = async () => {
    if (!createText.trim()) return
    setBusy(true)
    try {
      await storyBankApi.createQuestion(createText.trim(), createTextEn.trim() || undefined)
      toast.success(t('admin.bank.questionCreated'))
      setCreateText('')
      setCreateTextEn('')
      setShowCreate(false)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = (q: StoryQuestion) => {
    setEditingId(q.id)
    setEditText(q.text)
    setEditTextEn(q.textEn ?? '')
  }

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return
    setBusy(true)
    try {
      await storyBankApi.updateQuestion(editingId, { text: editText.trim(), textEn: editTextEn.trim() || null })
      toast.success(t('admin.bank.questionUpdated'))
      setEditingId(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setBusy(true)
    try {
      await storyBankApi.deleteQuestion(deleteTarget.id)
      toast.success(t('admin.bank.questionDeleted'))
      setDeleteTarget(null)
      await load()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-4">
        <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
          {t('admin.bank.questionsDesc')}
        </p>
        <button
          type="button"
          onClick={() => setShowCreate((s) => !s)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all"
          style={{ background: 'var(--color-accent)' }}
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? t('common.cancel') : t('admin.bank.addQuestion')}
        </button>
      </div>

      {showCreate && (
        <div className="mb-4 rounded-lg border p-4 space-y-3" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <div className="flex gap-3 flex-col sm:flex-row">
            <RowInput label={t('admin.bank.textEs')} value={createText} onChange={setCreateText} placeholder={t('admin.bank.textEsPlaceholder')} />
            <RowInput label={t('admin.bank.textEn')} value={createTextEn} onChange={setCreateTextEn} placeholder={t('admin.bank.textEnPlaceholder')} />
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!createText.trim() || busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
            style={{ background: 'var(--color-accent)' }}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {t('admin.bank.createQuestion')}
          </button>
        </div>
      )}

      {error && <p className="text-sm mb-3" style={{ color: 'var(--color-accent)' }}>{error}</p>}

      {questions === null ? (
        <div className="flex items-center justify-center py-10 gap-2" style={{ color: 'var(--color-ink-faint)' }}>
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--color-ink-faint)' }}>
          {t('admin.bank.questionsEmpty')}
        </p>
      ) : (
        <div className="space-y-2">
          {questions.map((q) => {
            const editing = editingId === q.id
            return (
              <div
                key={q.id}
                className="rounded-lg border px-3 py-2.5"
                style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
              >
                {editing ? (
                  <div className="space-y-2">
                    <div className="flex gap-3 flex-col sm:flex-row">
                      <RowInput
                        label={t('admin.bank.textEs')}
                        value={editText}
                        onChange={setEditText}
                        placeholder={t('admin.bank.textEsPlaceholder')}
                        ariaLabel={`${t('admin.bank.textEs')} ${qText(q)}`}
                      />
                      <RowInput
                        label={t('admin.bank.textEn')}
                        value={editTextEn}
                        onChange={setEditTextEn}
                        placeholder={t('admin.bank.textEnPlaceholder')}
                        ariaLabel={`${t('admin.bank.textEn')} ${qText(q)}`}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={!editText.trim() || busy}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all disabled:opacity-50"
                        style={{ background: 'var(--color-accent)' }}
                      >
                        {t('common.save')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80"
                        style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex-1 text-sm" style={{ color: 'var(--color-ink)' }}>
                      {qText(q)}
                      {q.isDefault && (
                        <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
                          {t('admin.bank.default')}
                        </span>
                      )}
                    </span>
                    <button type="button" onClick={() => startEdit(q)} aria-label={t('admin.bank.editQuestion')} className="hover:opacity-70">
                      <Pencil className="w-4 h-4" style={{ color: 'var(--color-ink-light)' }} />
                    </button>
                    <button type="button" onClick={() => setDeleteTarget(q)} aria-label={t('admin.bank.deleteQuestion')} className="hover:opacity-70">
                      <Trash2 className="w-4 h-4" style={{ color: 'var(--color-accent)' }} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('admin.bank.deleteQuestionTitle')}
        message={deleteTarget ? t('admin.bank.deleteQuestionConfirm', { text: qText(deleteTarget) }) : ''}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, MessageSquarePlus, RotateCcw, Send, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import type { SharedComment } from '@/services/sharing'

interface InlineCommentsProps {
  comments: SharedComment[]
  activeBlock: number | null
  allowComments: boolean
  isAuthenticated: boolean
  onSend: (input: { blockIndex: number; quote: string; body: string; authorName?: string }) => Promise<void>
  onResolve: (commentId: string, resolved: boolean) => Promise<void>
  onDelete: (commentId: string) => Promise<void>
}

export function InlineComments({
  comments,
  activeBlock,
  allowComments,
  isAuthenticated,
  onSend,
  onResolve,
  onDelete,
}: InlineCommentsProps) {
  const { t } = useTranslation()
  const [body, setBody] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const attached = comments.filter((comment) => !comment.orphan)
  const orphans = comments.filter((comment) => comment.orphan)
  const forBlock = activeBlock === null
    ? attached
    : attached.filter((comment) => comment.effectiveBlockIndex === activeBlock)

  const submit = async () => {
    if (!body.trim() || activeBlock === null || busy) return
    setBusy(true)
    setError(null)
    try {
      await onSend({
        blockIndex: activeBlock,
        quote: '',
        body: body.trim(),
        ...(authorName.trim() ? { authorName: authorName.trim() } : {}),
      })
      setBody('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('sharingApp.commentFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-display text-lg font-semibold" style={{ color: 'var(--color-ink)' }}>
        {t('sharingApp.commentsTitle')}
      </h3>

      <ErrorMessage message={error} />

      {forBlock.length === 0 && orphans.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('sharingApp.emptyComments')}</p>
      ) : (
        <div className="space-y-2">
          {forBlock.map((comment) => (
            <div key={comment.id} className="notebook-paper p-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>{comment.authorName}</span>
                <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--color-ink-light)' }}>{comment.body}</p>
              {comment.quote && (
                <p className="text-xs italic mt-1 truncate" style={{ color: 'var(--color-ink-faint)' }}>«{comment.quote}»</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => onResolve(comment.id, !comment.resolved)}>
                  {comment.resolved ? <RotateCcw className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                  {comment.resolved ? t('sharingApp.unresolve') : t('sharingApp.resolve')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDelete(comment.id)}>
                  <Trash2 className="w-3 h-3" />
                  {t('sharingApp.delete')}
                </Button>
                {comment.resolved && (
                  <span className="text-xs" style={{ color: 'var(--color-accent-teal)' }}>{t('sharingApp.resolved')}</span>
                )}
              </div>
            </div>
          ))}
          {orphans.length > 0 && (
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-ink-faint)' }}>
                {t('sharingApp.orphanComments')}
              </p>
              {orphans.map((comment) => (
                <div key={comment.id} className="notebook-paper p-2 mb-1 opacity-70">
                  <p className="text-xs font-medium" style={{ color: 'var(--color-ink)' }}>{comment.authorName}</p>
                  <p className="text-xs" style={{ color: 'var(--color-ink-light)' }}>{comment.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {allowComments && (
        <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-ink-light)' }}>
            <MessageSquarePlus className="w-3.5 h-3.5" />
            {activeBlock === null
              ? t('sharingApp.emptyComments')
              : t('sharingApp.commentOn')}
          </p>
          {!isAuthenticated && (
            <input
              value={authorName}
              onChange={(event) => setAuthorName(event.target.value)}
              placeholder={t('sharingApp.authorPlaceholder')}
              maxLength={40}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)', color: 'var(--color-ink)' }}
            />
          )}
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('sharingApp.commentPlaceholder')}
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border px-3 py-2 text-sm resize-none"
            style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)', color: 'var(--color-ink)' }}
          />
          <Button
            size="sm"
            onClick={submit}
            disabled={!body.trim() || activeBlock === null || busy}
          >
            <Send className="w-3.5 h-3.5" />
            {isAuthenticated ? t('sharingApp.send') : t('sharingApp.sendAnonymous')}
          </Button>
        </div>
      )}
    </div>
  )
}

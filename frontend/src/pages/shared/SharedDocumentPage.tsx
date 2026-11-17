import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Users } from 'lucide-react'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { LoadingState } from '@/components/ui/LoadingState'
import { SharedBlocks } from '@/components/sharing/SharedBlocks'
import { InlineComments } from '@/components/sharing/InlineComments'
import {
  sharingApi,
  type SharedComment,
  type SharedDocument,
} from '@/services/sharing'
import { useAuthStore } from '@/stores/auth-store'

export function SharedDocumentPage() {
  const { token = '' } = useParams()
  const { t } = useTranslation()
  const { user, checkSession, isInitialized } = useAuthStore()
  const [doc, setDoc] = useState<SharedDocument | null>(null)
  const [comments, setComments] = useState<SharedComment[]>([])
  const [activeBlock, setActiveBlock] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isInitialized) void checkSession()
  }, [checkSession, isInitialized])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    sharingApi.readShared(token)
      .then((data) => {
        if (cancelled) return
        setDoc(data)
        setComments(data.comments)
        setError(null)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [token])

  useEffect(() => {
    if (!doc || !user) return
    sharingApi.recordView(token).catch(() => undefined)
  }, [doc, token, user])

  const handleSend = useCallback(async (input: { blockIndex: number; quote: string; body: string; authorName?: string }) => {
    const comment = await sharingApi.addComment(token, input)
    setComments((rows) => [...rows, comment])
  }, [token])

  const handleResolve = useCallback(async (commentId: string, resolved: boolean) => {
    await sharingApi.resolveComment(token, commentId, resolved)
    setComments((rows) => rows.map((row) => (row.id === commentId ? { ...row, resolved } : row)))
  }, [token])

  const handleDelete = useCallback(async (commentId: string) => {
    if (!window.confirm(t('sharingApp.confirmDeleteComment'))) return
    await sharingApi.deleteComment(token, commentId)
    setComments((rows) => rows.filter((row) => row.id !== commentId))
  }, [token, t])

  if (loading) return <LoadingState />

  if (error || !doc) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center gap-4">
        <ErrorMessage message={error ?? t('sharingApp.commentFailed')} />
        <Link to="/" className="text-sm underline" style={{ color: 'var(--color-accent)' }}>
          {t('sharingApp.backToApp')}
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-background)' }}>
      <header className="border-b px-6 py-4" style={{ borderColor: 'var(--color-paper-lines)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>{doc.title}</h1>
            <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--color-ink-light)' }}>
              <Users className="w-3.5 h-3.5" />
              {t('sharingApp.sharedBy', { owner: doc.ownerName })}
            </p>
          </div>
          <Link to="/" className="text-sm underline shrink-0" style={{ color: 'var(--color-accent)' }}>
            {t('sharingApp.backToApp')}
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <SharedBlocks
            blocks={doc.blocks}
            comments={comments}
            activeBlock={activeBlock}
            onSelectBlock={setActiveBlock}
          />
          {doc.includeChildren && doc.children.map((child) => (
            <section key={child.title} className="mt-10">
              <h2 className="font-display text-xl font-bold mb-3" style={{ color: 'var(--color-ink)' }}>{child.title}</h2>
              <SharedBlocks
                blocks={child.blocks}
                comments={[]}
                activeBlock={null}
                onSelectBlock={() => undefined}
              />
            </section>
          ))}
        </div>
        <aside className="lg:col-span-1">
          <div className="notebook-paper p-4 sticky top-6">
            <InlineComments
              comments={comments}
              activeBlock={activeBlock}
              allowComments={doc.allowComments}
              isAuthenticated={Boolean(user)}
              onSend={handleSend}
              onResolve={handleResolve}
              onDelete={handleDelete}
            />
          </div>
        </aside>
      </main>
    </div>
  )
}

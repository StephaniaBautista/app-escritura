import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Copy, Link2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ErrorMessage } from '@/components/ui/ErrorMessage'
import { sharingApi, sharedDocumentUrl, type SharedLink } from '@/services/sharing'
import { useToastStore } from '@/stores/toast-store'

interface ShareDialogProps {
  documentId: string
  documentTitle: string
  onClose: () => void
}

export function ShareDialog({ documentId, documentTitle, onClose }: ShareDialogProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const [link, setLink] = useState<SharedLink | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [includeChildren, setIncludeChildren] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    sharingApi.getLink(documentId)
      .then((existing) => {
        setLink(existing)
        setIncludeChildren(existing.includeChildren)
        setAllowComments(existing.allowComments)
      })
      .catch(() => setLink(null))
  }, [documentId])

  const createOrRotate = async () => {
    setError(null)
    try {
      const created = await sharingApi.createLink(documentId, { includeChildren, allowComments })
      setLink(created)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const revoke = async () => {
    if (!window.confirm(t('sharingApp.confirmRevoke'))) return
    setError(null)
    try {
      await sharingApi.revokeLink(documentId)
      setLink(null)
      toast.success(t('sharingApp.revoked'))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const copy = async () => {
    if (!link) return
    await navigator.clipboard.writeText(sharedDocumentUrl(link.token))
    setCopied(true)
    toast.success(t('sharingApp.copied'))
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div className="notebook-paper p-6 w-full max-w-lg relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-display text-xl font-bold" style={{ color: 'var(--color-ink)' }}>{t('sharingApp.title')}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--color-ink-light)' }}>
              {t('sharingApp.description', { title: documentTitle })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>{t('sharingApp.close')}</Button>
        </div>

        <ErrorMessage message={error} />

        <div className="space-y-3 mb-4">
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
            <input
              type="checkbox"
              checked={includeChildren}
              onChange={(event) => setIncludeChildren(event.target.checked)}
            />
            {t('sharingApp.includeChildren')}
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-ink)' }}>
            <input
              type="checkbox"
              checked={allowComments}
              onChange={(event) => setAllowComments(event.target.checked)}
            />
            {t('sharingApp.allowComments')}
          </label>
        </div>

        {link ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-ink-light)' }}>{t('sharingApp.linkLabel')}</p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={sharedDocumentUrl(link.token)}
                  className="flex-1 rounded-lg border px-3 py-2 text-xs"
                  style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)', color: 'var(--color-ink)' }}
                  onFocus={(event) => event.target.select()}
                />
                <Button variant="outline" size="sm" onClick={copy}>
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {t('sharingApp.copy')}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={createOrRotate}>
                <Link2 className="w-4 h-4" />
                {t('sharingApp.rotate')}
              </Button>
              <Button variant="outline" size="sm" onClick={revoke}>
                <Trash2 className="w-4 h-4" />
                {t('sharingApp.revoke')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>{t('sharingApp.noLink')}</p>
            <Button size="sm" onClick={createOrRotate}>
              <Link2 className="w-4 h-4" />
              {t('sharingApp.create')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

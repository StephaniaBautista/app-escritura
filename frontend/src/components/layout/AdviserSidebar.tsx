import { useEffect } from 'react'
import { useLocation, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useDocumentStore } from '@/stores/document-store'
import { AdviserPanel } from '@/components/ai/AdviserPanel'
import '@/components/ai/ai.css'

interface AdviserSidebarProps {
  open: boolean
  onClose: () => void
}

function useActiveProjectId() {
  const location = useLocation()
  const params = useParams()
  const { currentProject } = useDocumentStore()
  const folderMatch = location.pathname.match(/\/app\/documents\/([^/]+)/)
  const editorMatch = location.pathname.match(/\/app\/editor\/([^/]+)/)
  return params.projectId ?? params.folderId ?? folderMatch?.[1] ?? editorMatch?.[1] ?? currentProject?.id ?? null
}

export function AdviserSidebar({ open, onClose }: AdviserSidebarProps) {
  const { t } = useTranslation()
  const projectId = useActiveProjectId()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {open && (
        <button
          type="button"
          className="ai-adviser-scrim"
          aria-label={t('aiApp.close')}
          onClick={onClose}
        />
      )}
      <aside
        className="ai-adviser-dock"
        data-open={open}
        data-testid="adviser-sidebar"
        aria-label={t('aiApp.adviserTitle')}
        aria-hidden={!open}
        aria-modal={open}
        role="dialog"
        inert={!open}
      >
        {projectId ? (
          <AdviserPanel key={projectId} projectId={projectId} open={open} onClose={onClose} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
            <p className="font-display text-lg">{t('aiApp.adviserTitle')}</p>
            <p className="text-sm ai-panel__muted">{t('aiApp.adviserNeedsProject')}</p>
          </div>
        )}
      </aside>
    </>
  )
}

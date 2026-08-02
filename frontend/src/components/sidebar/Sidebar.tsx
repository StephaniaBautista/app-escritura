import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { BookOpen, PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react'
import { useDocumentStore } from '@/stores/document-store'
import { ChapterTree } from '@/components/editor/ChapterTree'
import { getDocumentRootId, getDocumentTabs, getNextTabTitle } from '@/lib/document-tabs'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { InputDialog } from '@/components/ui/InputDialog'
import { AccordionSection } from '@/components/ui/AccordionSection'

export function Sidebar() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    documentTree,
    currentDocument,
    createDocument,
    updateDocument,
    duplicateDocument,
    deleteDocument,
  } = useDocumentStore()
  const [creatingChapter, setCreatingChapter] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [subpageParent, setSubpageParent] = useState<string | null>(null)
  const [renameTarget, setRenameTarget] = useState<{ id: string; title: string } | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  const handleSelectDoc = (id: string) => {
    if (projectId) {
      navigate(`/app/editor/${projectId}/${id}`)
    }
  }

  const handleCreateChapter = async () => {
    if (!projectId || !currentDocument || creatingChapter) return
    setCreatingChapter(true)
    try {
      const parentId = getDocumentRootId(documentTree, currentDocument.id) ?? currentDocument.id
      const title = getNextTabTitle(documentTree, parentId, t('editorApp.defaultTabName'))
      const doc = await createDocument({
        title,
        type: 'chapter',
        projectId,
        parentId,
      })
      navigate(`/app/editor/${projectId}/${doc.id}`)
    } finally {
      setCreatingChapter(false)
    }
  }

  const handleCreateSubpage = (parentId: string) => {
    setSubpageParent(parentId)
  }

  const handleConfirmSubpage = async (name: string) => {
    if (!projectId || !subpageParent) return
    const doc = await createDocument({
      title: name,
      type: 'subpage',
      projectId,
      parentId: subpageParent,
    })
    setSubpageParent(null)
    navigate(`/app/editor/${projectId}/${doc.id}`)
  }

  const handleRenameTab = (id: string, currentTitle: string) => {
    setRenameTarget({ id, title: currentTitle })
  }

  const handleConfirmRename = async (newTitle: string) => {
    if (!renameTarget) return
    await updateDocument(renameTarget.id, { title: newTitle })
    setRenameTarget(null)
  }

  const handleDuplicateTab = async (id: string) => {
    if (!projectId) return
    const doc = await duplicateDocument(id)
    if (doc) {
      navigate(`/app/editor/${projectId}/${doc.id}`)
    }
  }

  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    const isCurrent = currentDocument?.id === deleteTarget
    const children = documentTree
      .filter((d) => d.parentId === deleteTarget)
      .sort((a, b) => a.order - b.order)
    const parentId = currentDocument?.parent?.id
    deleteDocument(deleteTarget)
    if (isCurrent && projectId) {
      const destination = children[0]?.id ?? parentId ?? null
      navigate(destination ? `/app/editor/${projectId}/${destination}` : `/app/editor/${projectId}`)
    }
    setDeleteTarget(null)
  }

  if (collapsed) {
    return (
      <aside
        className="w-12 border-r flex flex-col h-full items-center py-3 flex-shrink-0"
        style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
      >
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 rounded-lg hover:opacity-80 transition-opacity mb-4"
          style={{ color: 'var(--color-ink-faint)' }}
          title={t('sidebar.expand')}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </aside>
    )
  }

  return (
    <aside
      className="w-64 border-r flex flex-col h-full flex-shrink-0"
      style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
    >
      <div className="p-4 border-b flex items-center gap-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
        <BookOpen className="w-5 h-5" style={{ color: 'var(--color-accent)' }} />
        <span className="font-semibold flex-1" style={{ color: 'var(--color-ink)' }}>Archivum</span>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: 'var(--color-ink-faint)' }}
          title={t('sidebar.collapse')}
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {projectId && (
          <AccordionSection
            title={t('editorApp.documentTabs')}
            actions={
              currentDocument ? (
                <button
                  type="button"
                  onClick={handleCreateChapter}
                  className="p-1 rounded hover:opacity-80"
                  title={t('editorApp.newTab')}
                  aria-label={t('editorApp.newTab')}
                >
                  <Plus className="w-3.5 h-3.5" style={{ color: 'var(--color-ink-light)' }} />
                </button>
              ) : undefined
            }
          >
            <ChapterTree
              documents={getDocumentTabs(documentTree, currentDocument?.id ?? null)}
              activeDocId={currentDocument?.id ?? null}
              onSelect={handleSelectDoc}
              onCreateSubpage={handleCreateSubpage}
              onRename={handleRenameTab}
              onDuplicate={handleDuplicateTab}
              onDelete={(id) => setDeleteTarget(id)}
            />
          </AccordionSection>
        )}
      </div>

      <InputDialog
        isOpen={subpageParent !== null}
        title={t('editorApp.newSubtab')}
        placeholder={t('editorApp.subtabName')}
        onSubmit={handleConfirmSubpage}
        onCancel={() => setSubpageParent(null)}
      />

      <InputDialog
        isOpen={renameTarget !== null}
        title={t('editorApp.renameTab')}
        initialValue={renameTarget?.title ?? ''}
        placeholder={t('editorApp.tabName')}
        onSubmit={handleConfirmRename}
        onCancel={() => setRenameTarget(null)}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title={t('folder.deleteDocument')}
        message={t('folder.confirmDelete')}
        confirmLabel={t('common.delete')}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </aside>
  )
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChapterTree } from '../ChapterTree'
import type { DocumentNode } from '@/types/document'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

const mockDocs: DocumentNode[] = [
  {
    id: 'tab-1',
    title: 'Capítulo 21',
    type: 'chapter',
    parentId: null,
    order: 0,
    updatedAt: '2026-07-31T00:00:00.000Z',
  },
  {
    id: 'tab-2',
    title: 'Pestaña 3',
    type: 'subpage',
    parentId: 'tab-1',
    order: 0,
    updatedAt: '2026-07-31T00:00:00.000Z',
  },
  {
    id: 'tab-3',
    title: 'Ingles 20',
    type: 'document',
    parentId: null,
    order: 1,
    updatedAt: '2026-07-31T00:00:00.000Z',
  },
]

describe('ChapterTree (Document Tabs)', () => {
  const onSelect = vi.fn()
  const onCreateSubpage = vi.fn()
  const onRename = vi.fn()
  const onDuplicate = vi.fn()
  const onDelete = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders root document tabs correctly', () => {
    render(
      <ChapterTree
        documents={mockDocs}
        activeDocId="tab-1"
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText('Capítulo 21')).toBeDefined()
    expect(screen.getByText('Ingles 20')).toBeDefined()
  })

  it('calls onSelect when clicking a tab', () => {
    render(
      <ChapterTree
        documents={mockDocs}
        activeDocId="tab-1"
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    )

    fireEvent.click(screen.getByText('Ingles 20'))
    expect(onSelect).toHaveBeenCalledWith('tab-3')
  })

  it('expands subtabs when clicking collapse chevron button', () => {
    render(
      <ChapterTree
        documents={mockDocs}
        activeDocId="tab-1"
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    )

    expect(screen.queryByText('Pestaña 3')).toBeNull()

    const chevronButton = screen.getByRole('button', { name: 'expand tab' })
    fireEvent.click(chevronButton)

    expect(screen.getByText('Pestaña 3')).toBeDefined()

  })

  it('renders tabs when all items have non-null parentId (from getDocumentTabs)', () => {
    const tabsFromGetDocumentTabs: DocumentNode[] = [
      {
        id: 'ch-1',
        title: 'Capítulo 1',
        type: 'chapter',
        parentId: 'root-doc',
        order: 0,
        updatedAt: '2026-07-31T00:00:00.000Z',
      },
      {
        id: 'ch-2',
        title: 'Capítulo 2',
        type: 'chapter',
        parentId: 'root-doc',
        order: 1,
        updatedAt: '2026-07-31T00:00:00.000Z',
      },
    ]

    render(
      <ChapterTree
        documents={tabsFromGetDocumentTabs}
        activeDocId="ch-1"
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText('Capítulo 1')).toBeDefined()
    expect(screen.getByText('Capítulo 2')).toBeDefined()
    expect(screen.queryByText('editorApp.noTabs')).toBeNull()
  })

  it('does not show delete option when only one tab exists', () => {
    const singleDoc: DocumentNode[] = [
      {
        id: 'only-tab',
        title: 'Única Pestaña',
        type: 'chapter',
        parentId: 'root-doc',
        order: 0,
        updatedAt: '2026-07-31T00:00:00.000Z',
      },
    ]

    render(
      <ChapterTree
        documents={singleDoc}
        activeDocId="only-tab"
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    )

    const moreButton = screen.getByRole('button', { name: 'common.moreOptions' })
    fireEvent.click(moreButton)

    expect(screen.queryByText('editorApp.delete')).toBeNull()
    expect(screen.getByText('editorApp.addSubtab')).toBeDefined()
  })

  it('shows delete option when multiple root tabs exist', () => {
    render(
      <ChapterTree
        documents={mockDocs}
        activeDocId="tab-1"
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    )

    const moreButtons = screen.getAllByRole('button', { name: 'common.moreOptions' })
    fireEvent.click(moreButtons[0])

    expect(screen.getByText('editorApp.delete')).toBeDefined()
  })

  it('allows deleting subpage even when only one root tab exists', () => {
    const oneRootWithChild: DocumentNode[] = [
      {
        id: 'root-tab',
        title: 'Única Pestaña',
        type: 'chapter',
        parentId: 'root-doc',
        order: 0,
        updatedAt: '2026-07-31T00:00:00.000Z',
      },
      {
        id: 'child-tab',
        title: 'Subpágina',
        type: 'subpage',
        parentId: 'root-tab',
        order: 0,
        updatedAt: '2026-07-31T00:00:00.000Z',
      },
    ]

    render(
      <ChapterTree
        documents={oneRootWithChild}
        activeDocId="root-tab"
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onRename={onRename}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    )

    const expandButton = screen.getByRole('button', { name: 'expand tab' })
    fireEvent.click(expandButton)

    const childText = screen.getByText('Subpágina')
    fireEvent.click(childText)

    const moreButtons = screen.getAllByRole('button', { name: 'common.moreOptions' })
    const childMenuButton = moreButtons[moreButtons.length - 1]
    fireEvent.click(childMenuButton)

    expect(screen.getByText('editorApp.delete')).toBeDefined()
  })

  it('renders empty message when no tabs exist', () => {
    render(
      <ChapterTree
        documents={[]}
        activeDocId={null}
        onSelect={onSelect}
        onCreateSubpage={onCreateSubpage}
        onDelete={onDelete}
      />
    )

    expect(screen.getByText('editorApp.noTabs')).toBeDefined()
  })
})
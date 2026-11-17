import { describe, it, expect, vi, beforeEach } from 'vitest'

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    document: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock('../../lib/prisma.js', () => ({ prisma: prismaMock }))

import { ExportError, exportService } from '../export-service.js'

const rootRow = {
  id: 'doc-1',
  title: 'Mi historia',
  projectId: 'proj-1',
  parentId: null,
  order: 0,
  type: 'document',
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Primer párrafo' }],
      },
    ],
  },
}

const childRow = {
  id: 'doc-2',
  title: 'Capítulo 2',
  projectId: 'proj-1',
  parentId: 'doc-1',
  order: 1,
  type: 'chapter',
  content: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Segundo párrafo' }],
      },
    ],
  },
}

describe('exportService', () => {
  beforeEach(() => {
    prismaMock.document.findFirst.mockReset()
    prismaMock.document.findMany.mockReset()
  })

  it('rejects documents the user does not own', async () => {
    prismaMock.document.findFirst.mockResolvedValue(null)
    await expect(exportService.exportDocument('user-1', 'doc-1', { format: 'md' }))
      .rejects.toBeInstanceOf(ExportError)
  })

  it('exports markdown for a single document', async () => {
    prismaMock.document.findFirst.mockResolvedValue(rootRow)
    const result = await exportService.exportDocument('user-1', 'doc-1', { format: 'md' })
    expect(result.filename).toBe('mi-historia-md.md')
    expect(result.contentType).toContain('text/markdown')
    expect(result.body.toString('utf8')).toContain('# Mi historia')
    expect(result.body.toString('utf8')).toContain('Primer párrafo')
    expect(prismaMock.document.findMany).not.toHaveBeenCalled()
  })

  it('merges children in tree order when includeChildren is true', async () => {
    prismaMock.document.findFirst.mockResolvedValue(rootRow)
    prismaMock.document.findMany.mockResolvedValue([childRow, rootRow])
    const result = await exportService.exportDocument('user-1', 'doc-1', {
      format: 'html',
      includeChildren: true,
    })
    const html = result.body.toString('utf8')
    expect(html).toContain('Primer párrafo')
    expect(html).toContain('<h2>Capítulo 2</h2>')
    expect(html).toContain('Segundo párrafo')
  })

  it('exports AO3 HTML with requested options', async () => {
    prismaMock.document.findFirst.mockResolvedValue(rootRow)
    const result = await exportService.exportDocument('user-1', 'doc-1', {
      format: 'ao3',
      ao3: { fontFamily: 'mono', fontSize: 12, includeTitle: false, sceneSeparator: '' },
    })
    const html = result.body.toString('utf8')
    expect(html).toContain('font-family: "Courier New"')
    expect(html).not.toContain('<h1>')
  })

  it('exports a PDF buffer', async () => {
    prismaMock.document.findFirst.mockResolvedValue(rootRow)
    const result = await exportService.exportDocument('user-1', 'doc-1', { format: 'pdf' })
    expect(result.contentType).toBe('application/pdf')
    expect(result.filename).toBe('mi-historia-pdf.pdf')
    expect(result.body.subarray(0, 5).toString('latin1')).toBe('%PDF-')
  })
})

import { prisma } from '../lib/prisma.js'
import {
  DEFAULT_AO3_OPTIONS,
  type Ao3ExportOptions,
  type ExportFormat,
  tiptapToAo3Html,
  tiptapToHtml,
  tiptapToMarkdown,
} from '../lib/tiptap-export.js'
import { tiptapToPdf } from '../lib/tiptap-export-pdf.js'

export interface ExportRequest {
  format: ExportFormat
  includeChildren?: boolean
  ao3?: Partial<Ao3ExportOptions>
}

export interface ExportResult {
  filename: string
  contentType: string
  body: Buffer
}

export class ExportError extends Error {
  constructor(message: string, readonly code: string, readonly statusCode: number) {
    super(message)
  }
}

const CONTENT_TYPES: Record<ExportFormat, string> = {
  md: 'text/markdown; charset=utf-8',
  html: 'text/html; charset=utf-8',
  ao3: 'text/html; charset=utf-8',
  pdf: 'application/pdf',
}

const EXTENSIONS: Record<ExportFormat, string> = {
  md: 'md',
  html: 'html',
  ao3: 'html',
  pdf: 'pdf',
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'documento'
}

interface ExportDocument {
  id: string
  title: string
  content: unknown
  parentId: string | null
  order: number
  type: string
}

function flattenTree(docs: ExportDocument[], rootId: string): ExportDocument[] {
  const byParent = new Map<string | null, ExportDocument[]>()
  for (const doc of docs) {
    const key = doc.parentId
    const list = byParent.get(key)
    if (list) list.push(doc)
    else byParent.set(key, [doc])
  }
  for (const list of byParent.values()) {
    list.sort((a, b) => a.order - b.order)
  }
  const result: ExportDocument[] = []
  const walk = (parentId: string | null) => {
    for (const child of byParent.get(parentId) ?? []) {
      result.push(child)
      walk(child.id)
    }
  }
  // Root first, then its descendants in document order.
  const root = docs.find((doc) => doc.id === rootId)
  if (root) result.push(root)
  walk(rootId)
  return result
}

function mergeDocuments(docs: ExportDocument[]): { title: string; content: unknown } {
  const [root, ...rest] = docs
  if (!root) return { title: 'Documento', content: { type: 'doc', content: [] } }
  if (!rest.length) return { title: root.title, content: root.content }

  const blocks: unknown[] = []
  const pushDoc = (doc: ExportDocument, asHeading: boolean) => {
    const content = doc.content as { content?: unknown[] } | null
    const nodes = Array.isArray(content?.content) ? content?.content ?? [] : []
    if (asHeading) {
      blocks.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: doc.title }],
      })
    }
    for (const node of nodes) blocks.push(node)
  }

  pushDoc(root, false)
  for (const child of rest) pushDoc(child, true)

  return { title: root.title, content: { type: 'doc', content: blocks } }
}

export const exportService = {
  async exportDocument(userId: string, documentId: string, request: ExportRequest): Promise<ExportResult> {
    if (!['md', 'html', 'ao3', 'pdf'].includes(request.format)) {
      throw new ExportError('Formato no soportado', 'EXPORT_INVALID_FORMAT', 400)
    }

    const root = await prisma.document.findFirst({
      where: { id: documentId, userId },
      select: { id: true, title: true, content: true, parentId: true, order: true, type: true, projectId: true },
    })
    if (!root) throw new ExportError('Documento no encontrado', 'EXPORT_NOT_FOUND', 404)

    let docs: ExportDocument[] = [root]
    if (request.includeChildren) {
      const all = await prisma.document.findMany({
        where: { projectId: root.projectId, userId },
        select: { id: true, title: true, content: true, parentId: true, order: true, type: true },
      })
      docs = flattenTree(all, root.id)
    }

    const { title, content } = mergeDocuments(docs)
    const format = request.format
    const base = `${slugify(title)}-${format === 'ao3' ? 'ao3' : format}`
    const filename = `${base}.${EXTENSIONS[format]}`

    if (format === 'pdf') {
      const body = await tiptapToPdf(content, title)
      return { filename, contentType: CONTENT_TYPES.pdf, body }
    }
    if (format === 'md') {
      const text = tiptapToMarkdown(content, title)
      return { filename, contentType: CONTENT_TYPES.md, body: Buffer.from(text, 'utf8') }
    }
    if (format === 'ao3') {
      const html = tiptapToAo3Html(content, title, {
        ...DEFAULT_AO3_OPTIONS,
        ...request.ao3,
      })
      return { filename, contentType: CONTENT_TYPES.ao3, body: Buffer.from(html, 'utf8') }
    }
    const html = tiptapToHtml(content, title)
    return { filename, contentType: CONTENT_TYPES.html, body: Buffer.from(html, 'utf8') }
  },
}

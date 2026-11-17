import PDFDocument from 'pdfkit'
import { isNode, children, attrs, markNames, linkHref, tiptapToPlainText } from './tiptap-export-nodes.js'

type JsonNode = Record<string, unknown>

const PAGE = {
  size: 'A4' as const,
  margins: { top: 72, bottom: 72, left: 72, right: 72 },
}

const FONT = 'Helvetica'
const FONT_BOLD = 'Helvetica-Bold'
const FONT_ITALIC = 'Helvetica-Oblique'

interface DrawState {
  doc: PDFKit.PDFDocument
  y: number
}

function applyMarks(node: JsonNode): string {
  const marks = markNames(node)
  if (marks.has('code')) return 'Courier'
  if (marks.has('bold') && marks.has('italic')) return 'Helvetica-BoldOblique'
  if (marks.has('bold')) return FONT_BOLD
  if (marks.has('italic')) return FONT_ITALIC
  return FONT
}

function ensureSpace(state: DrawState, height: number) {
  const bottom = state.doc.page.height - PAGE.margins.bottom
  if (state.y + height > bottom) {
    state.doc.addPage()
    state.y = PAGE.margins.top
  }
}

function drawInline(state: DrawState, nodes: JsonNode[], fontSize: number, x: number, maxWidth: number) {
  const doc = state.doc
  let line = ''
  let font = FONT
  const flush = (final = false) => {
    if (!line) return
    ensureSpace(state, fontSize * 1.35)
    doc.font(font).fontSize(fontSize)
    doc.text(line, x, state.y, { width: maxWidth, align: 'left', lineBreak: !final })
    state.y = doc.y + 2
    line = ''
  }

  for (const node of nodes) {
    if (node.type === 'hardBreak') {
      flush()
      continue
    }
    if (node.type !== 'text') {
      const nested = children(node)
      if (nested.length) drawInline(state, nested, fontSize, x, maxWidth)
      continue
    }
    const text = typeof node.text === 'string' ? node.text : ''
    const nextFont = applyMarks(node)
    if (nextFont !== font && line) flush()
    font = nextFont
    const href = linkHref(node)
    line += href && /^https?:\/\//i.test(href) ? `${text} (${href})` : text
  }
  flush(true)
}

function drawBlocks(state: DrawState, node: JsonNode, depth = 0) {
  const doc = state.doc
  const type = typeof node.type === 'string' ? node.type : ''
  const kids = children(node)
  const contentWidth = doc.page.width - PAGE.margins.left - PAGE.margins.right

  if (type === 'doc') {
    for (const child of kids) drawBlocks(state, child, depth)
    return
  }

  if (type === 'heading') {
    const level = Math.min(Math.max(Number(attrs(node).level ?? 1), 1), 3)
    const size = level === 1 ? 20 : level === 2 ? 16 : 14
    ensureSpace(state, size * 2.2)
    state.y += 8
    drawInline(state, kids, size, PAGE.margins.left, contentWidth)
    state.y += 6
    return
  }

  if (type === 'paragraph') {
    if (!kids.length) {
      state.y += 8
      return
    }
    if (attrs(node).spacingBefore === 'md') state.y += 10
    drawInline(state, kids, 12, PAGE.margins.left + depth * 18, contentWidth - depth * 18)
    state.y += 4
    if (attrs(node).spacingAfter === 'md') state.y += 10
    return
  }

  if (type === 'blockquote') {
    const x = PAGE.margins.left + 12
    ensureSpace(state, 20)
    doc.save()
    doc.moveTo(PAGE.margins.left, state.y).lineTo(PAGE.margins.left, state.y + 12).lineWidth(2).stroke('#a8a29e')
    doc.restore()
    for (const child of kids) drawBlocks(state, child, depth + 1)
    state.y += 4
    void x
    return
  }

  if (type === 'bulletList' || type === 'orderedList') {
    const ordered = type === 'orderedList'
    kids.forEach((item, index) => {
      const marker = ordered ? `${index + 1}. ` : '• '
      const itemKids = children(item)
      const firstPara = itemKids[0]
      if (firstPara) {
        const textNodes = children(firstPara).length ? children(firstPara) : firstPara.type === 'text' ? [firstPara] : []
        ensureSpace(state, 18)
        doc.font(FONT).fontSize(12)
        doc.text(marker, PAGE.margins.left, state.y, { continued: true, width: 24 })
        drawInline(state, textNodes.length ? textNodes : itemKids, 12, PAGE.margins.left + 22, contentWidth - 22)
        for (const rest of itemKids.slice(1)) drawBlocks(state, rest, depth + 1)
      } else {
        for (const rest of itemKids) drawBlocks(state, rest, depth + 1)
      }
    })
    state.y += 4
    return
  }

  if (type === 'horizontalRule') {
    ensureSpace(state, 16)
    state.y += 8
    doc
      .moveTo(PAGE.margins.left + contentWidth * 0.3, state.y)
      .lineTo(PAGE.margins.left + contentWidth * 0.7, state.y)
      .lineWidth(0.8)
      .stroke('#d6d3d1')
    state.y += 12
    return
  }

  if (type === 'codeBlock') {
    const code = tiptapToPlainText(node)
    ensureSpace(state, 24)
    doc.font('Courier').fontSize(10)
    doc.text(code, PAGE.margins.left + 8, state.y, { width: contentWidth - 16 })
    state.y = doc.y + 8
    return
  }

  if (type === 'listItem') {
    for (const child of kids) drawBlocks(state, child, depth)
    return
  }

  for (const child of kids) drawBlocks(state, child, depth)
}

export async function tiptapToPdf(content: unknown, title: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: PAGE.size, margins: PAGE.margins, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })

  doc.font(FONT_BOLD).fontSize(24).text(title, { align: 'left' })
  doc.moveDown(1.5)

  const state: DrawState = { doc, y: doc.y }
  if (isNode(content)) drawBlocks(state, content)
  doc.end()
  return done
}

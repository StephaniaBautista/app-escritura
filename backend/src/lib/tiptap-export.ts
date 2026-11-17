import {
  attrs,
  children,
  escapeHtml,
  escapeMd,
  isNode,
  linkHref,
  markNames,
  tiptapToPlainText,
} from './tiptap-export-nodes.js'

export type ExportFormat = 'md' | 'html' | 'ao3' | 'pdf'

export interface Ao3ExportOptions {
  fontFamily: 'serif' | 'sans' | 'mono'
  fontSize: number
  lineSpacing: number
  paragraphStyle: 'block' | 'indent'
  sceneSeparator: string
  includeTitle: boolean
}

export const DEFAULT_AO3_OPTIONS: Ao3ExportOptions = {
  fontFamily: 'serif',
  fontSize: 14,
  lineSpacing: 1.5,
  paragraphStyle: 'block',
  sceneSeparator: '* * *',
  includeTitle: true,
}

type JsonNode = Record<string, unknown>

export { tiptapToPlainText }

function inlineMd(node: JsonNode): string {
  if (node.type === 'text') {
    const text = typeof node.text === 'string' ? node.text : ''
    const marks = markNames(node)
    let out = escapeMd(text)
    if (marks.has('code')) out = `\`${text}\``
    else {
      if (marks.has('bold') || marks.has('strong')) out = `**${out}**`
      if (marks.has('italic') || marks.has('emphasis')) out = `*${out}*`
      if (marks.has('strike')) out = `~~${out}~~`
    }
    const href = linkHref(node)
    if (href) out = `[${out}](${href})`
    return out
  }
  if (node.type === 'hardBreak') return '\n'
  return children(node).map(inlineMd).join('')
}

function blocksMd(node: JsonNode, depth = 0): string[] {
  const type = typeof node.type === 'string' ? node.type : ''
  const kids = children(node)

  if (type === 'doc') return kids.flatMap((child) => blocksMd(child, depth))
  if (type === 'heading') {
    const level = Number(attrs(node).level ?? 1)
    const hashes = '#'.repeat(Math.min(Math.max(level, 1), 6))
    return [`${hashes} ${kids.map(inlineMd).join('')}`, '']
  }
  if (type === 'paragraph') {
    const text = kids.map(inlineMd).join('')
    return text ? [text, ''] : []
  }
  if (type === 'blockquote') {
    const inner = kids.flatMap((child) => blocksMd(child, depth)).filter(Boolean)
    return inner.length ? [...inner.map((line) => (line ? `> ${line}` : '>')), ''] : []
  }
  if (type === 'bulletList' || type === 'orderedList') {
    const ordered = type === 'orderedList'
    const lines: string[] = []
    kids.forEach((item, index) => {
      const prefix = ordered ? `${index + 1}. ` : '- '
      const itemBlocks = children(item).flatMap((child) => blocksMd(child, depth + 1))
      const [first = '', ...rest] = itemBlocks
      lines.push(`${prefix}${first.trim()}`)
      for (const line of rest) {
        if (!line) continue
        lines.push(`  ${line}`)
      }
    })
    return lines.length ? [...lines, ''] : []
  }
  if (type === 'horizontalRule') return ['---', '']
  if (type === 'codeBlock') {
    const code = tiptapToPlainText(node)
    return ['```', code, '```', '']
  }
  if (type === 'listItem') return kids.flatMap((child) => blocksMd(child, depth))
  return kids.flatMap((child) => blocksMd(child, depth))
}

export function tiptapToMarkdown(content: unknown, title?: string): string {
  const titleBlock = title ? [`# ${title}`, ''] : []
  const body = isNode(content) ? blocksMd(content) : []
  return `${[...titleBlock, ...body].join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

function inlineHtml(node: JsonNode, mode: 'html' | 'ao3'): string {
  if (node.type === 'text') {
    const raw = typeof node.text === 'string' ? node.text : ''
    let text = escapeHtml(raw)
    const marks = markNames(node)
    if (marks.has('code')) text = `<code>${text}</code>`
    else {
      if (marks.has('bold') || marks.has('strong')) text = `<strong>${text}</strong>`
      if (marks.has('italic') || marks.has('emphasis')) text = `<em>${text}</em>`
      if (marks.has('strike')) text = `<del>${text}</del>`
    }
    const href = linkHref(node)
    if (href && /^https?:\/\//i.test(href)) text = `<a href="${escapeHtml(href)}">${text}</a>`
    return text
  }
  if (node.type === 'hardBreak') return mode === 'ao3' ? '<br />' : '<br />\n'
  return children(node).map((child) => inlineHtml(child, mode)).join('')
}

function blocksHtml(node: JsonNode, mode: 'html' | 'ao3'): string[] {
  const type = typeof node.type === 'string' ? node.type : ''
  const kids = children(node)

  if (type === 'doc') return kids.flatMap((child) => blocksHtml(child, mode))
  if (type === 'heading') {
    const level = Math.min(Math.max(Number(attrs(node).level ?? 1), 1), 6)
    return [`<h${level}>${kids.map((child) => inlineHtml(child, mode)).join('')}</h${level}>`]
  }
  if (type === 'paragraph') {
    const text = kids.map((child) => inlineHtml(child, mode)).join('')
    const before = attrs(node).spacingBefore === 'md'
    const after = attrs(node).spacingAfter === 'md'
    if (!text) return mode === 'ao3' ? ['<p>&nbsp;</p>'] : ['<p></p>']
    if (mode === 'html' && (before || after)) {
      const style = [
        before ? 'margin-top: 1.5em' : '',
        after ? 'margin-bottom: 1.5em' : '',
      ].filter(Boolean).join('; ')
      return [`<p style="${style}">${text}</p>`]
    }
    return [`<p>${text}</p>`]
  }
  if (type === 'blockquote') {
    const inner = kids.flatMap((child) => blocksHtml(child, mode)).join('\n')
    return [`<blockquote>\n${inner}\n</blockquote>`]
  }
  if (type === 'bulletList') {
    const items = kids.map((item) => {
      const body = children(item).flatMap((child) => blocksHtml(child, mode)).join('\n')
      return `<li>${body}</li>`
    })
    return [`<ul>\n${items.join('\n')}\n</ul>`]
  }
  if (type === 'orderedList') {
    const items = kids.map((item) => {
      const body = children(item).flatMap((child) => blocksHtml(child, mode)).join('\n')
      return `<li>${body}</li>`
    })
    return [`<ol>\n${items.join('\n')}\n</ol>`]
  }
  if (type === 'horizontalRule') return ['<hr />']
  if (type === 'codeBlock') return [`<pre><code>${escapeHtml(tiptapToPlainText(node))}</code></pre>`]
  if (type === 'listItem') return kids.flatMap((child) => blocksHtml(child, mode))
  return kids.flatMap((child) => blocksHtml(child, mode))
}

const AO3_FONT_STACKS: Record<Ao3ExportOptions['fontFamily'], string> = {
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Helvetica, Arial, sans-serif',
  mono: '"Courier New", Courier, monospace',
}

export function tiptapToHtml(content: unknown, title: string): string {
  const body = isNode(content) ? blocksHtml(content, 'html').join('\n') : ''
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body {
    margin: 0 auto;
    max-width: 42rem;
    padding: 3rem 1.5rem 6rem;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 1.125rem;
    line-height: 1.7;
    color: #1c1917;
    background: #fafaf9;
  }
  h1, h2, h3, h4, h5, h6 { font-family: "Iowan Old Style", "Palatino Linotype", Palatino, serif; line-height: 1.25; margin: 1.6em 0 0.6em; }
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  h3 { font-size: 1.25rem; }
  p { margin: 0 0 1em; }
  blockquote { margin: 1.2em 0; padding: 0.2em 0 0.2em 1em; border-left: 3px solid #a8a29e; color: #44403c; }
  hr { border: 0; border-top: 1px solid #d6d3d1; margin: 2em auto; width: 40%; }
  pre { overflow-x: auto; background: #f5f5f4; padding: 0.75rem 1rem; border-radius: 6px; }
  code { font-family: "Courier New", Courier, monospace; font-size: 0.92em; }
  a { color: #0f766e; }
  .document-title { margin-top: 0; }
  @media print { body { background: #fff; padding: 0; } }
</style>
</head>
<body>
<article>
<h1 class="document-title">${escapeHtml(title)}</h1>
${body}
</article>
</body>
</html>
`
}

export function tiptapToAo3Html(
  content: unknown,
  title: string,
  options: Partial<Ao3ExportOptions> = {},
): string {
  const opts = { ...DEFAULT_AO3_OPTIONS, ...options }
  const body = isNode(content) ? blocksHtml(content, 'ao3') : []
  const style = [
    `font-family: ${AO3_FONT_STACKS[opts.fontFamily]}`,
    `font-size: ${opts.fontSize}px`,
    `line-height: ${opts.lineSpacing}`,
    opts.paragraphStyle === 'indent' ? 'text-indent: 1.5em' : 'text-indent: 0',
  ].join('; ')
  const titleBlock = opts.includeTitle && title ? `<h1>${escapeHtml(title)}</h1>\n` : ''
  const scene = opts.sceneSeparator.trim()
    ? `\n<p style="text-align: center">${escapeHtml(opts.sceneSeparator.trim())}</p>\n`
    : ''
  return `${titleBlock}<div style="${style}">\n${body.join('\n')}\n${scene}</div>`
}

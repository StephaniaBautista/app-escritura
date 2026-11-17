import { describe, expect, it } from 'vitest'
import {
  tiptapToAo3Html,
  tiptapToHtml,
  tiptapToMarkdown,
  tiptapToPlainText,
} from '../tiptap-export.js'
import { tiptapToPdf } from '../tiptap-export-pdf.js'

const sample = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Capítulo uno' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hola ' },
        { type: 'text', marks: [{ type: 'bold' }], text: 'mundo' },
        { type: 'text', text: ' con ' },
        { type: 'text', marks: [{ type: 'italic' }], text: 'énfasis' },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'blockquote',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Una cita' }],
        },
      ],
    },
    {
      type: 'bulletList',
      content: [
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'uno' }],
            },
          ],
        },
        {
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'dos' }],
            },
          ],
        },
      ],
    },
    { type: 'horizontalRule' },
  ],
}

describe('tiptap export converters', () => {
  it('converts to markdown with marks, lists and rules', () => {
    const md = tiptapToMarkdown(sample, 'Mi historia')
    expect(md).toContain('# Mi historia')
    expect(md).toContain('# Capítulo uno')
    expect(md).toContain('**mundo**')
    expect(md).toContain('*énfasis*')
    expect(md).toContain('> Una cita')
    expect(md).toContain('- uno')
    expect(md).toContain('- dos')
    expect(md).toContain('---')
  })

  it('converts to HTML document with escaped content', () => {
    const html = tiptapToHtml(
      {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: '<script>alert(1)</script>' }],
          },
        ],
      },
      'Título & <prueba>',
    )
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Título &amp; &lt;prueba&gt;')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>alert')
  })

  it('emits only AO3-safe tags and applies typography options', () => {
    const ao3 = tiptapToAo3Html(sample, 'Mi historia', {
      fontFamily: 'sans',
      fontSize: 16,
      lineSpacing: 1.8,
      paragraphStyle: 'indent',
      sceneSeparator: '***',
      includeTitle: true,
    })
    expect(ao3).toContain('<h1>Mi historia</h1>')
    expect(ao3).toContain('font-family: Helvetica')
    expect(ao3).toContain('font-size: 16px')
    expect(ao3).toContain('line-height: 1.8')
    expect(ao3).toContain('text-indent: 1.5em')
    expect(ao3).toContain('***')
    expect(ao3).not.toContain('<!DOCTYPE')
    expect(ao3).not.toContain('style="margin-top')
  })

  it('extracts plain text', () => {
    const text = tiptapToPlainText(sample)
    expect(text).toContain('Capítulo uno')
    expect(text).toContain('Hola mundo con énfasis.')
    expect(text).toContain('Una cita')
  })

  it('generates a PDF buffer starting with PDF magic', async () => {
    const pdf = await tiptapToPdf(sample, 'Mi historia')
    expect(pdf.subarray(0, 5).toString('latin1')).toBe('%PDF-')
    expect(pdf.length).toBeGreaterThan(100)
  })
})

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

export interface ExportBody {
  format: ExportFormat
  includeChildren?: boolean
  ao3?: Partial<Ao3ExportOptions>
}

export const exportApi = {
  async exportDocument(documentId: string, body: ExportBody): Promise<{ filename: string; blob: Blob }> {
    const res = await fetch(`/api/documents/${documentId}/export`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: { message: `Error ${res.status}` } }))
      throw new Error(error.error?.message || `Error ${res.status}`)
    }
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="([^"]+)"/)
    const filename = match?.[1] ?? `export.${body.format}`
    const blob = await res.blob()
    return { filename, blob }
  },
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

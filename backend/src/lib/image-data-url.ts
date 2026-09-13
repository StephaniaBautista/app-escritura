const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/]+={0,2})$/s

export function parseImageDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = DATA_URL_RE.exec(dataUrl)
  if (!match) return null
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') }
}

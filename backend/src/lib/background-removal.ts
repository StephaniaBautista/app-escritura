const PHOTOROOM_SEGMENT_URL = 'https://sdk.photoroom.com/v1/segment'

export class BackgroundRemovalUnavailableError extends Error {
  constructor(message = 'Background removal is not configured') {
    super(message)
    this.name = 'BackgroundRemovalUnavailableError'
  }
}

export class BackgroundRemovalFailedError extends Error {
  constructor(message = 'Background removal failed') {
    super(message)
    this.name = 'BackgroundRemovalFailedError'
  }
}

function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'png'
}

export async function removeImageBackground(buffer: Buffer, mime: string): Promise<Buffer> {
  const apiKey = process.env.PHOTOROOM_API_KEY?.trim()
  if (!apiKey) throw new BackgroundRemovalUnavailableError()

  const form = new FormData()
  form.append(
    'image_file',
    new Blob([new Uint8Array(buffer)], { type: mime }),
    `upload.${extForMime(mime)}`,
  )

  const res = await fetch(PHOTOROOM_SEGMENT_URL, {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
    body: form,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new BackgroundRemovalFailedError(`PhotoRoom ${res.status}: ${detail.slice(0, 200)}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.startsWith('image/')) {
    throw new BackgroundRemovalFailedError(`Unexpected content-type: ${contentType}`)
  }

  return Buffer.from(await res.arrayBuffer())
}

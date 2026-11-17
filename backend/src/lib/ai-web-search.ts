import { createHash } from 'node:crypto'
import type { AiSource } from '../services/ai-types.js'

const MAX_QUERY = 180
const MAX_RESULTS = 5
const MAX_EXCERPT = 600
const TIMEOUT_MS = 8_000
const USER_AGENT = 'ArchivumWritingApp/1.0 (adviser-web-search)'
const DDG_ORIGIN = 'https://html.duckduckgo.com'
const BRAVE_ORIGIN = 'https://api.search.brave.com'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function sanitizeSearchQuery(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY)
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, '').replace(/&nbsp;/gi, ' ').replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'").replace(/&amp;/gi, '&').replace(/\s+/g, ' ').trim()
}

function sourceId(url: string): string {
  return `web:${createHash('sha256').update(url).digest('hex').slice(0, 16)}`
}

function publicUrl(value: string): URL | null {
  try {
    const parsed = new URL(value.startsWith('//') ? `https:${value}` : value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    if (parsed.hostname === 'duckduckgo.com' || parsed.hostname.endsWith('.duckduckgo.com')) {
      const nested = parsed.searchParams.get('uddg')
      return nested ? publicUrl(nested) : null
    }
    return parsed
  } catch {
    return null
  }
}

function toSource(title: string, url: string, snippet: string): AiSource | null {
  const dest = publicUrl(url)
  const cleanTitle = stripMarkup(title).slice(0, 160)
  const excerpt = stripMarkup(snippet).slice(0, MAX_EXCERPT)
  if (!dest || !cleanTitle || !excerpt) return null
  return {
    id: sourceId(dest.href),
    type: 'web',
    title: `${cleanTitle} (${dest.hostname})`,
    excerpt,
  }
}

function parseDuckDuckGoHtml(html: string): AiSource[] {
  const sources: AiSource[] = []
  const seen = new Set<string>()
  const pattern = /class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]{0,1200}?class="result__snippet"[^>]*>([\s\S]*?)<\/(?:a|div)>/gi
  for (const match of html.matchAll(pattern)) {
    const source = toSource(match[2] ?? '', match[1] ?? '', match[3] ?? '')
    if (!source || seen.has(source.id)) continue
    seen.add(source.id)
    sources.push(source)
    if (sources.length >= MAX_RESULTS) break
  }
  return sources
}

function parseBravePayload(payload: unknown): AiSource[] {
  if (!isObject(payload) || !isObject(payload.web) || !Array.isArray(payload.web.results)) return []
  const sources: AiSource[] = []
  const seen = new Set<string>()
  for (const entry of payload.web.results) {
    if (!isObject(entry) || typeof entry.title !== 'string' || typeof entry.url !== 'string') continue
    const snippet = typeof entry.description === 'string' ? entry.description : ''
    const source = toSource(entry.title, entry.url, snippet)
    if (!source || seen.has(source.id)) continue
    seen.add(source.id)
    sources.push(source)
    if (sources.length >= MAX_RESULTS) break
  }
  return sources
}

async function request(url: string, init: RequestInit, signal?: AbortSignal): Promise<Response | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const cancel = () => controller.abort()
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) controller.abort()
  try {
    return await fetch(url, { ...init, redirect: 'error', signal: controller.signal })
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
  }
}

async function searchBrave(query: string, locale: 'es' | 'en', apiKey: string, signal?: AbortSignal): Promise<{ status: number | null; sources: AiSource[] }> {
  const params = new URLSearchParams({
    q: query, count: String(MAX_RESULTS), search_lang: locale, country: locale === 'es' ? 'ES' : 'US', text_decorations: 'false',
  })
  const response = await request(`${BRAVE_ORIGIN}/res/v1/web/search?${params}`, {
    method: 'GET',
    headers: { Accept: 'application/json', 'X-Subscription-Token': apiKey, 'User-Agent': USER_AGENT },
  }, signal)
  if (!response) return { status: null, sources: [] }
  if (!response.ok) {
    await response.body?.cancel()
    return { status: response.status, sources: [] }
  }
  return { status: response.status, sources: parseBravePayload(await response.json() as unknown) }
}

async function searchDuckDuckGo(query: string, locale: 'es' | 'en', signal?: AbortSignal): Promise<AiSource[]> {
  const params = new URLSearchParams({ q: query, kl: locale === 'es' ? 'es-es' : 'us-en' })
  const response = await request(`${DDG_ORIGIN}/html/?${params}`, {
    method: 'GET',
    headers: { Accept: 'text/html', 'User-Agent': USER_AGENT },
  }, signal)
  if (!response?.ok) return []
  return parseDuckDuckGoHtml(await response.text())
}

export type WebSearchEngine = 'brave' | 'duckduckgo'

export function webSearchConfig(): { engine: WebSearchEngine; keyConfigured: boolean } {
  const keyConfigured = Boolean(process.env.BRAVE_SEARCH_API_KEY?.trim())
  return { engine: keyConfigured ? 'brave' : 'duckduckgo', keyConfigured }
}

export async function probeWebSearch(signal?: AbortSignal): Promise<{
  engine: WebSearchEngine
  keyConfigured: boolean
  ok: boolean
  status: number | null
  hits: number
}> {
  const config = webSearchConfig()
  const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (config.engine === 'brave' && braveKey) {
    const result = await searchBrave('Madrid', 'es', braveKey, signal)
    return { ...config, ok: result.sources.length > 0, status: result.status, hits: result.sources.length }
  }
  const sources = await searchDuckDuckGo('Madrid', 'es', signal)
  return { ...config, ok: sources.length > 0, status: sources.length ? 200 : null, hits: sources.length }
}

export async function searchWebEvidence(query: string, locale: 'es' | 'en', signal?: AbortSignal): Promise<AiSource[]> {
  const q = sanitizeSearchQuery(query)
  if (!q) return []
  const braveKey = process.env.BRAVE_SEARCH_API_KEY?.trim()
  if (braveKey) {
    const brave = await searchBrave(q, locale, braveKey, signal)
    if (brave.sources.length) return brave.sources
  }
  return searchDuckDuckGo(q, locale, signal)
}

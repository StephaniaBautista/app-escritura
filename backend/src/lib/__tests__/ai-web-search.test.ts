import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { sanitizeSearchQuery, searchWebEvidence } from '../ai-web-search.js'

const fetchMock = vi.fn<typeof fetch>()
const ddgHtml = `
<div class="result">
  <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fmadrid">Madrid climate</a>
  <a class="result__snippet">Average temperatures in Madrid vary by season.</a>
</div>
`

describe('ai web search', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset()
    vi.stubEnv('BRAVE_SEARCH_API_KEY', '')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('trims and caps the public query without fetching user-supplied URLs', () => {
    expect(sanitizeSearchQuery(`  ${'a'.repeat(200)}  `).length).toBe(180)
  })

  it('searches the open web via DuckDuckGo and never follows result URLs', async () => {
    fetchMock.mockResolvedValue(new Response(ddgHtml, { status: 200 }))
    const sources = await searchWebEvidence('  ¿Dónde está Madrid?  ', 'es')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    const requested = new URL(String(url))
    expect(requested.origin + requested.pathname).toBe('https://html.duckduckgo.com/html/')
    expect(requested.searchParams.get('q')).toBe('¿Dónde está Madrid?')
    expect(init).toMatchObject({ method: 'GET', redirect: 'error' })
    expect(sources).toEqual([{
      id: expect.stringMatching(/^web:[a-f0-9]{16}$/),
      type: 'web',
      title: 'Madrid climate (example.com)',
      excerpt: 'Average temperatures in Madrid vary by season.',
    }])
  })

  it('uses Brave web search when a key is configured', async () => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'brave-test-key')
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      web: { results: [{ title: 'Madrid', url: 'https://weather.example/madrid', description: 'Open web forecast.' }] },
    }), { status: 200 }))
    const sources = await searchWebEvidence('Madrid weather', 'en')
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^https:\/\/api\.search\.brave\.com\/res\/v1\/web\/search\?/)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      headers: expect.objectContaining({ 'X-Subscription-Token': 'brave-test-key' }),
    })
    expect(sources[0]).toMatchObject({ type: 'web', title: 'Madrid (weather.example)', excerpt: 'Open web forecast.' })
  })

  it('probes Brave without returning the key or page text', async () => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'brave-test-key')
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      web: { results: [{ title: 'Madrid', url: 'https://weather.example/madrid', description: 'secret snippet' }] },
    }), { status: 200 }))
    const { probeWebSearch, webSearchConfig } = await import('../ai-web-search.js')
    expect(webSearchConfig()).toEqual({ engine: 'brave', keyConfigured: true })
    const probe = await probeWebSearch()
    expect(probe).toEqual({ engine: 'brave', keyConfigured: true, ok: true, status: 200, hits: 1 })
    expect(JSON.stringify(probe)).not.toContain('brave-test-key')
    expect(JSON.stringify(probe)).not.toContain('secret snippet')
  })

  it('marks a rejected Brave key as failing without falling back in the probe', async () => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'brave-test-key')
    fetchMock.mockResolvedValue(new Response('unauthorized', { status: 401 }))
    const { probeWebSearch } = await import('../ai-web-search.js')
    await expect(probeWebSearch()).resolves.toEqual({
      engine: 'brave', keyConfigured: true, ok: false, status: 401, hits: 0,
    })
  })

  it('returns no sources when the search provider is unavailable', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    await expect(searchWebEvidence('Madrid', 'en')).resolves.toEqual([])
  })
})

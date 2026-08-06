import { describe, it, expect, afterEach } from 'vitest'
import { getTrustedHost } from '../trusted-host.js'

const originalBetterAuthUrl = process.env.BETTER_AUTH_URL
const originalFrontendUrl = process.env.FRONTEND_URL

afterEach(() => {
  if (originalBetterAuthUrl !== undefined) process.env.BETTER_AUTH_URL = originalBetterAuthUrl
  else delete process.env.BETTER_AUTH_URL
  if (originalFrontendUrl !== undefined) process.env.FRONTEND_URL = originalFrontendUrl
  else delete process.env.FRONTEND_URL
})

describe('getTrustedHost', () => {
  it('acepta el host de BETTER_AUTH_URL', () => {
    process.env.BETTER_AUTH_URL = 'https://api.archivum.app'
    expect(getTrustedHost('api.archivum.app')).toBe('api.archivum.app')
  })

  it('acepta localhost de dev (backend y frontend)', () => {
    expect(getTrustedHost('localhost:3001')).toBe('localhost:3001')
    expect(getTrustedHost('localhost:5173')).toBe('localhost:5173')
  })

  it('rechaza un Host malicioso y cae al host de confianza', () => {
    process.env.BETTER_AUTH_URL = 'https://api.archivum.app'
    expect(getTrustedHost('evil.com')).toBe('api.archivum.app')
  })

  it('rechaza Host ausente y cae al host de confianza', () => {
    process.env.BETTER_AUTH_URL = 'https://api.archivum.app'
    expect(getTrustedHost(undefined)).toBe('api.archivum.app')
  })

  it('no confunde subdominios similares (suffix match no basta)', () => {
    process.env.BETTER_AUTH_URL = 'https://archivum.app'
    expect(getTrustedHost('evilarchivum.app')).toBe('archivum.app')
  })
})

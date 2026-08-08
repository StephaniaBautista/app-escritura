import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { i18nRoutes } from '../i18n.js'

async function buildApp() {
  const app = Fastify()
  await app.register(i18nRoutes, { prefix: '/api' })
  await app.ready()
  return app
}

describe('GET /api/i18n/:lng/:ns', () => {
  it('devuelve 200 con el namespace y cabeceras de cache', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/i18n/es/common' })

    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['cache-control']).toBe('no-cache')
    expect(res.headers.etag).toBeDefined()
    expect(res.json()).toBeInstanceOf(Object)
    await app.close()
  })

  it('devuelve 304 con If-None-Match válido', async () => {
    const app = await buildApp()
    const first = await app.inject({ method: 'GET', url: '/api/i18n/es/common' })
    const etag = first.headers.etag

    const res = await app.inject({
      method: 'GET',
      url: '/api/i18n/es/common',
      headers: { 'if-none-match': etag },
    })

    expect(res.statusCode).toBe(304)
    await app.close()
  })

  it('rechaza idioma no soportado (400, validación de schema)', async () => {
    const app = await buildApp()
    const res = await app.inject({ method: 'GET', url: '/api/i18n/fr/common' })
    expect(res.statusCode).toBe(400)
    await app.close()
  })

  it('rechaza namespace inexistente con 404 y path-traversal con 400', async () => {
    const app = await buildApp()

    const res1 = await app.inject({ method: 'GET', url: '/api/i18n/es/no-existe' })
    expect(res1.statusCode).toBe(404)

    const res2 = await app.inject({ method: 'GET', url: '/api/i18n/es/%2e%2e%2fmanifest' })
    expect(res2.statusCode).toBe(400)

    await app.close()
  })
})

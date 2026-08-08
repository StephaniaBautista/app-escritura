import { describe, it, expect } from 'vitest'
import { i18nService } from '../i18n-service.js'

describe('i18nService', () => {
  it('lista los idiomas soportados', () => {
    expect(i18nService.getSupportedLanguages()).toEqual(['es', 'en'])
  })

  it('lista los namespaces del manifest', () => {
    const ns = i18nService.getNamespaces()
    expect(ns.length).toBeGreaterThan(0)
    expect(ns).toContain('common')
    expect(ns).toContain('storySetup')
    expect(ns).toContain('editorApp')
  })

  it('devuelve un namespace completo', () => {
    const data = i18nService.getNamespace('es', 'common')
    expect(data).not.toBeNull()
    expect(typeof data).toBe('object')
  })

  it('rechaza un idioma no soportado', () => {
    expect(i18nService.getNamespace('fr', 'common')).toBeNull()
  })

  it('rechaza un namespace desconocido (anti path-traversal)', () => {
    expect(i18nService.getNamespace('es', '../manifest')).toBeNull()
    expect(i18nService.getNamespace('es', '../../package')).toBeNull()
    expect(i18nService.getNamespace('es', 'no-existe')).toBeNull()
  })

  it('cachea la segunda llamada (mismo objeto)', () => {
    const a = i18nService.getNamespace('es', 'common')
    const b = i18nService.getNamespace('es', 'common')
    expect(a).toBe(b)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { useActivityStore } from '../activity-store'

const STORAGE_KEY = 'archivum-activity'
const LEGACY_STORAGE_KEY = 'escritura-activity'

const sampleActivity = {
  type: 'document_created' as const,
  title: 'Capítulo 1',
  folderId: 'proj-1',
  documentId: 'doc-1',
}

describe('activity-store', () => {
  beforeEach(() => {
    localStorage.clear()
    useActivityStore.setState({ activities: [] })
  })

  it('addActivity guarda en la clave actual y prepende', () => {
    useActivityStore.getState().addActivity(sampleActivity)

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    expect(stored).toHaveLength(1)
    expect(stored[0].title).toBe('Capítulo 1')
    expect(useActivityStore.getState().activities[0].title).toBe('Capítulo 1')
  })

  it('loadActivities carga desde la clave actual', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...sampleActivity, id: 'a1', timestamp: 1 }]))

    useActivityStore.getState().loadActivities()

    expect(useActivityStore.getState().activities).toHaveLength(1)
  })

  it('loadActivities migra datos desde la clave legacy (rename Archivum)', () => {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify([{ ...sampleActivity, id: 'a1', timestamp: 1 }]))

    useActivityStore.getState().loadActivities()

    expect(useActivityStore.getState().activities).toHaveLength(1)
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull()
    expect(localStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
  })

  it('loadActivities ignora JSON corrupto', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json')

    useActivityStore.getState().loadActivities()

    expect(useActivityStore.getState().activities).toHaveLength(0)
  })

  it('removeByDocument filtra y persiste', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { ...sampleActivity, id: 'a1', timestamp: 1 },
      { type: 'document_created', title: 'Otro', folderId: 'p', documentId: 'doc-2', id: 'a2', timestamp: 2 },
    ]))

    useActivityStore.getState().loadActivities()
    useActivityStore.getState().removeByDocument('doc-1')

    expect(useActivityStore.getState().activities).toHaveLength(1)
    expect(useActivityStore.getState().activities[0].documentId).toBe('doc-2')
  })

  it('removeByFolder filtra y persiste', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([
      { ...sampleActivity, id: 'a1', timestamp: 1 },
      { type: 'folder_created', title: 'Proyecto B', folderId: 'proj-2', id: 'a2', timestamp: 2 },
    ]))

    useActivityStore.getState().loadActivities()
    useActivityStore.getState().removeByFolder('proj-1')

    expect(useActivityStore.getState().activities).toHaveLength(1)
    expect(useActivityStore.getState().activities[0].folderId).toBe('proj-2')
  })
})
import { describe, expect, it, vi } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PrismaClient } from '@generated/client'
import { temporaryPath } from './ai-fixture.js'
import { cleanupStats, parseStatsFixture } from './stats-fixture.js'

const marker = 'phase10-00000000-0000-4000-8000-000000000001'
const path = join(tmpdir(), 'archivum-phase10-fixture.json')
const manifest = {
  version: 1, marker, userId: 'owner', foreignUserId: 'foreign', projectId: 'project', foreignProjectId: 'foreign-project',
  storageStatePath: join(tmpdir(), `archivum-${marker}-owner-auth.json`), foreignStorageStatePath: join(tmpdir(), `archivum-${marker}-foreign-auth.json`),
  yesterday: '2026-09-11', previousDay: '2026-09-10',
}

function database() {
  const transaction = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ name: 'Phase 10 synthetic verification', email: `${marker}-${where.id}@example.invalid` })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    project: { findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ userId: where.id === 'foreign-project' ? 'foreign' : 'owner' })) },
  }
  const prisma = { $transaction: async (run: (client: typeof transaction) => Promise<void>) => run(transaction) } as unknown as PrismaClient
  return { transaction, prisma }
}

describe('phase 10 fixture safety', () => {
  it('shares temporary-file protection while preserving phase 9 defaults', async () => {
    await expect(temporaryPath(path, 10)).resolves.toMatch(/archivum-phase10-fixture\.json$/)
    await expect(temporaryPath(path)).rejects.toThrow('archivum-phase9')
    await expect(temporaryPath('/etc/archivum-phase10-fixture.json', 10)).rejects.toThrow('temporary directory')
  })

  it('requires distinct tracked accounts and marker-specific state paths', () => {
    expect(parseStatsFixture(manifest, path).marker).toBe(marker)
    expect(() => parseStatsFixture({ ...manifest, marker: 'existing-user' }, path)).toThrow('marker')
    expect(() => parseStatsFixture({ ...manifest, foreignUserId: 'owner' }, path)).toThrow('distinct')
    expect(() => parseStatsFixture({ ...manifest, storageStatePath: '/etc/passwd' }, path)).toThrow('Authentication paths')
  })

  it('refuses a real account or transferred project before deletion', async () => {
    const real = database()
    real.transaction.user.findUnique.mockResolvedValueOnce({ name: 'Real person', email: 'real@example.com' })
    await expect(cleanupStats(real.prisma, parseStatsFixture(manifest, path))).rejects.toThrow('identity does not match')
    expect(real.transaction.user.deleteMany).not.toHaveBeenCalled()
    const transferred = database()
    transferred.transaction.project.findUnique.mockResolvedValueOnce({ userId: 'real-user' })
    await expect(cleanupStats(transferred.prisma, parseStatsFixture(manifest, path))).rejects.toThrow('ownership changed')
    expect(transferred.transaction.user.deleteMany).not.toHaveBeenCalled()
  })

  it('removes only tracked synthetic accounts without changing roles', async () => {
    const { transaction, prisma } = database()
    await cleanupStats(prisma, parseStatsFixture(manifest, path))
    expect(transaction.user.deleteMany).toHaveBeenCalledTimes(2)
    expect(transaction.user.deleteMany).toHaveBeenCalledWith({ where: { id: 'owner', name: 'Phase 10 synthetic verification', email: `${marker}-owner@example.invalid` } })
    expect(transaction.user.deleteMany).toHaveBeenCalledWith({ where: { id: 'foreign', name: 'Phase 10 synthetic verification', email: `${marker}-foreign@example.invalid` } })
  })
})

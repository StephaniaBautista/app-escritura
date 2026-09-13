import { describe, expect, it, vi } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { PrismaClient } from '@generated/client'
import { parseFixture, removeDatabaseFixture, temporaryPath } from './ai-fixture.js'

const marker = 'phase9-00000000-0000-4000-8000-000000000001'
const path = join(tmpdir(), 'archivum-phase9-fixture.json')
const manifest = {
  version: 1, marker, roleName: marker, roleCreated: true,
  deniedRoleName: `${marker}-denied`, deniedRoleCreated: true,
  userId: 'synthetic-writer', deniedUserId: 'synthetic-denied',
  storageStatePath: join(tmpdir(), `archivum-${marker}-writer-auth.json`),
  deniedStorageStatePath: join(tmpdir(), `archivum-${marker}-denied-auth.json`),
}

function database() {
  const transaction = {
    user: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({
        email: `${marker}-${where.id === 'synthetic-writer' ? 'writer' : 'denied'}@example.invalid`,
        name: 'Phase 9 synthetic verification',
      })),
      count: vi.fn(async () => 0), deleteMany: vi.fn(async () => ({ count: 1 })),
    },
    role: {
      findUnique: vi.fn(async () => ({ isSystem: false, label: 'Phase 9 synthetic verification' })),
      deleteMany: vi.fn(async () => ({ count: 1 })),
    },
  }
  const prisma = { $transaction: async (run: (client: typeof transaction) => Promise<void>) => run(transaction) } as unknown as PrismaClient
  return { transaction, prisma }
}

describe('synthetic AI fixture safety', () => {
  it('accepts only matching marker-owned authentication paths and distinct account IDs', () => {
    expect(parseFixture(manifest, path).marker).toBe(marker)
    expect(() => parseFixture({ ...manifest, marker: 'real-user' }, path)).toThrow('marker')
    expect(() => parseFixture({ ...manifest, storageStatePath: '/etc/passwd' }, path)).toThrow('Authentication files')
    expect(() => parseFixture({ ...manifest, deniedUserId: manifest.userId }, path)).toThrow('distinct')
    expect(() => parseFixture({ ...manifest, roleName: 'admin' }, path)).toThrow('marker')
  })

  it('restricts manifest paths to named files in real temporary directories', async () => {
    await expect(temporaryPath(path)).resolves.toMatch(/archivum-phase9-fixture\.json$/)
    await expect(temporaryPath('/etc/archivum-phase9-fixture.json')).rejects.toThrow('temporary directory')
    await expect(temporaryPath(join(tmpdir(), 'unrelated.json'))).rejects.toThrow('named archivum-phase9')
  })

  it('refuses a tracked ID that resolves to a real account before deleting anything', async () => {
    const { transaction, prisma } = database()
    transaction.user.findUnique.mockResolvedValueOnce({ email: 'real@example.com', name: 'A real user' })
    await expect(removeDatabaseFixture(prisma, parseFixture(manifest, path))).rejects.toThrow('exact synthetic marker')
    expect(transaction.user.deleteMany).not.toHaveBeenCalled()
    expect(transaction.role.deleteMany).not.toHaveBeenCalled()
  })

  it('refuses system roles and roles assigned to untracked users', async () => {
    const system = database()
    system.transaction.role.findUnique.mockResolvedValueOnce({ isSystem: true, label: 'Phase 9 synthetic verification' })
    await expect(removeDatabaseFixture(system.prisma, parseFixture(manifest, path))).rejects.toThrow('role that is not owned')
    expect(system.transaction.user.deleteMany).not.toHaveBeenCalled()
    const assigned = database()
    assigned.transaction.user.count.mockResolvedValueOnce(1)
    await expect(removeDatabaseFixture(assigned.prisma, parseFixture(manifest, path))).rejects.toThrow('untracked account')
    expect(assigned.transaction.user.deleteMany).not.toHaveBeenCalled()
  })

  it('deletes only tracked IDs with matching synthetic identity and non-system role constraints', async () => {
    const { transaction, prisma } = database()
    await removeDatabaseFixture(prisma, parseFixture(manifest, path))
    expect(transaction.user.deleteMany).toHaveBeenCalledTimes(2)
    expect(transaction.user.deleteMany).toHaveBeenCalledWith({ where: {
      id: 'synthetic-writer', email: `${marker}-writer@example.invalid`, name: 'Phase 9 synthetic verification',
    } })
    expect(transaction.role.deleteMany).toHaveBeenCalledTimes(2)
    expect(transaction.role.deleteMany).toHaveBeenCalledWith({ where: { name: marker, label: 'Phase 9 synthetic verification', isSystem: false } })
  })
})

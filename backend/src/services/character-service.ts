import { Prisma } from '@generated/client'
import { prisma } from '../lib/prisma.js'

export interface CharacterAttributes {
  motivations?: string
  weaknesses?: string
  internalConflict?: string
  personality?: string
  virtues?: string
  flaws?: string
  jobStudies?: string
  clothing?: string
  skills?: string
  health?: string
  hobbies?: string
  extraData?: string
}

export interface CharacterInput {
  name?: string
  description?: string | null
  imageUrl?: string | null
  nicknames?: string[]
  age?: string | null
  gender?: string | null
  heightCm?: number | null
  orientation?: string | null
  maritalStatus?: string | null
  species?: string | null
  birthPlace?: string | null
  birthDate?: string | null
  role?: string | null
  roleSpec?: string | null
  isOC?: boolean
  parentIds?: string[]
  attributes?: CharacterAttributes
}

export interface EvolveInput {
  reason: string
  changes: CharacterInput
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

async function sanitizeParentIds(projectId: string, parentIds: string[] | undefined, selfId?: string) {
  if (!parentIds || parentIds.length === 0) return []
  const characters = await prisma.character.findMany({
    where: { projectId, id: { in: parentIds } },
    select: { id: true },
  })
  const valid = new Set(characters.map((c) => c.id))
  if (selfId) valid.delete(selfId)
  return parentIds.filter((id) => valid.has(id))
}

export const characterService = {
  async listByProject(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.character.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    })
  },

  async get(id: string, userId: string) {
    return prisma.character.findFirst({
      where: { id, project: { userId } },
      include: { evolutions: { orderBy: { createdAt: 'asc' } } },
    })
  },

  async create(projectId: string, userId: string, data: CharacterInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null

    const parentIds = await sanitizeParentIds(projectId, data.parentIds)
    return prisma.character.create({
      data: {
        name: data.name ?? '',
        description: data.description ?? null,
        imageUrl: data.imageUrl ?? null,
        nicknames: data.nicknames ?? [],
        age: data.age ?? null,
        gender: data.gender ?? null,
        heightCm: data.heightCm ?? null,
        orientation: data.orientation ?? null,
        maritalStatus: data.maritalStatus ?? null,
        species: data.species ?? null,
        birthPlace: data.birthPlace ?? null,
        birthDate: data.birthDate ?? null,
        role: data.role ?? null,
        roleSpec: data.roleSpec ?? null,
        isOC: data.isOC ?? false,
        parentIds,
        attributes: (data.attributes ?? {}) as Prisma.InputJsonValue,
        projectId,
      },
    })
  },

  async update(id: string, userId: string, data: CharacterInput) {
    const character = await prisma.character.findFirst({ where: { id, project: { userId } } })
    if (!character) return null

    const parentIds = await sanitizeParentIds(character.projectId, data.parentIds, id)
    return prisma.character.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        imageUrl: data.imageUrl,
        nicknames: data.nicknames,
        age: data.age,
        gender: data.gender,
        heightCm: data.heightCm,
        orientation: data.orientation,
        maritalStatus: data.maritalStatus,
        species: data.species,
        birthPlace: data.birthPlace,
        birthDate: data.birthDate,
        role: data.role,
        roleSpec: data.roleSpec,
        isOC: data.isOC,
        parentIds,
        attributes: data.attributes as Prisma.InputJsonValue,
      },
    })
  },

  async delete(id: string, userId: string) {
    const character = await prisma.character.findFirst({ where: { id, project: { userId } } })
    if (!character) return false

    await prisma.$transaction(async (tx) => {
      const referencing = await tx.character.findMany({
        where: { projectId: character.projectId, parentIds: { has: id } },
        select: { id: true, parentIds: true },
      })
      for (const ref of referencing) {
        await tx.character.update({
          where: { id: ref.id },
          data: { parentIds: ref.parentIds.filter((pid) => pid !== id) },
        })
      }
      await tx.character.delete({ where: { id } })
    })
    return true
  },

  async evolve(id: string, userId: string, input: EvolveInput) {
    const source = await prisma.character.findFirst({ where: { id, project: { userId } } })
    if (!source) return null

    const changes = input.changes ?? {}
    const parentIds = await sanitizeParentIds(source.projectId, changes.parentIds ?? source.parentIds)
    return prisma.character.create({
      data: {
        name: changes.name ?? source.name,
        description: changes.description ?? source.description,
        imageUrl: changes.imageUrl ?? source.imageUrl,
        nicknames: changes.nicknames ?? source.nicknames,
        age: changes.age ?? source.age,
        gender: changes.gender ?? source.gender,
        heightCm: changes.heightCm ?? source.heightCm,
        orientation: changes.orientation ?? source.orientation,
        maritalStatus: changes.maritalStatus ?? source.maritalStatus,
        species: changes.species ?? source.species,
        birthPlace: changes.birthPlace ?? source.birthPlace,
        birthDate: changes.birthDate ?? source.birthDate,
        role: changes.role ?? source.role,
        roleSpec: changes.roleSpec ?? source.roleSpec,
        isOC: changes.isOC ?? source.isOC,
        parentIds,
        attributes: (changes.attributes ?? source.attributes) as Prisma.InputJsonValue,
        evolvesFromId: source.id,
        evolutionReason: input.reason ?? null,
        projectId: source.projectId,
      },
    })
  },
}

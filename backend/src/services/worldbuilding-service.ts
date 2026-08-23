import { Prisma } from '@generated/client'
import { prisma } from '../lib/prisma.js'

export const LORE_TYPES = ['magic', 'faction', 'religion', 'location', 'item', 'custom'] as const
export type LoreType = typeof LORE_TYPES[number]

export interface LoreEntryInput {
  name?: string
  description?: string | null
  type?: string
  limits?: string | null
  order?: number
}

export interface RaceInput {
  name?: string
  classification?: string | null
  description?: string | null
  physicalTraits?: string | null
  hasMagic?: boolean
  magicDescription?: string | null
  lifeExpectancy?: number | null
  language?: string | null
  culture?: string | null
  religion?: string | null
  origin?: string | null
  territory?: string | null
}

export interface GlossaryEntryInput {
  word?: string
  pronunciation?: string | null
  meaning?: string | null
}

export interface CreatureInput {
  name?: string
  species?: string | null
  dangerType?: string | null
  description?: string | null
}

export interface LocationInput {
  name?: string
  description?: string | null
  position?: { x: number; y: number }
}

export interface WorldRouteInput {
  locationAId?: string
  locationBId?: string
  label?: string | null
}

function isProjectOwner(projectId: string, userId: string) {
  return prisma.project.findFirst({ where: { id: projectId, userId } })
}

function normalizeLoreType(type: string | undefined): LoreType {
  return LORE_TYPES.includes(type as LoreType) ? type as LoreType : 'custom'
}

export const worldbuildingService = {
  // --- Lore ---
  async listLore(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.loreEntry.findMany({
      where: { projectId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    })
  },

  async createLore(projectId: string, userId: string, data: LoreEntryInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    const order = data.order ?? (await prisma.loreEntry.count({ where: { projectId } }))
    return prisma.loreEntry.create({
      data: {
        projectId,
        name: data.name ?? '',
        description: data.description ?? null,
        type: normalizeLoreType(data.type),
        limits: data.limits ?? null,
        order,
      },
    })
  },

  async updateLore(id: string, userId: string, data: LoreEntryInput) {
    const entry = await prisma.loreEntry.findFirst({ where: { id, project: { userId } } })
    if (!entry) return null
    return prisma.loreEntry.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type === undefined ? undefined : normalizeLoreType(data.type),
        limits: data.limits,
        order: data.order,
      },
    })
  },

  async removeLore(id: string, userId: string) {
    const entry = await prisma.loreEntry.findFirst({ where: { id, project: { userId } } })
    if (!entry) return false
    await prisma.loreEntry.delete({ where: { id } })
    return true
  },

  // --- Razas ---
  async listRaces(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.race.findMany({ where: { projectId }, orderBy: { name: 'asc' } })
  },

  async createRace(projectId: string, userId: string, data: RaceInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.race.create({
      data: {
        projectId,
        name: data.name ?? '',
        classification: data.classification ?? null,
        description: data.description ?? null,
        physicalTraits: data.physicalTraits ?? null,
        hasMagic: data.hasMagic ?? false,
        magicDescription: data.magicDescription ?? null,
        lifeExpectancy: data.lifeExpectancy ?? null,
        language: data.language ?? null,
        culture: data.culture ?? null,
        religion: data.religion ?? null,
        origin: data.origin ?? null,
        territory: data.territory ?? null,
      },
    })
  },

  async updateRace(id: string, userId: string, data: RaceInput) {
    const race = await prisma.race.findFirst({ where: { id, project: { userId } } })
    if (!race) return null
    return prisma.race.update({
      where: { id },
      data: {
        name: data.name,
        classification: data.classification,
        description: data.description,
        physicalTraits: data.physicalTraits,
        hasMagic: data.hasMagic,
        magicDescription: data.magicDescription,
        lifeExpectancy: data.lifeExpectancy,
        language: data.language,
        culture: data.culture,
        religion: data.religion,
        origin: data.origin,
        territory: data.territory,
      },
    })
  },

  async removeRace(id: string, userId: string) {
    const race = await prisma.race.findFirst({ where: { id, project: { userId } } })
    if (!race) return false
    await prisma.race.delete({ where: { id } })
    return true
  },

  // --- Glosario ---
  async listGlossary(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.glossaryEntry.findMany({ where: { projectId }, orderBy: { word: 'asc' } })
  },

  async createGlossary(projectId: string, userId: string, data: GlossaryEntryInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.glossaryEntry.create({
      data: {
        projectId,
        word: data.word ?? '',
        pronunciation: data.pronunciation ?? null,
        meaning: data.meaning ?? null,
      },
    })
  },

  async updateGlossary(id: string, userId: string, data: GlossaryEntryInput) {
    const entry = await prisma.glossaryEntry.findFirst({ where: { id, project: { userId } } })
    if (!entry) return null
    return prisma.glossaryEntry.update({
      where: { id },
      data: {
        word: data.word,
        pronunciation: data.pronunciation,
        meaning: data.meaning,
      },
    })
  },

  async removeGlossary(id: string, userId: string) {
    const entry = await prisma.glossaryEntry.findFirst({ where: { id, project: { userId } } })
    if (!entry) return false
    await prisma.glossaryEntry.delete({ where: { id } })
    return true
  },

  // --- Criaturas ---
  async listCreatures(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.creature.findMany({ where: { projectId }, orderBy: { name: 'asc' } })
  },

  async createCreature(projectId: string, userId: string, data: CreatureInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.creature.create({
      data: {
        projectId,
        name: data.name ?? '',
        species: data.species ?? null,
        dangerType: data.dangerType ?? null,
        description: data.description ?? null,
      },
    })
  },

  async updateCreature(id: string, userId: string, data: CreatureInput) {
    const creature = await prisma.creature.findFirst({ where: { id, project: { userId } } })
    if (!creature) return null
    return prisma.creature.update({
      where: { id },
      data: {
        name: data.name,
        species: data.species,
        dangerType: data.dangerType,
        description: data.description,
      },
    })
  },

  async removeCreature(id: string, userId: string) {
    const creature = await prisma.creature.findFirst({ where: { id, project: { userId } } })
    if (!creature) return false
    await prisma.creature.delete({ where: { id } })
    return true
  },

  // --- Ubicaciones ---
  async listLocations(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.location.findMany({ where: { projectId }, orderBy: { name: 'asc' } })
  },

  async createLocation(projectId: string, userId: string, data: LocationInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.location.create({
      data: {
        projectId,
        name: data.name ?? '',
        description: data.description ?? null,
        position: (data.position ?? {}) as Prisma.InputJsonValue,
      },
    })
  },

  async updateLocation(id: string, userId: string, data: LocationInput) {
    const location = await prisma.location.findFirst({ where: { id, project: { userId } } })
    if (!location) return null
    return prisma.location.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        position: data.position === undefined ? undefined : (data.position as Prisma.InputJsonValue),
      },
    })
  },

  async removeLocation(id: string, userId: string) {
    const location = await prisma.location.findFirst({ where: { id, project: { userId } } })
    if (!location) return false
    await prisma.location.delete({ where: { id } })
    return true
  },

  // --- Rutas ---
  async listRoutes(projectId: string, userId: string) {
    const project = await isProjectOwner(projectId, userId)
    if (!project) return null
    return prisma.worldRoute.findMany({ where: { projectId } })
  },

  async createRoute(projectId: string, userId: string, data: WorldRouteInput) {
    const project = await isProjectOwner(projectId, userId)
    if (!project || !data.locationAId || !data.locationBId) return null
    if (data.locationAId === data.locationBId) return null
    const [a, b] = [data.locationAId, data.locationBId].sort()
    const exists = await prisma.worldRoute.findUnique({
      where: { locationAId_locationBId: { locationAId: a, locationBId: b } },
    })
    if (exists) return exists
    return prisma.worldRoute.create({
      data: {
        projectId,
        locationAId: a,
        locationBId: b,
        label: data.label ?? null,
      },
    })
  },

  async removeRoute(id: string, userId: string) {
    const route = await prisma.worldRoute.findFirst({ where: { id, project: { userId } } })
    if (!route) return false
    await prisma.worldRoute.delete({ where: { id } })
    return true
  },
}

import { prisma } from './prisma.js'
import { source, type AiSource } from './rag-context.js'

export async function worldContext(projectId: string, userId: string, characterNames: Map<string, string>): Promise<AiSource[]> {
  const scope = { where: { projectId, project: { userId } }, take: 100, orderBy: { id: 'asc' as const } }
  const [worlds, lore, races, glossary, creatures, locations, routes, events, relationships, subplots, boards, eras] = await Promise.all([
    prisma.world.findMany({ ...scope, select: { id: true, name: true, description: true, content: true } }),
    prisma.loreEntry.findMany({ ...scope, select: { id: true, name: true, type: true, description: true, limits: true, powerSource: true, cost: true, usedBy: true } }),
    prisma.race.findMany({ ...scope, select: {
      id: true, name: true, classification: true, description: true, physicalTraits: true,
      hasMagic: true, magicDescription: true, spiritualTraits: true, lifeExpectancy: true, language: true,
      culture: true, religion: true, origin: true, territory: true, relationsWithOthers: true, importantNotes: true,
    } }),
    prisma.glossaryEntry.findMany({ ...scope, select: { id: true, word: true, pronunciation: true, meaning: true } }),
    prisma.creature.findMany({ ...scope, select: { id: true, name: true, species: true, dangerType: true, description: true } }),
    prisma.location.findMany({ ...scope, select: { id: true, name: true, description: true } }),
    prisma.worldRoute.findMany({ ...scope, select: {
      id: true, label: true,
      locationA: { select: { name: true, projectId: true } },
      locationB: { select: { name: true, projectId: true } },
    } }),
    prisma.timelineEvent.findMany({ ...scope, select: {
      id: true, title: true, date: true, endDate: true, eraId: true,
      description: true, characterIds: true, relatedDocumentIds: true,
    } }),
    prisma.characterRelationship.findMany({ ...scope, select: {
      id: true, type: true, label: true, description: true,
      characterA: { select: { name: true, projectId: true } },
      characterB: { select: { name: true, projectId: true } },
    } }),
    prisma.subplot.findMany({ ...scope, select: { id: true, title: true, description: true, status: true } }),
    prisma.structureBoard.findMany({ ...scope, take: 20, select: {
      id: true, name: true,
      columns: { take: 30, orderBy: { order: 'asc' }, select: {
        name: true,
        cards: { take: 60, orderBy: { order: 'asc' }, select: { title: true, description: true, cardType: true } },
      } },
    } }),
    prisma.timelineEra.findMany({ ...scope, select: { id: true, name: true, startDate: true, endDate: true, precision: true } }),
  ])
  const eraNames = new Map(eras.map((era) => [era.id, era.name]))
  return [
    ...worlds.map((row) => source('world', row.id, row.name, row)),
    ...lore.map((row) => source('lore', row.id, row.name, row)),
    ...races.map((row) => source('race', row.id, row.name, row)),
    ...glossary.map((row) => source('glossary', row.id, row.word, row)),
    ...creatures.map((row) => source('creature', row.id, row.name, row)),
    ...locations.map((row) => source('location', row.id, row.name, row)),
    ...routes.filter((row) => row.locationA.projectId === projectId && row.locationB.projectId === projectId)
      .map((row) => source('route', row.id, row.label ?? `${row.locationA.name} – ${row.locationB.name}`, { from: row.locationA.name, to: row.locationB.name, label: row.label })),
    ...eras.map((row) => source('timeline', `era:${row.id}`, row.name, row)),
    ...events.map((row) => source('timeline', row.id, row.title, {
      title: row.title, date: row.date, endDate: row.endDate, description: row.description,
      era: row.eraId ? eraNames.get(row.eraId) : undefined,
      characters: (row.characterIds ?? []).map((id) => characterNames.get(id)).filter(Boolean),
    })),
    ...relationships.filter((row) => row.characterA.projectId === projectId && row.characterB.projectId === projectId)
      .map((row) => source('relationship', row.id, `${row.characterA.name} – ${row.characterB.name}`, { characters: [row.characterA.name, row.characterB.name], type: row.type, label: row.label, description: row.description })),
    ...subplots.map((row) => source('subplot', row.id, row.title, row)),
    ...boards.map((row) => source('structure', row.id, row.name, row)),
  ]
}

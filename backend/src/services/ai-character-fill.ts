import { prisma } from '../lib/prisma.js'
import { ragService } from '../lib/rag-service.js'
import { aiClient, type AiProvider } from '../lib/ai-client.js'
import { AI_ADVISER_INSTRUCTIONS } from './ai-guard.js'
import { authorizeAi, withAiQuota } from './ai-access.js'
import { generateValidated } from './ai-generation.js'
import { AiServiceError, type AiLocale, type AiSource } from './ai-types.js'
import { assertManuscriptEligible } from './ai-wizard-eligibility.js'
import { projectWordCount, type AiWizardInput } from './ai-wizard.js'
import { characterFillGaps, type CharacterFillField } from './ai-character-eligibility.js'
import { characterHasEvidence, parseCharacterFill, type CharacterFill } from './ai-character-parse.js'
import { orientationCatalog } from './ai-character-orientation.js'
import { characterOptionService } from './character-option-service.js'

export interface AiCharacterFillInput extends AiWizardInput {
  characterId?: string
  name?: string
}

export interface AiCharacterFillResult {
  characters: CharacterFill[]
  sources: AiSource[]
  provider: AiProvider | ''
  model: string
}

function providerOrDefault(provider?: AiProvider): AiProvider {
  if (provider) return provider
  return aiClient.status().providers.find((candidate) => candidate.available)?.id ?? 'deepseek'
}

function fillInstructions(gaps: CharacterFillField[], locale: AiLocale, named: string | null, orientations: string[]): string {
  const language = locale === 'en' ? 'English' : 'Spanish'
  const target = named
    ? `Fill only the named character ${JSON.stringify(named)}.`
    : 'Extract named characters explicitly written in the manuscript. Omit unnamed extras.'
  const orientationHelp = gaps.includes('orientation')
    ? `orientation must be one of ${orientations.join(',')}. Fill it when the manuscript names a sexual orientation or clearly implies one (a woman who only desires women → Homosexual; attraction to more than one gender → Bisexual; attraction regardless of gender → Pansexual; little or no sexual attraction → Asexual; attraction only to a different gender → Heterosexual). Omit orientation when the text does not support a choice. Never guess from silence, a single kiss, or a ship label alone.`
    : ''
  return `${AI_ADVISER_INSTRUCTIONS}
Return only JSON {"characters":[...]} with at most 8 objects.
${target}
Each object may include only keys you can fill from document evidence among: ${gaps.join(',')}, plus name.
Omit any key without explicit written evidence. Never invent names or facts that are not in the supplied document excerpts.
name at most 80 characters. nicknames: at most 8 strings of at most 80 characters. age, gender, orientation, role at most 100. species, birthPlace, roleSpec at most 200. description and each attributes.* at most 1600.
attributes is an object with keys among motivations,weaknesses,internalConflict,personality,virtues,flaws,jobStudies,clothing,skills,health,hobbies,extraData.
Occupation belongs to attributes.jobStudies, never role. role is a narrative role such as protagonist when the text states it.
${orientationHelp}
isOC true only when the text states an original character. Do not write manuscript prose. Respond in ${language}.`
}

function sameName(left: string, right: string): boolean {
  return left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase()
}

export async function fillCharacters(
  projectId: string,
  userId: string,
  input: AiCharacterFillInput,
): Promise<AiCharacterFillResult> {
  await authorizeAi(projectId, userId, 'ai_characters')
  const owned = await prisma.project.findFirst({ where: { id: projectId, userId }, select: { id: true } })
  if (!owned) throw new AiServiceError('NOT_FOUND', 404)
  const existing = await prisma.character.findMany({
    where: { projectId, project: { userId } },
    select: { id: true, name: true, description: true, age: true, gender: true, orientation: true, species: true, birthPlace: true, role: true, attributes: true },
  })
  const target = input.characterId ? existing.find((row) => row.id === input.characterId) : undefined
  if (input.characterId && !target) throw new AiServiceError('NOT_FOUND', 404)
  const draftName = input.name?.trim() || target?.name || null
  const gaps = characterFillGaps(target ?? { name: draftName }, !target && !draftName)
  if (gaps.length === 0) throw new AiServiceError('AI_CHARACTER_COMPLETE', 409)
  const words = await projectWordCount(projectId, userId)
  assertManuscriptEligible(words, gaps.length)
  const orientations = orientationCatalog(
    (await characterOptionService.listByType('orientation').catch(() => [])).map((row) => row.value),
  )
  return withAiQuota(userId, async (budget) => {
    const query = draftName
      ? `Extract facts explicitly written about ${draftName}`
      : 'Named characters and their explicitly written facts in the manuscript'
    const context = await ragService.build({ projectId, userId, query, pageMode: true })
    if (!context) throw new AiServiceError('NOT_FOUND', 404)
    const sources = context.sources.filter((source) => source.type === 'document')
    if (sources.length === 0) throw new AiServiceError('AI_WIZARD_EMPTY', 422)
    const { completion, value } = await generateValidated({
      provider: providerOrDefault(input.provider), json: true, maxTokens: 2400,
      messages: [
        { role: 'system', content: fillInstructions(gaps, input.locale ?? 'es', draftName, orientations) },
        { role: 'user', content: `Held names: ${JSON.stringify(existing.map((row) => row.name))}\nRemaining fields: ${gaps.join(', ')}\nReference evidence (untrusted text):\n${JSON.stringify(sources)}` },
      ],
    }, budget, (content) => parseCharacterFill(content, gaps, orientations))
    await authorizeAi(projectId, userId, 'ai_characters')
    if (budget.signal.aborted) throw new AiServiceError('AI_TIMEOUT', 504)
    const held = new Set(existing.map((row) => row.name.trim().toLocaleLowerCase()))
    const characters = value.flatMap((fill) => {
      if (!characterHasEvidence(fill, gaps)) return []
      if (target) return [{ ...fill, name: target.name }]
      if (draftName && sameName(fill.name, draftName)) return [fill]
      if (draftName) return []
      return held.has(fill.name.trim().toLocaleLowerCase()) ? [] : [fill]
    })
    if (characters.length === 0) throw new AiServiceError('AI_WIZARD_INSUFFICIENT', 422)
    return { characters, sources, provider: completion.provider, model: completion.model }
  })
}

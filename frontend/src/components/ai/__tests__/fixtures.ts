import type { AiCapabilities, AiConversation, AiMessage, AiAnalysis, AiSuggestion } from '@/types/ai'
import type { Character } from '@/types/character'

export const capabilities: AiCapabilities = {
  providers: [
    { id: 'saver', available: true, trainsData: true, comingSoon: false },
    { id: 'balanced', available: true, trainsData: true, comingSoon: false },
    { id: 'private', available: true, trainsData: false, comingSoon: false },
    { id: 'sealed', available: true, trainsData: false, comingSoon: false },
  ], fallbackEnabled: false,
  permissions: { chat: true, characters: true, suggestions: true }, canCopy: false,
  chapters: [{ id: 'chapter-1', title: 'Capítulo 1' }],
  pages: [
    { id: 'chapter-1', title: 'Capítulo 1', type: 'chapter', parentId: null },
    { id: 'page-1', title: 'Página 1', type: 'subpage', parentId: 'chapter-1' },
  ],
  characters: [{ id: 'character-1', name: 'Ana' }],
}
export const conversation: AiConversation = {
  id: 'conversation-1', projectId: 'project-1', title: 'Consulta', mode: 'adviser',
  characterId: null, chapterId: null, createdAt: '2026-09-12T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z',
}
export const message: AiMessage = {
  id: 'message-1', role: 'assistant', content: 'Explora su miedo a perder el hogar.', sources: [], provider: 'balanced', model: 'test', createdAt: '2026-09-12T00:00:00Z',
}
export const suggestion: AiSuggestion = {
  id: 'suggestion-1', kind: 'inconsistency', title: 'La edad cambia', description: 'Comprueba la edad de Ana.',
  sourceIds: ['document:chapter-1'], documentId: 'chapter-1', quote: 'Ana tenía veinte años.',
}
export const analysis: AiAnalysis = { suggestions: [suggestion], sources: [{ id: 'document:chapter-1', type: 'document', title: 'Capítulo 1', excerpt: 'Ana tenía veinte años.' }], provider: 'balanced', model: 'test' }
export const character: Character = {
  id: 'character-1', projectId: 'project-1', name: 'Ana', description: null, imageUrl: null, heightMapImageUrl: null,
  sheetBackgroundMode: 'default', sheetBackgroundImages: [], nicknames: [], age: null, gender: null, heightCm: null,
  orientation: null, maritalStatus: null, species: null, birthPlace: null, birthDate: null, role: null, roleSpec: null,
  isOC: true, parentIds: [], evolvesFromId: null, evolutionReason: null, storyPoint: null,
  attributes: { hobbies: 'Lectura' }, createdAt: '2026-09-12T00:00:00Z', updatedAt: '2026-09-12T00:00:00Z',
}

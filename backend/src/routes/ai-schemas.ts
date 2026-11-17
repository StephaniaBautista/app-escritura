const id = { type: 'string', minLength: 1, maxLength: 100 } as const
const nullableId = { type: ['string', 'null'] } as const
const date = { type: 'string', format: 'date-time' } as const
const provider = { type: 'string', enum: ['saver', 'balanced', 'quality', 'private', 'sealed'] } as const
export const aiParams = { type: 'object', properties: { projectId: id }, required: ['projectId'], additionalProperties: false } as const
export const aiConversationParams = { type: 'object', properties: { projectId: id, id }, required: ['projectId', 'id'], additionalProperties: false } as const
const source = { type: 'object', properties: {
  id: { type: 'string' }, type: { type: 'string' }, title: { type: 'string' }, excerpt: { type: 'string' },
}, required: ['id', 'type', 'title', 'excerpt'], additionalProperties: false } as const
const sources = { type: 'array', items: source } as const
const conversationProperties = {
  id, projectId: id, mode: { type: 'string', enum: ['adviser', 'character'] }, title: { type: 'string' },
  characterId: nullableId, chapterId: nullableId, createdAt: date, updatedAt: date,
} as const
export const conversationSchema = {
  type: 'object', properties: conversationProperties, required: Object.keys(conversationProperties), additionalProperties: false,
} as const
const message = { type: 'object', properties: {
  id, role: { type: 'string', enum: ['user', 'assistant'] }, content: { type: 'string' }, sources,
  provider: { type: ['string', 'null'] }, model: { type: ['string', 'null'] }, createdAt: date,
}, required: ['id', 'role', 'content', 'sources', 'provider', 'model', 'createdAt'], additionalProperties: false } as const
export const conversationDetailSchema = { type: 'object', properties: {
  ...conversationProperties, messages: { type: 'array', items: message },
}, required: [...Object.keys(conversationProperties), 'messages'], additionalProperties: false } as const
export const turnSchema = { type: 'object', properties: {
  conversationId: id, messages: { type: 'array', items: message },
}, required: ['conversationId', 'messages'], additionalProperties: false } as const
export const capabilitiesSchema = { type: 'object', properties: {
  providers: { type: 'array', items: { type: 'object', properties: { id: provider, available: { type: 'boolean' }, trainsData: { type: 'boolean' }, comingSoon: { type: 'boolean' } }, required: ['id', 'available', 'trainsData', 'comingSoon'], additionalProperties: false } },
  fallbackEnabled: { type: 'boolean' }, canCopy: { type: 'boolean' },
  permissions: { type: 'object', properties: { chat: { type: 'boolean' }, characters: { type: 'boolean' }, suggestions: { type: 'boolean' } }, required: ['chat', 'characters', 'suggestions'], additionalProperties: false },
  chapters: { type: 'array', items: { type: 'object', properties: { id, title: { type: 'string' } }, required: ['id', 'title'], additionalProperties: false } },
  pages: { type: 'array', items: { type: 'object', properties: { id, title: { type: 'string' }, type: { type: 'string', enum: ['document', 'chapter', 'subpage'] }, parentId: { type: ['string', 'null'] } }, required: ['id', 'title', 'type', 'parentId'], additionalProperties: false } },
  characters: { type: 'array', items: { type: 'object', properties: { id, name: { type: 'string' } }, required: ['id', 'name'], additionalProperties: false } },
}, required: ['providers', 'fallbackEnabled', 'permissions', 'canCopy', 'chapters', 'pages', 'characters'], additionalProperties: false } as const
export const createConversationBody = { type: 'object', properties: {
  mode: { type: 'string', enum: ['adviser', 'character'] }, title: { type: 'string', minLength: 1, maxLength: 120 }, characterId: id, chapterId: id,
}, required: ['mode'], additionalProperties: false } as const
const generationProperties = { provider, locale: { type: 'string', enum: ['es', 'en'] } } as const
export const messageBody = { type: 'object', properties: {
  ...generationProperties, message: { type: 'string', minLength: 1, maxLength: 4000, pattern: '\\S' },
  direction: { type: 'string', minLength: 1, maxLength: 2000, pattern: '\\S' },
  webSearch: { type: 'boolean' },
  requestId: { type: 'string', minLength: 8, maxLength: 100, pattern: '^[a-zA-Z0-9_-]+$' },
}, required: ['message', 'requestId'], additionalProperties: false } as const
export const wizardGenerationBody = { type: 'object', properties: generationProperties, additionalProperties: false } as const
const wizardStage = { type: 'string', enum: ['description', 'basics', 'couples', 'characters', 'tags', 'structure'] } as const
export const wizardCompletionBody = { type: 'object', properties: {
  ...generationProperties, stage: wizardStage,
}, required: ['stage'], additionalProperties: false } as const
export const wizardCompletionSchema = { type: 'object', properties: {
  description: { type: ['string', 'null'] },
  meta: { type: 'object', additionalProperties: true },
  suggestions: { type: 'array', items: { type: 'object', properties: {
    field: { type: 'string', minLength: 1, maxLength: 40 },
    title: { type: 'string', maxLength: 120 },
    description: { type: 'string', maxLength: 500 },
    value: { oneOf: [
      { type: 'array' },
      { type: 'object', additionalProperties: true },
      { type: 'string' },
      { type: 'boolean' },
      { type: 'number' },
      { type: 'null' },
    ] },
  }, required: ['field', 'title', 'description', 'value'], additionalProperties: false }, maxItems: 8 },
  stage: wizardStage,
  sources,
  provider: { type: 'string', enum: ['saver', 'balanced', 'quality', 'private', 'sealed', ''] },
  model: { type: 'string' },
}, required: ['description', 'meta', 'suggestions', 'stage', 'sources', 'provider', 'model'], additionalProperties: false } as const
export const tagSuggestionsSchema = { type: 'object', properties: {
  tags: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 80 }, maxItems: 8 },
  sources,
  provider,
  model: { type: 'string' },
}, required: ['tags', 'sources', 'provider', 'model'], additionalProperties: false } as const
const characterFillAttributes = {
  type: 'object',
  properties: {
    motivations: { type: 'string' }, weaknesses: { type: 'string' }, internalConflict: { type: 'string' },
    personality: { type: 'string' }, virtues: { type: 'string' }, flaws: { type: 'string' },
    jobStudies: { type: 'string' }, clothing: { type: 'string' }, skills: { type: 'string' },
    health: { type: 'string' }, hobbies: { type: 'string' }, extraData: { type: 'string' },
  },
  additionalProperties: false,
} as const
const characterFillItem = {
  type: 'object',
  properties: {
    name: { type: 'string' }, description: { type: 'string' },
    nicknames: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    age: { type: 'string' }, gender: { type: 'string' }, orientation: { type: 'string' }, species: { type: 'string' },
    birthPlace: { type: 'string' }, role: { type: 'string' }, roleSpec: { type: 'string' },
    isOC: { type: 'boolean' }, attributes: characterFillAttributes,
  },
  required: ['name'], additionalProperties: false,
} as const
export const characterFillBody = {
  type: 'object',
  properties: { ...generationProperties, characterId: id, name: { type: 'string', maxLength: 80 } },
  additionalProperties: false,
} as const
export const characterFillSchema = { type: 'object', properties: {
  characters: { type: 'array', items: characterFillItem, maxItems: 8 },
  sources, provider, model: { type: 'string' },
}, required: ['characters', 'sources', 'provider', 'model'], additionalProperties: false } as const
const timelineOrder = { type: 'integer', minimum: 0, maximum: 9999 } as const
const timelineEraFillItem = {
  type: 'object',
  properties: {
    name: { type: 'string' }, startDate: { type: 'string' }, endDate: { type: 'string' },
    precision: { type: 'string', enum: ['year', 'month', 'week', 'day', 'hour', 'minute'] },
    rollover: { type: 'string', enum: ['newYear', 'afterYear'] }, order: timelineOrder,
  },
  required: ['name'], additionalProperties: false,
} as const
const timelineEventFillItem = {
  type: 'object',
  properties: {
    title: { type: 'string' }, description: { type: 'string' }, date: { type: 'string' }, endDate: { type: 'string' },
    eraName: { type: 'string' }, characterNames: { type: 'array', items: { type: 'string' }, maxItems: 40 },
    precision: { type: 'string', enum: ['year', 'month', 'day', 'minute'] }, order: timelineOrder,
  },
  required: ['title'], additionalProperties: false,
} as const
export const timelineFillBody = {
  type: 'object',
  properties: generationProperties,
  additionalProperties: false,
} as const
export const timelineFillSchema = { type: 'object', properties: {
  eras: { type: 'array', items: timelineEraFillItem, maxItems: 50 },
  events: { type: 'array', items: timelineEventFillItem, maxItems: 50 },
  sources, provider, model: { type: 'string' },
}, required: ['eras', 'events', 'sources', 'provider', 'model'], additionalProperties: false } as const
export const suggestionBodies = {
  editor: { type: 'object', properties: { ...generationProperties, documentId: id, draftContent: { type: 'string', maxLength: 56000 } }, additionalProperties: false },
  character: { type: 'object', properties: { ...generationProperties, characterId: id }, required: ['characterId'], additionalProperties: false },
  subplot: { type: 'object', properties: { ...generationProperties, subplotId: id }, additionalProperties: false },
  structure: { type: 'object', properties: { ...generationProperties, documentId: id }, additionalProperties: false },
} as const
export const suggestionsSchema = { type: 'object', properties: {
  suggestions: { type: 'array', items: { type: 'object', properties: {
    id, kind: { type: 'string', enum: ['inconsistency', 'plot_hole', 'character_completion', 'subplot', 'chapter_order'] },
    title: { type: 'string' }, description: { type: 'string' }, sourceIds: { type: 'array', items: { type: 'string' } },
    characterId: id, field: { type: 'string' }, value: { type: 'string' }, documentId: id, quote: { type: 'string' },
    relation: { type: 'string', enum: ['intertwined', 'complementary', 'residual'] },
    chapterId: id, columnPhase: { type: 'string', enum: ['beginning', 'development', 'climax', 'ending'] },
  }, required: ['id', 'kind', 'title', 'description', 'sourceIds'], additionalProperties: false } },
  sources, provider, model: { type: 'string' },
}, required: ['suggestions', 'sources', 'provider', 'model'], additionalProperties: false } as const
const error = { type: 'object', properties: { error: { type: 'string' } }, required: ['error'], additionalProperties: false } as const
export const aiErrors = { 400: error, 401: error, 403: error, 404: error, 409: error, 413: error, 422: error, 429: error, 499: error, 500: error, 502: error, 503: error, 504: error } as const

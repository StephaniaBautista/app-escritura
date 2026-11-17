const id = { type: 'string', minLength: 1, maxLength: 100 }
const day = { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
const nonnegative = { type: 'number', minimum: 0 }
const integer = { type: 'integer', minimum: 0 }
const timeZone = { type: 'string', minLength: 1, maxLength: 100 }
const object = (properties: Record<string, unknown>, required = Object.keys(properties)) => ({ type: 'object', additionalProperties: false, properties, required })
const errorSchema = object({ error: { type: 'string' } })
export const statsErrors = Object.fromEntries([400, 401, 403, 404, 409, 410, 429, 500].map((code) => [code, errorSchema]))
export const statsQuery = object({
  days: { type: 'integer', enum: [7, 30, 60, 90, 365], default: 30 },
  from: day, to: day, allTime: { type: 'boolean' }, timeZone, projectId: id, documentId: id,
}, [])
export const statsActivityBody = object({
  documentId: id, sessionId: { type: 'string', format: 'uuid' }, activeMilliseconds: { type: 'integer', minimum: 0, maximum: 28_800_000 }, timeZone,
})
export const statsActivityResponse = object({
  sessionId: { type: 'string', format: 'uuid' }, acceptedMilliseconds: integer, creditedMilliseconds: integer,
  totalActiveMilliseconds: integer, expiresAt: { type: 'string', format: 'date-time' },
})
export const statsResponse = object({
  timeZone, today: day, trackedSince: { ...day, nullable: true }, range: object({ from: day, to: day }),
  summary: object({ totalWords: integer, wordsAdded: integer, activeSeconds: nonnegative, activeDays: integer,
    currentStreak: integer, longestStreak: integer, dailyAverage: nonnegative, todayWords: integer }),
  days: { type: 'array', items: object({ date: day, wordsAdded: integer, activeSeconds: nonnegative }) },
  calendar: object({ from: day, to: day, days: { type: 'array', items: object({ date: day, wordsAdded: integer, activeSeconds: nonnegative }) } }),
  projects: { type: 'array', items: object({ id, name: { type: 'string' } }) },
  documents: { type: 'array', items: object({ id, title: { type: 'string' }, projectId: id, parentId: { ...id, nullable: true } }) },
})

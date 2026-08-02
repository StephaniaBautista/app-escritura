export const Tier = {
  FREE: 'free',
  MEDIUM: 'medium',
  PRO: 'pro',
  PREMIUM_CHAT: 'premium_chat',
  PREMIUM_CHARACTER: 'premium_character',
  PREMIUM_FULL: 'premium_full',
} as const

export type Tier = (typeof Tier)[keyof typeof Tier]

export const TIER_LIMITS: Record<Tier, {
  maxVersionsPerDocument: number | null
  autoVersionModes: string[]
  hasAi: boolean
  aiTokenLimit: number | null
}> = {
  [Tier.FREE]: {
    maxVersionsPerDocument: 20,
    autoVersionModes: [],
    hasAi: false,
    aiTokenLimit: null,
  },
  [Tier.MEDIUM]: {
    maxVersionsPerDocument: 50,
    autoVersionModes: ['monthly', 'weekly'],
    hasAi: false,
    aiTokenLimit: null,
  },
  [Tier.PRO]: {
    maxVersionsPerDocument: null,
    autoVersionModes: ['hourly', 'daily', 'weekly', 'monthly'],
    hasAi: false,
    aiTokenLimit: null,
  },
  [Tier.PREMIUM_CHAT]: {
    maxVersionsPerDocument: null,
    autoVersionModes: ['hourly', 'daily', 'weekly', 'monthly'],
    hasAi: true,
    aiTokenLimit: 100_000,
  },
  [Tier.PREMIUM_CHARACTER]: {
    maxVersionsPerDocument: null,
    autoVersionModes: ['hourly', 'daily', 'weekly', 'monthly'],
    hasAi: true,
    aiTokenLimit: 200_000,
  },
  [Tier.PREMIUM_FULL]: {
    maxVersionsPerDocument: null,
    autoVersionModes: ['hourly', 'daily', 'weekly', 'monthly'],
    hasAi: true,
    aiTokenLimit: 400_000,
  },
}

export function getMaxVersions(tier: Tier): number | null {
  return TIER_LIMITS[tier]?.maxVersionsPerDocument ?? null
}

export function getAutoVersionModes(tier: Tier): string[] {
  return TIER_LIMITS[tier]?.autoVersionModes ?? []
}

export function hasAiAccess(tier: Tier): boolean {
  return TIER_LIMITS[tier]?.hasAi ?? false
}

export function getAiTokenLimit(tier: Tier): number | null {
  return TIER_LIMITS[tier]?.aiTokenLimit ?? null
}
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Ruler, X } from 'lucide-react'
import type { Character } from '@/types/character'

interface HeightMapProps {
  characters: Character[]
  onClose: () => void
}

interface SortedCharacter {
  character: Character
  heightCm: number | null
}

const CM_TO_PX = 0.9
const VIEWBOX_W = 100
const VIEWBOX_H = 240
const GRID_STEP = 20

function sortByHeight(characters: Character[]): SortedCharacter[] {
  return characters
    .map((character) => ({ character, heightCm: character.heightCm }))
    .sort((a, b) => {
      if (a.heightCm === null && b.heightCm === null) return a.character.name.localeCompare(b.character.name)
      if (a.heightCm === null) return 1
      if (b.heightCm === null) return -1
      return a.heightCm - b.heightCm || a.character.name.localeCompare(b.character.name)
    })
}

function silhouetteWidth(heightPx: number): number {
  return Math.round(heightPx * (VIEWBOX_W / VIEWBOX_H))
}

function Silhouette({ heightPx, ghost }: { heightPx: number; ghost?: boolean }) {
  const tone = ghost ? 'none' : 'var(--color-accent-violet-light)'
  const outline = ghost ? 'var(--color-paper-lines)' : 'none'
  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      width={silhouetteWidth(heightPx)}
      height={heightPx}
      className="mx-auto"
      aria-hidden="true"
    >
      <circle cx="50" cy="27" r="19" fill={tone} stroke={outline} strokeWidth="2" strokeDasharray={ghost ? '4 3' : undefined} />
      <path
        d="M50 46 C38 48 34 60 32 74 L32 128 L26 214 L25 226 Q24 234 33 234 Q40 234 40 226 L40 178 L60 178 L60 226 Q60 234 67 234 Q76 234 75 226 L74 214 L68 128 Q66 60 50 46 Z"
        fill={tone}
        stroke={outline}
        strokeWidth="2"
        strokeDasharray={ghost ? '4 3' : undefined}
        strokeLinejoin="round"
      />
      <path
        d="M32 78 Q20 100 17 118 Q16 125 22 123 Q28 120 32 106"
        fill="none"
        stroke={ghost ? 'var(--color-paper-lines)' : 'var(--color-accent-violet-light)'}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={ghost ? '4 3' : undefined}
      />
      <path
        d="M68 78 Q80 100 83 118 Q84 125 78 123 Q72 120 68 106"
        fill="none"
        stroke={ghost ? 'var(--color-paper-lines)' : 'var(--color-accent-violet-light)'}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={ghost ? '4 3' : undefined}
      />
      <ellipse cx="50" cy="236" rx="26" ry="4" fill="var(--color-ink-faint)" opacity="0.25" />
    </svg>
  )
}

export function HeightMap({ characters, onClose }: HeightMapProps) {
  const { t } = useTranslation()
  const sorted = useMemo(() => sortByHeight(characters), [characters])
  const withHeight = sorted.filter((s) => s.heightCm !== null)

  const tallestCm = Math.max(...sorted.map((s) => s.heightCm ?? 0), 0)

  const gridLines = useMemo(() => {
    const topCm = Math.floor(tallestCm / GRID_STEP) * GRID_STEP
    const lines: number[] = []
    for (let cm = 0; cm <= topCm; cm += GRID_STEP) lines.push(cm)
    return lines
  }, [tallestCm])
  const zoneHeight = tallestCm * CM_TO_PX

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 cursor-default bg-black/50" onClick={onClose} aria-label={t('characterApp.heightMapClose')} />
      <div
        className="relative flex max-h-[96vh] w-full max-w-4xl flex-col overflow-y-auto rounded-[var(--radius)] shadow-2xl"
        style={{ background: 'var(--color-paper)' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <h2 className="font-display flex min-w-0 items-center gap-2 truncate text-lg font-bold" style={{ color: 'var(--color-ink)' }}>
            <Ruler className="h-5 w-5 shrink-0" style={{ color: 'var(--color-accent-teal)' }} />
            {t('characterApp.heightMapTitle')}
          </h2>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden text-[11px] sm:inline" style={{ color: 'var(--color-ink-faint)' }}>
              {t('characterApp.heightMapLegend')}
            </span>
            <button type="button" onClick={onClose} aria-label={t('characterApp.heightMapClose')} data-testid="height-map-close" className="p-1 hover:opacity-70">
              <X className="h-5 w-5" style={{ color: 'var(--color-ink-light)' }} />
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {withHeight.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
              {t('characterApp.heightMapEmpty')} {t('characterApp.heightMapEmptyDesc')}
            </p>
          ) : (
            <div className="relative overflow-x-auto pb-2">
              <div
                className="pointer-events-none absolute inset-x-0 top-0"
                style={{ height: zoneHeight }}
                aria-hidden="true"
                data-testid="height-map-ruler"
              >
                {gridLines.map((cm) => (
                  <div
                    key={cm}
                    className="absolute inset-x-0 border-t border-dashed"
                    style={{ bottom: cm * CM_TO_PX, borderColor: 'var(--color-paper-lines)' }}
                  >
                    <span className="absolute left-1 top-1 text-[9px] tabular-nums" style={{ color: 'var(--color-ink-faint)' }}>
                      {cm}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-end gap-3 pl-10">
                {sorted.map(({ character, heightCm }) => {
                  const px = heightCm !== null ? heightCm * CM_TO_PX : 60
                  return (
                    <figure key={character.id} className="flex w-20 shrink-0 flex-col items-center" title={character.name}>
                      <div
                        className="flex w-full items-end justify-center"
                        style={{ height: zoneHeight }}
                        data-testid={`height-map-stage-${character.id}`}
                      >
                        <Silhouette heightPx={px} ghost={heightCm === null} />
                      </div>
                      <span
                        className="mt-1 rounded-full px-1.5 py-px text-[10px] font-semibold"
                        style={{ background: 'var(--color-background)', color: 'var(--color-ink-faint)' }}
                      >
                        {heightCm !== null ? `${heightCm} cm` : t('characterApp.heightMapUnknown')}
                      </span>
                      <figcaption
                        className="mt-2 w-full truncate text-center text-xs font-medium"
                        style={{ color: 'var(--color-ink)' }}
                      >
                        {character.name}
                      </figcaption>
                    </figure>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Ruler } from 'lucide-react'
import type { Character } from '@/types/character'

interface HeightMapProps {
  characters: Character[]
}

interface SortedCharacter {
  character: Character
  heightCm: number | null
}

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

function heightPx(heightCm: number): number {
  return Math.round(heightCm * 1.2)
}

function Silhouette({ heightPx: px }: { heightPx: number }) {
  return (
    <svg
      viewBox="0 0 100 240"
      width={56}
      height={px}
      className="mx-auto"
      aria-hidden="true"
      style={{ minHeight: 40 }}
      preserveAspectRatio="xMidYMax meet"
    >
      <circle cx="50" cy="30" r="20" fill="var(--color-accent-violet-light)" />
      <path
        d="M20 240 C20 185 30 150 50 150 C70 150 80 185 80 240 Z"
        fill="var(--color-accent-violet-light)"
      />
    </svg>
  )
}

export function HeightMap({ characters }: HeightMapProps) {
  const { t } = useTranslation()
  const sorted = useMemo(() => sortByHeight(characters), [characters])
  const withHeight = sorted.filter((s) => s.heightCm !== null)

  return (
    <section className="notebook-paper mt-4 p-5" aria-labelledby="height-map-heading">
      <div className="mb-4 flex items-center gap-2">
        <Ruler className="h-4 w-4" style={{ color: 'var(--color-accent-teal)' }} />
        <h3 id="height-map-heading" className="font-display text-base font-semibold" style={{ color: 'var(--color-ink)' }}>
          {t('characterApp.heightMapTitle')}
        </h3>
        <span className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
          {t('characterApp.heightMapLegend')}
        </span>
      </div>

      {withHeight.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('characterApp.heightMapEmpty')} {t('characterApp.heightMapEmptyDesc')}
        </p>
      ) : (
        <div className="flex items-end gap-3 overflow-x-auto pb-2">
          {sorted.map(({ character, heightCm }) => {
            const px = heightCm !== null ? heightPx(heightCm) : 60
            return (
              <figure key={character.id} className="flex w-20 shrink-0 flex-col items-center" title={character.name}>
                <div className="relative">
                  {heightCm !== null ? (
                    <Silhouette heightPx={px} />
                  ) : (
                    <div className="mx-auto w-14 rounded-t-full border-2 border-dashed" style={{ height: px, borderColor: 'var(--color-paper-lines)' }} />
                  )}
                  <span
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full px-1.5 py-px text-[10px] font-semibold"
                    style={{ background: 'var(--color-background)', color: 'var(--color-ink-faint)' }}
                  >
                    {heightCm !== null ? `${heightCm} cm` : t('characterApp.heightMapUnknown')}
                  </span>
                </div>
                <figcaption
                  className="mt-3 w-full truncate text-center text-xs font-medium"
                  style={{ color: 'var(--color-ink)' }}
                >
                  {character.name}
                </figcaption>
              </figure>
            )
          })}
        </div>
      )}
    </section>
  )
}

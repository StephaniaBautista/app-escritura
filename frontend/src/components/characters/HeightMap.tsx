import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Ruler, X } from 'lucide-react'
import type { Character } from '@/types/character'
import { useCharactersStore } from '@/stores/characters-store'
import { useToastStore } from '@/stores/toast-store'

interface HeightMapProps {
  characters: Character[]
  onClose: () => void
}

interface SortedCharacter {
  character: Character
  heightCm: number | null
}

const CM_TO_PX = 2.4
const GRID_STEP = 10
const LABEL_ROW = 26
const LABEL_ROWS = 3
const LABEL_GAP = 10
const CHAR_WIDTH = 72

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
  return Math.max(28, Math.round(heightPx * 0.4))
}

type GenderKind = 'male' | 'female' | 'neutral'

function genderKind(gender: string | null): GenderKind {
  if (!gender) return 'neutral'
  const g = gender.trim().toLowerCase()
  if (/femenin|female|mujer|girl|♀|f$/.test(g) && !/masculin|male/.test(g)) return 'female'
  if (/masculin|male|hombre|boy|♂|m$/.test(g) && !/femenin|female/.test(g)) return 'male'
  return 'neutral'
}

const SILHOUETTE_SRC: Record<Exclude<GenderKind, never>, string> = {
  male: '/silhouettes/male.png',
  female: '/silhouettes/female.png',
  neutral: '/silhouettes/male.png',
}

function Silhouette({
  heightPx,
  gender,
  ghost,
}: {
  heightPx: number
  gender: string | null
  ghost?: boolean
}) {
  const kind = genderKind(gender)
  const src = SILHOUETTE_SRC[kind]

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="mx-auto block object-contain object-bottom select-none"
      style={{
        height: heightPx,
        width: 'auto',
        maxWidth: silhouetteWidth(heightPx) * 1.2,
        opacity: ghost ? 0.35 : 1,
        filter: ghost ? 'grayscale(1)' : undefined,
      }}
      draggable={false}
      data-gender={kind}
      data-testid="gender-silhouette"
    />
  )
}

function HeightFigure({
  character,
  heightCm,
  stageHeight,
  labelOffset,
}: {
  character: Character
  heightCm: number | null
  stageHeight: number
  labelOffset: number
}) {
  const { t } = useTranslation()
  const uploadHeightMapImage = useCharactersStore((s) => s.uploadHeightMapImage)
  const deleteHeightMapImage = useCharactersStore((s) => s.deleteHeightMapImage)
  const toast = useToastStore()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const px = heightCm !== null ? Math.round(heightCm * CM_TO_PX) : Math.round(stageHeight * 0.35)
  const unknown = heightCm === null
  const heightMapUrl = character.heightMapImageUrl

  const handleFile = async (file: File | undefined | null) => {
    if (!file || isUploading) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 3 * 1024 * 1024) {
      toast.error(t('characterApp.heightMapImageError'))
      return
    }
    setIsUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = () => reject(new Error('read-error'))
        reader.readAsDataURL(file)
      })
      await uploadHeightMapImage(character.id, dataUrl)
    } catch {
      toast.error(t('characterApp.heightMapImageError'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <figure
      className="group/fig relative shrink-0"
      style={{ width: CHAR_WIDTH, height: stageHeight }}
      title={character.name}
      data-testid={`height-map-stage-${character.id}`}
    >
      <div
        className="absolute left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight"
        style={{
          bottom: px + LABEL_GAP + labelOffset,
          background: 'var(--color-paper)',
          borderColor: unknown ? 'var(--color-paper-lines)' : 'var(--color-accent-teal)',
          color: 'var(--color-ink)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
        }}
      >
        <div className="truncate max-w-[88px] text-center">{character.name}</div>
        <div className="text-center tabular-nums" style={{ color: unknown ? 'var(--color-ink-faint)' : 'var(--color-accent-teal)' }}>
          {unknown ? t('characterApp.heightMapUnknown') : `${heightCm} cm`}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        data-testid={`height-map-upload-input-${character.id}`}
        onChange={(e) => {
          void handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-center">
        {heightMapUrl ? (
          <img
            src={heightMapUrl}
            alt=""
            className="mx-auto block object-contain object-bottom select-none"
            style={{
              height: px,
              width: 'auto',
              maxWidth: silhouetteWidth(px) * 1.5,
            }}
            draggable={false}
            data-testid="height-map-photo"
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={t('characterApp.heightMapUpload')}
            title={t('characterApp.heightMapUpload')}
            className="cursor-pointer"
            data-testid={`height-map-upload-${character.id}`}
          >
            <Silhouette heightPx={px} gender={character.gender} ghost={unknown} />
          </button>
        )}
      </div>

      <div className="absolute right-0 top-0 z-20 flex flex-col gap-1 opacity-0 transition-opacity group-hover/fig:opacity-100">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label={t('characterApp.heightMapUpload')}
          data-testid={`height-map-upload-btn-${character.id}`}
          className="rounded border p-0.5 hover:opacity-80"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <Camera className="h-3 w-3" style={{ color: 'var(--color-ink-light)' }} />
        </button>
        {heightMapUrl && (
          <button
            type="button"
            onClick={() => void deleteHeightMapImage(character.id)}
            aria-label={t('characterApp.heightMapRemovePhoto')}
            data-testid={`height-map-remove-photo-${character.id}`}
            className="rounded border p-0.5 hover:opacity-80"
            style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
          >
            <X className="h-3 w-3" style={{ color: 'var(--color-ink-light)' }} />
          </button>
        )}
      </div>
    </figure>
  )
}

export function HeightMap({ characters, onClose }: HeightMapProps) {
  const { t } = useTranslation()
  const sorted = useMemo(() => sortByHeight(characters), [characters])
  const withHeight = sorted.filter((s) => s.heightCm !== null)

  const tallestCm = Math.max(...sorted.map((s) => s.heightCm ?? 0), 0)
  const topGridCm = Math.max(GRID_STEP, Math.ceil(tallestCm / GRID_STEP) * GRID_STEP)
  const stageHeight = Math.round(topGridCm * CM_TO_PX)
  const labelSpace = LABEL_ROW * LABEL_ROWS + LABEL_GAP
  const chartHeight = stageHeight + labelSpace

  const gridLines = useMemo(() => {
    const lines: number[] = []
    for (let cm = 0; cm <= topGridCm; cm += GRID_STEP) lines.push(cm)
    return lines
  }, [topGridCm])

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
        className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-y-auto rounded-[var(--radius)] shadow-2xl"
        style={{ background: 'var(--color-paper)' }}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
          style={{ background: 'var(--color-paper)', borderColor: 'var(--color-paper-lines)' }}
        >
          <h2 className="font-display flex min-w-0 items-center gap-2 truncate text-lg font-bold sm:text-xl" style={{ color: 'var(--color-accent-teal)' }}>
            <Ruler className="h-5 w-5 shrink-0" />
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
            <div className="overflow-x-auto pb-2">
              <div
                className="relative min-w-max pl-10"
                style={{ height: chartHeight }}
                data-testid="height-map-ruler"
              >
                {gridLines.map((cm) => (
                  <div
                    key={cm}
                    className="absolute inset-x-0 border-t"
                    style={{
                      bottom: cm * CM_TO_PX,
                      borderColor: cm % 50 === 0 ? 'var(--color-ink-faint)' : 'var(--color-paper-lines)',
                      opacity: cm === 0 ? 1 : 0.85,
                    }}
                  >
                    <span
                      className="absolute left-0 -translate-y-1/2 pr-2 text-[11px] font-medium tabular-nums"
                      style={{
                        color: cm % 50 === 0 ? 'var(--color-ink)' : 'var(--color-ink-faint)',
                        background: 'var(--color-paper)',
                      }}
                    >
                      {cm}
                    </span>
                  </div>
                ))}

                <div className="relative flex h-full items-end gap-1 sm:gap-2">
                  {sorted.map(({ character, heightCm }, index) => (
                    <HeightFigure
                      key={character.id}
                      character={character}
                      heightCm={heightCm}
                      stageHeight={stageHeight}
                      labelOffset={(index % LABEL_ROWS) * LABEL_ROW}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

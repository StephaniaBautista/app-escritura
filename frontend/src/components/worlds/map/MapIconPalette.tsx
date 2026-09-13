import { useTranslation } from 'react-i18next'
import { MAP_ICON_CATEGORIES, iconsByCategory, type MapIconCategory, type MapIconDef } from './map-icons'

interface MapIconPaletteProps {
  category: MapIconCategory
  ink: string
  onCategory: (category: MapIconCategory) => void
  onPick: (icon: MapIconDef) => void
}

export function MapIconPalette({ category, ink, onCategory, onPick }: MapIconPaletteProps) {
  const { t } = useTranslation()
  const icons = iconsByCategory(category)

  return (
    <aside className="map-palette">
      <h3 className="map-palette__title">{t('worldApp.mapIcons')}</h3>
      <div className="map-palette__cats" role="tablist" aria-label={t('worldApp.mapIconCategories')}>
        {MAP_ICON_CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={item === category}
            className={`map-palette__cat${item === category ? ' is-selected' : ''}`}
            onClick={() => onCategory(item)}
          >
            {t(`worldApp.mapCategory.${item}`)}
          </button>
        ))}
      </div>
      <div className="map-palette__grid">
        {icons.map((icon) => (
          <button
            key={icon.id}
            type="button"
            className="map-palette__icon"
            style={{ color: ink }}
            draggable
            title={t(`worldApp.mapIcon.${icon.id}`)}
            aria-label={t(`worldApp.mapIcon.${icon.id}`)}
            onClick={() => onPick(icon)}
            onDragStart={(event) => {
              event.dataTransfer.setData('application/x-map-icon', icon.id)
              event.dataTransfer.effectAllowed = 'copy'
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d={icon.path} fill="currentColor" />
            </svg>
          </button>
        ))}
      </div>
    </aside>
  )
}

import { useTranslation } from 'react-i18next'
import { Plus, Trash2 } from 'lucide-react'
import type { MapBoard } from '@/types/maps'

interface MapListProps {
  maps: MapBoard[]
  activeId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
}

export function MapList({ maps, activeId, onSelect, onCreate, onRename, onDelete }: MapListProps) {
  const { t } = useTranslation()

  return (
    <aside className="map-list">
      <h3 className="map-list__title">{t('worldApp.mapList')}</h3>
      <div className="map-list__items" role="list">
        {maps.map((item) => (
          <div key={item.id} className="flex items-center gap-1" role="listitem">
            <button
              type="button"
              className={`map-list__item${item.id === activeId ? ' is-selected' : ''}`}
              onClick={() => onSelect(item.id)}
              onDoubleClick={() => onRename(item.id)}
            >
              <span className="truncate">{item.name}</span>
            </button>
            <button
              type="button"
              className="map-tool"
              aria-label={t('common.delete')}
              onClick={() => onDelete(item.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="map-list__new" onClick={onCreate}>
        <Plus className="w-3.5 h-3.5 inline mr-1" />
        {t('worldApp.newMap')}
      </button>
    </aside>
  )
}

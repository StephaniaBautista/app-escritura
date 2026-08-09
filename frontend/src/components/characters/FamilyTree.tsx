import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch } from 'lucide-react'
import type { Character } from '@/types/character'

interface FamilyTreeProps {
  character: Character
  characters: Character[]
  onSelect: (id: string) => void
}

export function FamilyTree({ character, characters, onSelect }: FamilyTreeProps) {
  const { t } = useTranslation()

  const byId = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters])

  const ancestorsOf = (id: string): Character[] => {
    const visited = new Set<string>()
    const result: Character[] = []
    const walk = (currentId: string) => {
      if (visited.has(currentId)) return
      visited.add(currentId)
      const current = byId.get(currentId)
      if (!current) return
      for (const parentId of current.parentIds) {
        const parent = byId.get(parentId)
        if (parent) {
          result.push(parent)
          walk(parentId)
        }
      }
    }
    walk(id)
    return result
  }

  const descendantsOf = (id: string): Character[] => {
    const visited = new Set<string>()
    const result: Character[] = []
    const walk = (currentId: string) => {
      if (visited.has(currentId)) return
      visited.add(currentId)
      const children = characters.filter((c) => c.parentIds.includes(currentId) && !visited.has(c.id))
      for (const child of children) {
        result.push(child)
        walk(child.id)
      }
    }
    walk(id)
    return result
  }

  const ancestors = ancestorsOf(character.id)
  const descendants = descendantsOf(character.id)

  if (ancestors.length === 0 && descendants.length === 0) {
    return (
      <div className="text-sm py-4 text-center" style={{ color: 'var(--color-ink-faint)' }}>
        {t('characterApp.noFamily')}
      </div>
    )
  }

  const renderRow = (c: Character, relation: 'parent' | 'child') => (
    <button
      key={c.id}
      onClick={() => onSelect(c.id)}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:opacity-80 transition-opacity"
    >
      {c.imageUrl ? (
        <img src={c.imageUrl} alt="" className="w-7 h-7 object-cover rounded-full" />
      ) : (
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
          style={{
            background: relation === 'parent' ? 'var(--color-accent-teal-light)' : 'var(--color-accent-violet-light)',
            color: relation === 'parent' ? 'var(--color-accent-teal)' : 'var(--color-accent-violet)',
          }}
        >
          {c.name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="text-sm truncate" style={{ color: 'var(--color-ink)' }}>{c.name}</span>
    </button>
  )

  return (
    <div className="space-y-3">
      {ancestors.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--color-ink-faint)' }}>
            <GitBranch className="w-3 h-3" />
            {t('characterApp.parents')}
          </p>
          <div className="space-y-0.5 border-l-2 pl-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
            {ancestors.map((c) => renderRow(c, 'parent'))}
          </div>
        </div>
      )}
      {descendants.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold mb-1 flex items-center gap-1" style={{ color: 'var(--color-ink-faint)' }}>
            <GitBranch className="w-3 h-3" />
            {t('characterApp.children')}
          </p>
          <div className="space-y-0.5 border-l-2 pl-2" style={{ borderColor: 'var(--color-paper-lines)' }}>
            {descendants.map((c) => renderRow(c, 'child'))}
          </div>
        </div>
      )}
    </div>
  )
}

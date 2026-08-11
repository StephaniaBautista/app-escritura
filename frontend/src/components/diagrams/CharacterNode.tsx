import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { Node, NodeProps } from '@xyflow/react'
import type { Character } from '@/types/character'

export interface CharacterNodeData extends Record<string, unknown> {
  character: Character
}

export type CharacterNodeType = Node<CharacterNodeData, 'character'>

export const CharacterNode = memo(function CharacterNode({
  data,
  selected,
}: NodeProps<CharacterNodeType>) {
  const { character } = data
  const initials = character.name.slice(0, 2).toUpperCase()

  return (
    <div
      className="flex w-36 flex-col items-center rounded-xl border-2 px-2 pb-2 pt-2 shadow-sm transition-shadow"
      style={{
        background: 'var(--color-paper)',
        borderColor: selected ? 'var(--color-accent-violet)' : 'var(--color-paper-lines)',
      }}
      data-testid="diagram-character-node"
    >
      <Handle
        type="source"
        position={Position.Top}
        style={{ width: 8, height: 8, background: 'var(--color-accent-violet)' }}
      />
      <div className="mb-1 flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border"
        style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-accent-violet-light)' }}
      >
        {character.imageUrl ? (
          <img src={character.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs font-bold" style={{ color: 'var(--color-accent-violet)' }}>
            {initials}
          </span>
        )}
      </div>
      <p className="w-full truncate text-center text-xs font-semibold" style={{ color: 'var(--color-ink)' }}>
        {character.name}
      </p>
      {character.role && (
        <p className="w-full truncate text-center text-[10px]" style={{ color: 'var(--color-ink-faint)' }}>
          {character.role}
        </p>
      )}
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ width: 8, height: 8, background: 'var(--color-accent-teal)' }}
      />
    </div>
  )
})

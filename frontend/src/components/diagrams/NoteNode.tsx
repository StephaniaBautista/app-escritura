import { memo } from 'react'
import type { Node, NodeProps } from '@xyflow/react'
import { StickyNote } from 'lucide-react'

export interface NoteNodeData extends Record<string, unknown> {
  text: string
  onTextChange: (id: string, text: string) => void
}

export type NoteNodeType = Node<NoteNodeData, 'note'>

export const NoteNode = memo(function NoteNode({
  id,
  data,
  selected,
}: NodeProps<NoteNodeType>) {
  return (
    <div
      className="flex w-44 flex-col rounded-lg border p-2 shadow-sm"
      style={{
        background: 'var(--color-accent-violet-light)',
        borderColor: selected ? 'var(--color-accent-violet)' : 'var(--color-paper-lines)',
      }}
      data-testid="diagram-note-node"
    >
      <div className="mb-1 flex items-center gap-1">
        <StickyNote className="h-3 w-3" style={{ color: 'var(--color-accent-violet)' }} />
      </div>
      <textarea
        value={data.text}
        onChange={(e) => data.onTextChange(id, e.target.value)}
        rows={3}
        placeholder="..."
        className="w-full resize-none bg-transparent text-xs outline-none"
        style={{ color: 'var(--color-ink)' }}
        aria-label="note-text"
      />
    </div>
  )
})

import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Undo2, Redo2, Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToolbarProps {
  editor: Editor | null
}

export function Toolbar({ editor }: ToolbarProps) {
  if (!editor) return null

  const items = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive('bold'),
      tooltip: 'Negrita',
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive('italic'),
      tooltip: 'Cursiva',
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: editor.isActive('strike'),
      tooltip: 'Tachado',
    },
    { divider: true },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive('heading', { level: 1 }),
      tooltip: 'Título 1',
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive('heading', { level: 2 }),
      tooltip: 'Título 2',
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive('heading', { level: 3 }),
      tooltip: 'Título 3',
    },
    { divider: true },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive('bulletList'),
      tooltip: 'Lista',
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive('orderedList'),
      tooltip: 'Lista numerada',
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive('blockquote'),
      tooltip: 'Cita',
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: editor.isActive('codeBlock'),
      tooltip: 'Código',
    },
    {
      icon: Minus,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
      tooltip: 'Separador',
    },
    { divider: true },
    {
      icon: Undo2,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      disabled: !editor.can().undo(),
      tooltip: 'Deshacer',
    },
    {
      icon: Redo2,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      disabled: !editor.can().redo(),
      tooltip: 'Rehacer',
    },
  ]

  return (
    <div
      className="flex items-center gap-1 px-4 py-2 border-b flex-wrap"
      style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}
    >
      {items.map((item, i) => {
        if ('divider' in item) {
          return <div key={i} className="w-px h-6 mx-1" style={{ background: 'var(--color-paper-lines)' }} />
        }

        const Icon = item.icon!
        return (
          <button
            key={i}
            onClick={item.action}
            disabled={'disabled' in item ? item.disabled : false}
            title={item.tooltip}
            className={cn(
              'p-1.5 rounded transition-colors hover:opacity-80 disabled:opacity-30',
              item.active && 'opacity-100'
            )}
            style={{
              color: item.active ? 'var(--color-accent)' : 'var(--color-ink-light)',
              background: item.active ? 'var(--color-accent-light)' : 'transparent',
            }}
          >
            <Icon className="w-4 h-4" />
          </button>
        )
      })}
    </div>
  )
}

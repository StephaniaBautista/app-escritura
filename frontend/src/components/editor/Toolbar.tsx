import { useEditorState, type Editor } from '@tiptap/react'
import {
  Bold, Italic, Strikethrough, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Code, Undo2, Redo2, SeparatorHorizontal
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { FontSelect } from './toolbar/FontSelect'
import { AlignGroup } from './toolbar/AlignGroup'
import { ParagraphFormatMenu } from './toolbar/ParagraphFormatMenu'
import { EmDashButton } from './toolbar/EmDashButton'

interface ToolbarProps {
  editor: Editor | null
}

export function Toolbar({ editor }: ToolbarProps) {
  const { t } = useTranslation()

  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null
      return {
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isStrike: editor.isActive('strike'),
        isH1: editor.isActive('heading', { level: 1 }),
        isH2: editor.isActive('heading', { level: 2 }),
        isH3: editor.isActive('heading', { level: 3 }),
        isBulletList: editor.isActive('bulletList'),
        isOrderedList: editor.isActive('orderedList'),
        isBlockquote: editor.isActive('blockquote'),
        isCodeBlock: editor.isActive('codeBlock'),
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      }
    },
  })

  if (!editor || !state) return null

  const items = [
    {
      icon: Bold,
      action: () => editor.chain().focus().toggleBold().run(),
      active: state.isBold,
      tooltip: t('editorApp.bold'),
    },
    {
      icon: Italic,
      action: () => editor.chain().focus().toggleItalic().run(),
      active: state.isItalic,
      tooltip: t('editorApp.italic'),
    },
    {
      icon: Strikethrough,
      action: () => editor.chain().focus().toggleStrike().run(),
      active: state.isStrike,
      tooltip: t('editorApp.strike'),
    },
    {
      icon: Heading1,
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: state.isH1,
      tooltip: t('editorApp.heading1'),
    },
    {
      icon: Heading2,
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: state.isH2,
      tooltip: t('editorApp.heading2'),
    },
    {
      icon: Heading3,
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: state.isH3,
      tooltip: t('editorApp.heading3'),
    },
    {
      icon: List,
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: state.isBulletList,
      tooltip: t('editorApp.bulletList'),
    },
    {
      icon: ListOrdered,
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: state.isOrderedList,
      tooltip: t('editorApp.orderedList'),
    },
    {
      icon: Quote,
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: state.isBlockquote,
      tooltip: t('editorApp.blockquote'),
    },
    {
      icon: Code,
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: state.isCodeBlock,
      tooltip: t('editorApp.codeBlock'),
    },
    {
      icon: SeparatorHorizontal,
      action: () => editor.chain().focus().setHorizontalRule().run(),
      active: false,
      tooltip: t('editorApp.horizontalRule'),
    },
    {
      icon: Undo2,
      action: () => editor.chain().focus().undo().run(),
      active: false,
      disabled: !state.canUndo,
      tooltip: t('editorApp.undo'),
    },
    {
      icon: Redo2,
      action: () => editor.chain().focus().redo().run(),
      active: false,
      disabled: !state.canRedo,
      tooltip: t('editorApp.redo'),
    },
  ]

  const renderButton = (item: (typeof items)[number], i: number) => {
    const Icon = item.icon!
    return (
      <button
        key={i}
        type="button"
        onClick={item.action}
        disabled={'disabled' in item ? item.disabled : false}
        title={item.tooltip}
        aria-label={item.tooltip}
        aria-pressed={'active' in item ? item.active : undefined}
        className={cn(
          'p-1.5 rounded transition-colors hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed'
        )}
        style={{
          color: item.active ? 'var(--color-accent)' : 'var(--color-ink-light)',
          background: item.active ? 'var(--color-accent-light)' : 'transparent',
        }}
      >
        <Icon className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-1 px-4 py-2 border-b flex-wrap"
      style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-paper)' }}
    >
      {items.slice(0, 3).map((item, i) => renderButton(item, i))}
      <div className="w-px h-6 mx-1" style={{ background: 'var(--color-paper-lines)' }} />
      {items.slice(3, 6).map((item, i) => renderButton(item, i + 3))}
      <div className="w-px h-6 mx-1" style={{ background: 'var(--color-paper-lines)' }} />
      <AlignGroup editor={editor} />
      <div className="w-px h-6 mx-1" style={{ background: 'var(--color-paper-lines)' }} />
      <FontSelect editor={editor} />
      <ParagraphFormatMenu editor={editor} />
      <EmDashButton editor={editor} />
      <div className="w-px h-6 mx-1" style={{ background: 'var(--color-paper-lines)' }} />
      {items.slice(6, 11).map((item, i) => renderButton(item, i + 6))}
      <div className="w-px h-6 mx-1" style={{ background: 'var(--color-paper-lines)' }} />
      {items.slice(11).map((item, i) => renderButton(item, i + 11))}
    </div>
  )
}

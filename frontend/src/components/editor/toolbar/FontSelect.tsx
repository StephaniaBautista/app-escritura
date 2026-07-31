import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import { ToolbarSelect, type ToolbarSelectOption } from './ToolbarSelect'

interface FontSelectProps {
  editor: Editor
}

const APP_FONTS = [
  { value: 'var(--font-display)', labelKey: 'editorApp.fontCaveat', fontFamily: 'var(--font-display)' },
  { value: 'var(--font-mono)', labelKey: 'editorApp.fontSpaceGrotesk', fontFamily: 'var(--font-mono)' },
] as const

const WEB_FONTS: ToolbarSelectOption[] = [
  { value: 'Georgia, serif', label: 'Georgia', fontFamily: 'Georgia, serif' },
  { value: "'Times New Roman', serif", label: 'Times New Roman', fontFamily: "'Times New Roman', serif" },
  { value: 'Arial, sans-serif', label: 'Arial', fontFamily: 'Arial, sans-serif' },
  { value: 'Verdana, sans-serif', label: 'Verdana', fontFamily: 'Verdana, sans-serif' },
  { value: "'Courier New', monospace", label: 'Courier New', fontFamily: "'Courier New', monospace" },
]

export function FontSelect({ editor }: FontSelectProps) {
  const { t } = useTranslation()

  const current = editor.getAttributes('textStyle').fontFamily as string | undefined

  const options: ToolbarSelectOption[] = [
    { value: '', label: t('editorApp.fontDefault') },
    ...APP_FONTS.map((f) => ({ value: f.value, label: t(f.labelKey), fontFamily: f.fontFamily })),
    ...WEB_FONTS,
  ]

  const handleChange = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetFontFamily().run()
    } else {
      editor.chain().focus().setFontFamily(value).run()
    }
  }

  return (
    <ToolbarSelect
      value={current ?? ''}
      onChange={handleChange}
      options={options}
      ariaLabel={t('editorApp.fontFamily')}
    />
  )
}

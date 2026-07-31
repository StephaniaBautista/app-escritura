import type { Editor } from '@tiptap/react'
import { useTranslation } from 'react-i18next'
import { ToolbarSelect } from './ToolbarSelect'

interface LineHeightSelectProps {
  editor: Editor
}

const LINE_HEIGHTS = ['1', '1.15', '1.5', '2', '2.5', '3']

export function LineHeightSelect({ editor }: LineHeightSelectProps) {
  const { t } = useTranslation()

  const current = editor.getAttributes('textStyle').lineHeight as string | undefined

  const handleChange = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetLineHeight().run()
    } else {
      editor.chain().focus().setLineHeight(value).run()
    }
  }

  return (
    <ToolbarSelect
      value={current ?? ''}
      onChange={handleChange}
      options={[
        { value: '', label: t('editorApp.lineHeightDefault') },
        ...LINE_HEIGHTS.map((lh) => ({ value: lh, label: lh })),
      ]}
      ariaLabel={t('editorApp.lineHeight')}
      className="max-w-[110px]"
    />
  )
}

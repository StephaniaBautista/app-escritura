import { useTranslation } from 'react-i18next'
import type { BlockOutline } from '@/services/sharing'
import type { SharedComment } from '@/services/sharing'

interface SharedBlocksProps {
  blocks: BlockOutline[]
  comments: SharedComment[]
  activeBlock: number | null
  onSelectBlock: (index: number) => void
}

function blockClass(type: string): string {
  if (type === 'heading') return 'font-display text-2xl font-bold mt-6 mb-2'
  if (type === 'blockquote') return 'border-l-4 pl-4 italic my-3'
  return 'my-3 leading-relaxed'
}

export function SharedBlocks({ blocks, comments, activeBlock, onSelectBlock }: SharedBlocksProps) {
  const { t } = useTranslation()

  return (
    <div>
      {blocks.map((block, index) => {
        const blockComments = comments.filter(
          (comment) => !comment.orphan && comment.effectiveBlockIndex === index,
        )
        const isActive = activeBlock === index
        return (
          <div
            key={index}
            id={`shared-block-${index}`}
            className={`relative rounded-lg px-2 -mx-2 cursor-pointer transition-colors ${isActive ? 'ring-1' : ''}`}
            style={{
              background: isActive ? 'var(--color-accent-light)' : blockComments.length > 0 ? 'var(--color-paper)' : 'transparent',
              // @ts-expect-error custom property
              '--tw-ring-color': 'var(--color-accent)',
            }}
            onClick={() => onSelectBlock(index)}
          >
            <p
              className={blockClass(block.type)}
              style={{
                color: 'var(--color-ink)',
                fontWeight: block.type === 'heading' ? 700 : 400,
                fontSize: block.type === 'heading' ? '1.5rem' : '1rem',
              }}
            >
              {block.text || '\u00a0'}
            </p>
            {blockComments.length > 0 && (
              <span
                className="absolute top-1 right-1 text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--color-accent)', color: 'white' }}
                title={t('sharingApp.commentsTitle')}
              >
                {blockComments.length}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

import type { LucideProps } from 'lucide-react'
import { MapPin } from 'lucide-react'
import { DEFAULT_EVENT_ICON, EVENT_ICONS } from './timeline-constants'

interface EventIconProps extends Omit<LucideProps, 'name'> {
  icon: string | null | undefined
}

export function EventIcon({ icon, ...props }: EventIconProps) {
  const Icon = EVENT_ICONS[icon ?? DEFAULT_EVENT_ICON] ?? MapPin
  return <Icon {...props} />
}

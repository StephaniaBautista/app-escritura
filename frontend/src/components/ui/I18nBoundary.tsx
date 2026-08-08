import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'

interface I18nBoundaryProps {
  namespaces: string[]
  children: ReactNode
}

export function I18nBoundary({ namespaces, children }: I18nBoundaryProps) {
  useTranslation(namespaces)
  return <>{children}</>
}

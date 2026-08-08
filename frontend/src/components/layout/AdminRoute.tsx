import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { permissions } = useAuthStore()

  if (!permissions.some((p) => p === 'admin' || p === 'moderate')) {
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}

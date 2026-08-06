import { Navigate } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'

export function SuperadminRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()

  if (user?.role !== 'superadmin') {
    return <Navigate to="/app" replace />
  }
  return <>{children}</>
}

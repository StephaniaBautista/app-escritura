import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/AppSidebar'
import { Topbar } from '@/components/Topbar'

export function DashboardLayout() {
  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-background)' }}>
      <AppSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

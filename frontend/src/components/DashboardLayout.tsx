import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/components/AppSidebar'
import { Topbar } from '@/components/Topbar'
import { ToastContainer } from '@/components/ui/ToastContainer'

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-background)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile, overlay when open */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 md:relative md:translate-x-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

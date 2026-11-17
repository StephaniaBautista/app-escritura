import { useState } from 'react'
import { Outlet } from 'react-router'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AdviserSidebar } from '@/components/layout/AdviserSidebar'
import { Topbar } from '@/components/layout/Topbar'
import { ToastContainer } from '@/components/ui/ToastContainer'

export function DashboardLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adviserOpen, setAdviserOpen] = useState(false)

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: 'var(--color-background)' }}>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

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

      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar
          onMenuClick={() => setMobileOpen(true)}
          adviserOpen={adviserOpen}
          onToggleAdviser={() => setAdviserOpen((open) => !open)}
        />
        <main className="flex-1 min-w-0 overflow-auto">
          <Outlet />
        </main>
      </div>

      <AdviserSidebar open={adviserOpen} onClose={() => setAdviserOpen(false)} />
      <ToastContainer />
    </div>
  )
}

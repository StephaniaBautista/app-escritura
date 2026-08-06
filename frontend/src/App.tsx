import { useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { Landing } from '@/pages/landing/Landing'
import { PricingPage } from '@/pages/landing/PricingPage'
import { EditorPage } from '@/pages/editor/Editor'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { SuperadminRoute } from '@/components/layout/SuperadminRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardHome } from '@/pages/dashboard/DashboardHome'
import { DocumentsPage } from '@/pages/dashboard/DocumentsPage'
import { FolderPage } from '@/pages/dashboard/FolderPage'
import { RecentPage } from '@/pages/dashboard/RecentPage'
import { SharedPage } from '@/pages/dashboard/SharedPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { AdminPage } from '@/pages/admin/AdminPage'

function App() {
  const { checkSession, isInitialized } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      checkSession()
    }
  }, [checkSession, isInitialized])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="documents/:folderId" element={<FolderPage />} />
        <Route path="recent" element={<RecentPage />} />
        <Route path="shared" element={<SharedPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route
          path="admin"
          element={
            <SuperadminRoute>
              <AdminPage />
            </SuperadminRoute>
          }
        />
      </Route>
      <Route
        path="/app/editor"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EditorPage />} />
        <Route path=":projectId" element={<EditorPage />} />
        <Route path=":projectId/:documentId" element={<EditorPage />} />
      </Route>
    </Routes>
  )
}

export default App

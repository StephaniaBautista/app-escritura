import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth-store'
import { Login } from '@/pages/Login'
import { Register } from '@/pages/Register'
import { ForgotPassword } from '@/pages/ForgotPassword'
import { ResetPassword } from '@/pages/ResetPassword'
import { Landing } from '@/pages/Landing'
import { PricingPage } from '@/pages/PricingPage'
import { EditorPage } from '@/pages/Editor'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { DashboardLayout } from '@/components/DashboardLayout'
import { DashboardHome } from '@/pages/DashboardHome'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { FolderPage } from '@/pages/FolderPage'
import { RecentPage } from '@/pages/RecentPage'
import { SharedPage } from '@/pages/SharedPage'

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

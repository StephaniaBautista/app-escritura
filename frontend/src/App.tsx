import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { useAuthStore } from '@/stores/auth-store'
import { useSettingsStore } from '@/stores/settings-store'
import { settingsApi } from '@/services/settings'
import { applySavedLanguage } from '@/i18n/language'
import { I18nBoundary } from '@/components/ui/I18nBoundary'
import { Login } from '@/pages/auth/Login'
import { Register } from '@/pages/auth/Register'
import { ForgotPassword } from '@/pages/auth/ForgotPassword'
import { ResetPassword } from '@/pages/auth/ResetPassword'
import { Landing } from '@/pages/landing/Landing'
import { PricingPage } from '@/pages/landing/PricingPage'
import { EditorPage } from '@/pages/editor/Editor'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AdminRoute } from '@/components/layout/AdminRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { DashboardHome } from '@/pages/dashboard/DashboardHome'
import { DocumentsPage } from '@/pages/dashboard/DocumentsPage'
import { FolderPage } from '@/pages/dashboard/FolderPage'
import { RecentPage } from '@/pages/dashboard/RecentPage'
import { SharedPage } from '@/pages/dashboard/SharedPage'
import { SharedDocumentPage } from '@/pages/shared/SharedDocumentPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { AdminPage } from '@/pages/admin/AdminPage'

const StatsDashboard = lazy(() => import('@/components/stats/StatsDashboard').then((module) => ({ default: module.StatsDashboard })))
const AiCharactersDashboard = lazy(() => import('@/components/characters/AiCharactersDashboard').then((module) => ({ default: module.AiCharactersDashboard })))
const STATS_NS = ['statsApp', 'common']
const AI_CHARACTERS_NS = ['characterApp', 'aiApp', 'common']

const LANDING_NS = ['nav', 'hero', 'features', 'editor', 'characters', 'timeline', 'worldbuilding', 'ai', 'structure', 'stats', 'exportSection', 'pricing', 'cta', 'footer', 'comparison', 'faq', 'common']
const PRICING_NS = ['pricing', 'pricingPage', 'comparison', 'faq', 'cta', 'ai', 'nav', 'footer', 'common']
const AUTH_NS = ['auth', 'common']
const SHELL_NS = ['sidebar', 'admin', 'settings', 'common']
const DOCUMENTS_NS = ['projects', 'storySetup', 'tagsApp', 'common']
const FOLDER_NS = ['folder', 'notes', 'versions', 'storySetup', 'characterApp', 'timelineApp', 'diagramApp', 'worldApp', 'structureApp', 'exportApp', 'tagsApp', 'sharingApp', 'common']
const EDITOR_NS = ['editorApp', 'sidebar', 'notes', 'postit', 'versions', 'branches', 'aiApp', 'exportApp', 'common']
const SHARED_NS = ['sharingApp', 'common']

function App() {
  const { checkSession, isInitialized, isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      checkSession()
    }
  }, [checkSession, isInitialized])

  useEffect(() => {
    if (!isInitialized) return
    if (useAuthStore.getState().isAuthenticated) {
      settingsApi.get()
        .then((settings) => {
          useSettingsStore.setState({ settings, loading: false, error: null })
          applySavedLanguage(settings.language)
        })
        .catch(() => applySavedLanguage())
    }
  }, [isInitialized, isAuthenticated])

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<I18nBoundary key="landing" namespaces={LANDING_NS}><Landing /></I18nBoundary>} />
        <Route path="/pricing" element={<I18nBoundary key="pricing" namespaces={PRICING_NS}><PricingPage /></I18nBoundary>} />
        <Route path="/login" element={<I18nBoundary key="login" namespaces={AUTH_NS}><Login /></I18nBoundary>} />
        <Route path="/register" element={<I18nBoundary key="register" namespaces={AUTH_NS}><Register /></I18nBoundary>} />
        <Route path="/forgot-password" element={<I18nBoundary key="forgot-password" namespaces={AUTH_NS}><ForgotPassword /></I18nBoundary>} />
        <Route path="/reset-password" element={<I18nBoundary key="reset-password" namespaces={AUTH_NS}><ResetPassword /></I18nBoundary>} />
        <Route path="/shared/:token" element={<I18nBoundary key="shared-doc" namespaces={SHARED_NS}><SharedDocumentPage /></I18nBoundary>} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <I18nBoundary key="app-shell" namespaces={SHELL_NS}><DashboardLayout /></I18nBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardHome />} />
          <Route path="documents" element={<I18nBoundary key="documents" namespaces={DOCUMENTS_NS}><DocumentsPage /></I18nBoundary>} />
          <Route path="documents/:folderId" element={<I18nBoundary key="folder" namespaces={FOLDER_NS}><FolderPage /></I18nBoundary>} />
          <Route path="ai-characters" element={<I18nBoundary key="ai-characters" namespaces={AI_CHARACTERS_NS}><AiCharactersDashboard /></I18nBoundary>} />
          <Route path="stats" element={<I18nBoundary key="stats" namespaces={STATS_NS}><StatsDashboard /></I18nBoundary>} />
          <Route path="recent" element={<RecentPage />} />
          <Route path="shared" element={<I18nBoundary key="shared-with-me" namespaces={SHARED_NS}><SharedPage /></I18nBoundary>} />
          <Route path="settings" element={<I18nBoundary key="settings" namespaces={['settings', 'aiApp', 'common']}><SettingsPage /></I18nBoundary>} />
          <Route
            path="admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />
        </Route>
        <Route
          path="/app/editor"
          element={
            <ProtectedRoute>
              <I18nBoundary key="editor-shell" namespaces={SHELL_NS}><DashboardLayout /></I18nBoundary>
            </ProtectedRoute>
          }
        >
          <Route index element={<I18nBoundary key="editor-index" namespaces={EDITOR_NS}><EditorPage /></I18nBoundary>} />
          <Route path=":projectId" element={<I18nBoundary key="editor-project" namespaces={EDITOR_NS}><EditorPage /></I18nBoundary>} />
          <Route path=":projectId/:documentId" element={<I18nBoundary key="editor-document" namespaces={EDITOR_NS}><EditorPage /></I18nBoundary>} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default App

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'
import { useAuthStore } from '@/stores/auth-store'
import { Feather, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await login(email, password, rememberMe)
      navigate('/app')
    } catch (error) {
      // Error is handled by the store
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-background)' }}>
      {/* Left side - Decorative */}
      <div className=" lg:flex lg:w-1/2 items-center justify-center p-12 relative overflow-hidden" style={{ background: 'var(--color-paper)' }}>
        <div className="notebook-lines absolute inset-0 opacity-30"></div>
        
        <div className="relative z-10 max-w-md">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
                <Feather className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-3xl font-bold" style={{ color: 'var(--color-ink)' }}>Escritura</span>
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight mb-4" style={{ color: 'var(--color-ink)' }}>
              <Trans i18nKey="auth.login.heroTitle">
                Tu historia merece un <span className="pencil-underline">taller</span>
              </Trans>
            </h1>
            <p className="text-lg leading-relaxed" style={{ color: 'var(--color-ink-light)' }}>
              {t('auth.login.heroSubtitle')}
            </p>
          </div>

          <div className="space-y-4">
            <div className="postit p-4 inline-block" style={{ maxWidth: '280px' }}>
              <div className="font-display text-base font-bold mb-1">{t('auth.login.heroNote')}</div>
              <div className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                {t('auth.login.heroNoteText')}
              </div>
            </div>

            <div className="postit-blue p-3 inline-block ml-8" style={{ maxWidth: '240px' }}>
              <div className="text-sm" style={{ color: 'var(--color-ink)' }}>
                {t('auth.login.heroStat')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
              <Feather className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>Escritura</span>
          </div>

          <div className="notebook-paper p-8">
            <div className="mb-8">
              <h2 className="font-display text-3xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
                {t('auth.login.title')}
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                {t('auth.login.noAccount')}{' '}
                <Link
                  to="/register"
                  className="font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('auth.login.registerHere')}
                </Link>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg border text-sm" style={{ background: 'var(--color-accent-light)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                  {t('auth.errors.loginFailed')}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                  {t('auth.login.email')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--color-background)',
                      borderColor: 'var(--color-paper-lines)',
                      color: 'var(--color-ink)',
                      '--tw-ring-color': 'var(--color-accent)',
                    } as React.CSSProperties}
                    placeholder={t('auth.login.emailPlaceholder')}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                  {t('auth.login.password')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2"
                    style={{
                      background: 'var(--color-background)',
                      borderColor: 'var(--color-paper-lines)',
                      color: 'var(--color-ink)',
                      '--tw-ring-color': 'var(--color-accent)',
                    } as React.CSSProperties}
                    placeholder={t('auth.login.passwordPlaceholder')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    style={{ color: 'var(--color-ink-faint)' }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border"
                    style={{ borderColor: 'var(--color-paper-lines)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-ink-light)' }}>{t('auth.login.rememberMe')}</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-accent)' }}
                >
                  {t('auth.login.forgotPassword')}
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                style={{ background: 'var(--color-accent)' }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t('auth.login.submitting')}
                  </>
                ) : (
                  <>
                    {t('auth.login.submit')}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--color-paper-lines)' }}>
              <p className="text-xs text-center" style={{ color: 'var(--color-ink-faint)' }}>
                {t('auth.login.terms')}{' '}
                <button className="underline hover:opacity-80">{t('auth.login.termsOfService')}</button>
                {' '}{t('auth.login.and')}{' '}
                <button className="underline hover:opacity-80">{t('auth.login.privacyPolicy')}</button>
              </p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--color-ink-light)' }}
            >
              {t('auth.login.backToHome')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

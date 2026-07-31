import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Feather, Lock, Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError(t('auth.resetPassword.passwordsDontMatch'))
      return
    }

    if (password.length < 8) {
      setError(t('auth.resetPassword.passwordTooShort'))
      return
    }

    if (!token) {
      setError(t('auth.resetPassword.invalidLink'))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error?.message || t('auth.resetPassword.error'))
      }

      setIsSuccess(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (error: any) {
      setError(error.message || t('auth.resetPassword.error'))
    } finally {
      setIsLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--color-background)' }}>
        <div className="w-full max-w-md">
          <div className="notebook-paper p-8 text-center">
            <h2 className="font-display text-2xl font-bold mb-4" style={{ color: 'var(--color-ink)' }}>
              {t('auth.resetPassword.invalidLink')}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--color-ink-light)' }}>
              {t('auth.resetPassword.invalidLinkMessage')}
            </p>
            <Link
              to="/forgot-password"
              className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
              style={{ color: 'var(--color-accent)' }}
            >
              {t('auth.resetPassword.requestNew')}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--color-background)' }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--color-accent)' }}>
            <Feather className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold" style={{ color: 'var(--color-ink)' }}>Escritura</span>
        </div>

        <div className="notebook-paper p-8">
          {isSuccess ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-accent-teal-light)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-accent-teal)' }} />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
                {t('auth.resetPassword.successTitle')}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-ink-light)' }}>
                {t('auth.resetPassword.successMessage')}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
                {t('auth.resetPassword.redirecting')}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
                  {t('auth.resetPassword.title')}
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                  {t('auth.resetPassword.description')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg border text-sm" style={{ background: 'var(--color-accent-light)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                    {t('auth.resetPassword.password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
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
                      placeholder={t('auth.resetPassword.passwordPlaceholder')}
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

                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                    {t('auth.resetPassword.confirmPassword')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-4 h-4" style={{ color: 'var(--color-ink-faint)' }} />
                    </div>
                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2"
                      style={{
                        background: 'var(--color-background)',
                        borderColor: 'var(--color-paper-lines)',
                        color: 'var(--color-ink)',
                        '--tw-ring-color': 'var(--color-accent)',
                      } as React.CSSProperties}
                      placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      style={{ color: 'var(--color-ink-faint)' }}
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                      {t('auth.resetPassword.submitting')}
                    </>
                  ) : (
                    <>
                      {t('auth.resetPassword.submit')}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

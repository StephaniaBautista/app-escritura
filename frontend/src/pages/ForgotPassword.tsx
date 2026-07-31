import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Feather, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [error, setError] = useState('')
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (response.ok) {
        setIsSent(true)
      } else {
        setError(t('auth.forgotPassword.error'))
      }
    } catch (error: any) {
      setError(t('auth.errors.networkError'))
    } finally {
      setIsLoading(false)
    }
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
          {isSent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--color-accent-teal-light)' }}>
                <CheckCircle className="w-8 h-8" style={{ color: 'var(--color-accent-teal)' }} />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
                {t('auth.forgotPassword.successTitle')}
              </h2>
              <p className="text-sm mb-6" style={{ color: 'var(--color-ink-light)' }}>
                {t('auth.forgotPassword.successMessage')} <strong>{email}</strong>, {t('auth.forgotPassword.successMessage2')}
              </p>
              <p className="text-sm mb-6" style={{ color: 'var(--color-ink-faint)' }}>
                {t('auth.forgotPassword.checkSpam')}
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: 'var(--color-accent)' }}
              >
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--color-ink)' }}>
                  {t('auth.forgotPassword.title')}
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-ink-light)' }}>
                  {t('auth.forgotPassword.description')}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="p-3 rounded-lg border text-sm" style={{ background: 'var(--color-accent-light)', borderColor: 'var(--color-accent)', color: 'var(--color-accent)' }}>
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-ink)' }}>
                    {t('auth.forgotPassword.email')}
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
                      placeholder={t('auth.forgotPassword.emailPlaceholder')}
                    />
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
                      {t('auth.forgotPassword.submitting')}
                    </>
                  ) : (
                    <>
                      {t('auth.forgotPassword.submit')}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  to="/login"
                  className="text-sm font-medium transition-colors hover:opacity-80"
                  style={{ color: 'var(--color-ink-light)' }}
                >
                  {t('auth.forgotPassword.backToLogin')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

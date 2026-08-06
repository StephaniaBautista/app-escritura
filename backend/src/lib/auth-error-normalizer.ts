const GENERIC_SIGNUP_ERROR = {
  error: {
    code: 'SIGNUP_FAILED',
    message: 'No se pudo crear la cuenta. Revisa los datos o inténtalo de nuevo.',
  },
}

export interface NormalizedAuthResponse {
  status: number
  body: unknown
}

export function normalizeAuthError(url: string, status: number, body: unknown): NormalizedAuthResponse {
  if (url.includes('/auth/sign-up/email') && status >= 400) {
    return { status, body: GENERIC_SIGNUP_ERROR }
  }
  return { status, body }
}

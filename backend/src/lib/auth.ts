import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { prisma } from './prisma.js'
import { sendEmail } from './email.js'

const baseURL = process.env.BETTER_AUTH_URL || 'http://localhost:3001'

// Build social providers dynamically
const socialProviders: Record<string, any> = {}

if (process.env.GOOGLE_CLIENT_ID && 
    process.env.GOOGLE_CLIENT_SECRET && 
    process.env.GOOGLE_CLIENT_ID !== 'your-google-client-id') {
  socialProviders.google = {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }
}

export const auth = betterAuth({
  baseURL,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      await sendEmail({
        to: user.email,
        subject: 'Recupera tu contraseña - Escritura',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #b44a2d;">Recupera tu contraseña</h2>
            <p>Hola ${user.name || 'escritor'},</p>
            <p>Recibimos una solicitud para restablecer tu contraseña.</p>
            <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
            <a href="${url}" style="display: inline-block; background: #b44a2d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 16px 0;">
              Restablecer contraseña
            </a>
            <p style="color: #666; font-size: 14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <p style="color: #666; font-size: 14px;">Este enlace expira en 1 hora.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">Escritura - Plataforma de escritura creativa</p>
          </div>
        `,
      })
    },
  },
  ...(Object.keys(socialProviders).length > 0 && { socialProviders }),
  session: {
    expiresIn: 60 * 60 * 24 * 365, // 1 year (effectively indefinite)
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === 'production',
    crossSubDomainCookies: {
      enabled: false,
    },
  },
  trustedOrigins: [
    'http://localhost:5173',
    'http://localhost:3001',
    process.env.FRONTEND_URL || 'https://app-escritura.vercel.app',
  ],
})

export type Session = typeof auth.$Infer.Session

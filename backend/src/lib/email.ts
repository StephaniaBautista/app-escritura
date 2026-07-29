import nodemailer from 'nodemailer'

interface EmailOptions {
  to: string
  subject: string
  html: string
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, // App password for Gmail
  },
})

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: `"Escritura" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Error sending email:', error)
    // En desarrollo, no fallar si el email no se envia
    if (process.env.NODE_ENV === 'development') {
      console.warn('Email sending failed in development mode, continuing...')
      return { success: false, error: 'Email not configured' }
    }
    throw error
  }
}

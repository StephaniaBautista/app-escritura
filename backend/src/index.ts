import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { authRoutes } from './routes/auth.js'

const app = Fastify({
  logger: true,
})

// Plugins
await app.register(cors, {
  origin: ['http://localhost:5173'],
  credentials: true,
})

await app.register(helmet)

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

// Health check
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Auth routes
await app.register(authRoutes, { prefix: '/api' })

// API routes prefix
app.register(async function apiRoutes(app) {
  app.get('/api/test', async () => {
    return { message: 'API funcionando' }
  })
}, { prefix: '/api' })

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server running on http://localhost:${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

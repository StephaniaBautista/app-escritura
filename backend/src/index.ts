import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { authRoutes } from './routes/auth.js'
import { projectRoutes } from './routes/projects.js'
import { documentRoutes } from './routes/documents.js'
import { noteRoutes } from './routes/notes.js'
import { versionRoutes } from './routes/versions.js'
import { settingsRoutes } from './routes/settings.js'
import { autoVersionRoutes } from './routes/auto-version.js'
import { branchRoutes } from './routes/branches.js'

const app = Fastify({
  logger: true,
})

// Swagger/OpenAPI configuration
await app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Archivum API',
      description: 'API de la plataforma de escritura creativa con IA',
      version: '0.1.0',
      contact: {
        name: 'Archivum Team',
        email: 'support@archivum.app',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'better-auth.session_token',
          description: 'Session cookie set by Better Auth on login. Sent automatically by the browser.',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Endpoints de autenticación' },
      { name: 'Projects', description: 'Gestión de proyectos' },
      { name: 'Documents', description: 'Gestión de documentos, capítulos y subpáginas' },
      { name: 'Notes', description: 'Notas tipo post-it por documento' },
      { name: 'Versions', description: 'Versionado lineal (snapshots) por documento' },
      { name: 'AutoVersion', description: 'Versionado automático por triggers' },
      { name: 'Branches', description: 'Ramas de versionado (Git-like)' },
      { name: 'Settings', description: 'Configuración de usuario' },
      { name: 'Characters', description: 'Gestión de personajes' },
      { name: 'AI', description: 'Integración con IA' },
    ],
  },
})

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: true,
  },
})

// Plugins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
})

await app.register(helmet)

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

// Health check
app.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['System'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
        },
      },
    },
  },
}, async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Auth routes
await app.register(authRoutes, { prefix: '/api' })

// Project routes
await app.register(projectRoutes, { prefix: '/api' })

// Document routes
await app.register(documentRoutes, { prefix: '/api' })

// Note routes
await app.register(noteRoutes, { prefix: '/api' })

// Version routes
await app.register(versionRoutes, { prefix: '/api' })

// Settings routes
await app.register(settingsRoutes, { prefix: '/api' })

// Auto-version routes
await app.register(autoVersionRoutes, { prefix: '/api' })

// Branch routes
await app.register(branchRoutes, { prefix: '/api' })

// API routes prefix
app.register(async function apiRoutes(app) {
  app.get('/api/test', {
    schema: {
      description: 'Test endpoint',
      tags: ['System'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
          },
        },
      },
    },
  }, async () => {
    return { message: 'API funcionando' }
  })
}, { prefix: '/api' })

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server running on http://localhost:${port}`)
    console.log(`Swagger docs available at http://localhost:${port}/docs`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

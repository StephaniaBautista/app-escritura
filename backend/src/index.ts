import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { authRoutes } from './routes/auth.js'

const app = Fastify({
  logger: true,
})

// Swagger/OpenAPI configuration
await app.register(swagger, {
  openapi: {
    openapi: '3.0.0',
    info: {
      title: 'Escritura API',
      description: 'API de la plataforma de escritura creativa con IA',
      version: '0.1.0',
      contact: {
        name: 'Escritura Team',
        email: 'support@escritura.app',
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
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Endpoints de autenticación' },
      { name: 'Documents', description: 'Gestión de documentos' },
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

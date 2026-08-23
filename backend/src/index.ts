import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
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
import { optionsRoutes } from './routes/options.js'
import { adminOptionsRoutes } from './routes/admin-options.js'
import { adminRolesRoutes } from './routes/admin-roles.js'
import { adminUsersRoutes } from './routes/admin-users.js'
import { meRoutes } from './routes/me.js'
import { activityRoutes } from './routes/activity.js'
import { i18nRoutes } from './routes/i18n.js'
import { storyBankRoutes } from './routes/story-bank.js'
import { characterRoutes } from './routes/characters.js'
import { characterOptionsRoutes } from './routes/character-options.js'
import { storySectionsRoutes } from './routes/story-sections.js'
import { timelineRoutes } from './routes/timeline.js'
import { relationshipRoutes } from './routes/relationships.js'
import { diagramRoutes } from './routes/diagrams.js'
import { worldbuildingRoutes } from './routes/worldbuilding.js'
import { ocrRoutes } from './routes/ocr.js'
import { optionsService } from './services/options-service.js'
import { roleService } from './services/role-service.js'
import { storyBankService } from './services/story-bank-service.js'
import { characterOptionService } from './services/character-option-service.js'
import { storySectionService } from './services/story-section-service.js'

const app = Fastify({
  logger: true,
  // Trust X-Forwarded-* only when explicitly enabled (production behind a proxy).
  // Keeps the rate-limit keyed on the real client IP; do NOT enable in dev.
  trustProxy: process.env.TRUST_PROXY === 'true',
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
      { name: 'Story Options', description: 'Opciones reutilizables del wizard de creación' },
      { name: 'Character Options', description: 'Catálogo estático de opciones del formulario de personaje (M41)' },
      { name: 'Story Sections', description: 'Secciones estándar de estructura de historia (M41)' },
      { name: 'i18n', description: 'Traducciones por namespace (público, cacheado)' },
      { name: 'Worldbuilding', description: 'Lore, razas, glosario, criaturas y mapa mundial (Fase 7)' },
      { name: 'OCR', description: 'Extracción de texto de imágenes y PDFs escaneados (Fase 7)' },
    ],
  },
})

// Swagger UI only in development — exposing the full API schema in production
// would let an attacker enumerate every endpoint.
if (process.env.NODE_ENV !== 'production') {
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
  })
}

// Plugins
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

await app.register(cors, {
  origin: allowedOrigins,
  credentials: true,
})

await app.register(helmet)

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
})

await app.register(rateLimit, {
  max: parseInt(process.env.RATE_MAX ?? '100', 10),
  timeWindow: '1 minute',
  // /api/i18n son recursos estáticos (allowlist + cache + ETag) que cada page
  // load consume ~15 veces; no cuentan para el presupuesto anti-brute-force.
  allowList: (request) => request.url.startsWith('/api/i18n/'),
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

// Story options routes
await app.register(optionsRoutes, { prefix: '/api' })

// Admin moderation routes (Fase 04c)
await app.register(adminOptionsRoutes, { prefix: '/api' })

// Admin roles + users routes (Fase 04c)
await app.register(adminRolesRoutes, { prefix: '/api' })
await app.register(adminUsersRoutes, { prefix: '/api' })

// Current user (role + permissions)
await app.register(meRoutes, { prefix: '/api' })

// Activity feed routes (M29)
await app.register(activityRoutes, { prefix: '/api' })

// i18n translation namespaces (M31)
await app.register(i18nRoutes, { prefix: '/api' })

// Story bank (questions + structure templates, Fase 4 Slice 5)
await app.register(storyBankRoutes, { prefix: '/api' })

// Characters (Fase 5)
await app.register(characterRoutes, { prefix: '/api' })

// Static catalogs (M41): character form options + standard story sections
await app.register(characterOptionsRoutes, { prefix: '/api' })
await app.register(storySectionsRoutes, { prefix: '/api' })

// Fase 6: timeline + relationships + diagrams
await app.register(timelineRoutes, { prefix: '/api' })
await app.register(relationshipRoutes, { prefix: '/api' })
await app.register(diagramRoutes, { prefix: '/api' })

// Fase 7: lore + worldbuilding
await app.register(worldbuildingRoutes, { prefix: '/api' })

// Fase 7: OCR de imágenes y PDFs escaneados
await app.register(ocrRoutes, { prefix: '/api' })

// Test endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
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
}

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10)
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server running on http://localhost:${port}`)
    console.log(`Swagger docs available at http://localhost:${port}/docs`)

    const seeded = await optionsService.seedDefaults()
    if (seeded > 0) console.log(`Seeded ${seeded} default story options`)

    const seededRoles = await roleService.seedDefaults()
    if (seededRoles > 0) console.log(`Seeded ${seededRoles} default roles`)

    const seededBank = await storyBankService.seedDefaults()
    if (seededBank.questions > 0 || seededBank.templates > 0) {
      console.log(`Seeded ${seededBank.questions} questions and ${seededBank.templates} templates`)
    }

    const seededCharacterOptions = await characterOptionService.seedDefaults()
    if (seededCharacterOptions > 0) console.log(`Seeded ${seededCharacterOptions} default character options`)

    const seededSections = await storySectionService.seedDefaults()
    if (seededSections > 0) console.log(`Seeded ${seededSections} default story sections`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

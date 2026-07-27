# Arquitectura

Diagrama de arquitectura de la plataforma Escritura.

## Stack Tecnologico

### Frontend
- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- Zustand (state management)
- TipTap (editor)
- React Flow (diagramas)
- react-i18next (internacionalizacion)

### Backend
- Node.js 22 LTS
- Fastify 5
- Prisma 7 (ORM)
- BetterAuth (autenticacion)
- Stripe (pagos)
- Socket.io (websocket)

### Infraestructura
- Supabase (PostgreSQL + Storage)
- Vercel (frontend)
- Railway (backend)
- Expo EAS (movil)

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Pages    │  │  Components │  │   Stores    │         │
│  │  (Routes)   │→│  (React)    │→│  (Zustand)  │         │
│  └─────────────┘  └─────────────┘  └──────┬──────┘         │
│                                           │                 │
│                                    ┌──────▼──────┐         │
│                                    │  Services   │         │
│                                    │  (API calls)│         │
│                                    └──────┬──────┘         │
└───────────────────────────────────────────┼─────────────────┘
                                            │ fetch/REST
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Routes    │→│  Middleware  │→│  Services   │         │
│  │  (Fastify)  │  │(Auth+Zod)  │  │  (Logic)    │         │
│  └─────────────┘  └─────────────┘  └──────┬──────┘         │
│                                           │                 │
│                    ┌──────────────────────┼────────┐        │
│                    │                      │        │        │
│             ┌──────▼──────┐  ┌────────────▼───┐   │        │
│             │   Prisma    │  │  AI Clients    │   │        │
│             │   (ORM)     │  │(Deepseek/MiMo) │   │        │
│             └──────┬──────┘  └────────────────┘   │        │
└────────────────────┼──────────────────────────────┘        │
                     │                                        │
              ┌──────▼──────┐                                │
              │  Supabase   │                                │
              │ (PostgreSQL)│                                │
              └─────────────┘                                │
```

## Seguridad

- Autenticacion con BetterAuth (JWT)
- CORS configurado
- Rate limiting
- Helmet (security headers)
- Validacion de inputs con Zod
- API keys de IA solo en backend

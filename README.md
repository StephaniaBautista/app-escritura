# Escritura

Plataforma de escritura creativa con IA para escritores de historias originales y fanfics.

## Que es

Escritura es un editor profesional que combina un editor de texto enriquecido con herramientas de worldbuilding, gestion de personajes, versionado tipo Git, y asistencia de IA. Diseñado para escritores que necesitan organizar universos complejos y mantener coherencia narrativa.

## Caracteristicas

### Editor
- Editor de texto enriquecido (TipTap)
- Capitulos y subpaginas
- Notas y post-its colapsables
- Guardado automatico
- Versionado Git (ramas, fusiones, historial)

### Universo
- Personajes con 30+ atributos
- Arbol genealigico
- Evolucion de personajes
- Linea del tiempo
- Mapa de relaciones (React Flow)
- Lore, razas, glosario, criaturas
- Mapa mundial

### IA (DeepSeek/MiMo)
- Chat companion (conoce tu historia)
- Character.AI (habla con personajes en rol)
- Sugerencias en tiempo real (inconsistencias, agujeros de guion)
- Autocompletado

### Exportacion
- PDF
- Markdown
- HTML con CSS
- AO3 (directo o copiar/pegar)

### Colaboracion
- Links compartibles
- Beta readers con comentarios
- Sin limite de compartidos

## Tech Stack

### Frontend
- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- Zustand
- TipTap
- React Flow
- Lucide React
- react-i18next

### Backend
- Node.js 22 LTS
- Fastify 5
- Prisma 6
- BetterAuth
- Stripe
- Socket.io

### Infraestructura
- Supabase (PostgreSQL + Storage)
- Vercel (frontend)
- Railway (backend)
- Expo EAS (movil)

## Instalacion

```bash
# Clonar repositorio
git clone https://github.com/StephaniaBautista/app-escritura.git
cd app-escritura

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con tus credenciales

# Iniciar desarrollo
pnpm dev
```

### Comandos

```bash
# Frontend
cd frontend
pnpm dev          # localhost:5173
pnpm build
pnpm lint
pnpm typecheck
pnpm test

# Backend
cd backend
pnpm dev          # localhost:3001
pnpm build
pnpm start
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio

# Ambos (raiz)
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

## Estructura

```
app-escritura/
├── frontend/              # App React Web
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Paginas
│   │   ├── stores/        # Zustand stores
│   │   ├── services/      # API calls
│   │   ├── i18n/          # Traducciones (es/en)
│   │   └── styles/        # CSS global
│   └── package.json
│
├── backend/               # API Fastify
│   ├── src/
│   │   ├── routes/        # Endpoints REST
│   │   ├── services/      # Logica de negocio
│   │   ├── middleware/     # Auth, validacion
│   │   └── lib/           # Utilidades
│   ├── prisma/            # Schema DB
│   └── package.json
│
└── package.json           # Monorepo pnpm workspaces
```

## Internacionalizacion

La app soporta español e ingles. Los archivos de traduccion estan en:

- `frontend/src/i18n/locales/es.json`
- `frontend/src/i18n/locales/en.json`

Para agregar un nuevo idioma:
1. Crear nuevo archivo JSON en `frontend/src/i18n/locales/`
2. Agregar el idioma en `frontend/src/i18n/index.ts`
3. Usar `t('clave')` en los componentes

## Planes

| Plan | Precio | Incluye |
|------|--------|---------|
| Gratis | $0 | Escritura basica, 5 personajes, 1 rama |
| Pro | $8/mes | Todo ilimitado, sin IA |
| Premium Chat | $12/mes | Pro + Chat IA (~100K tokens) |
| Premium Full | $22/mes | Todo + Character.AI + Sugerencias (~400K tokens) |

## Licencia

Privado. Todos los derechos reservados.

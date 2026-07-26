# Plan Técnico: App Escritura

## Resumen Ejecutivo

Plataforma de escritura creativa con IA. Backend (Fastify) y Frontend (React) completamente separados, conectados via REST API. Base de datos Supabase (PostgreSQL), autenticación BetterAuth, editor TipTap. App móvil (React Native/Expo) depende SOLO del backend.

**Escala:** ~100 usuarios iniciales
**Prioridad:** Independencia total de la app móvil (solo backend/API)

---

## Arquitectura de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        APP MÓVIL (Expo)                             │
│                     SOLO depende del Backend                        │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Screens   │  │ Components  │  │   Stores    │                 │
│  │  (Routes)   │→│  (React)    │→│  (Zustand)  │                 │
│  └─────────────┘  └─────────────┘  └──────┬──────┘                 │
│                                           │                         │
│                                    ┌──────▼──────┐                 │
│                                    │  Services   │                 │
│                                    │  (API calls)│                 │
│                                    └──────┬──────┘                 │
└───────────────────────────────────────────┼─────────────────────────┘
                                            │ fetch/REST
                                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                   │
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   Routes    │→│  Middleware  │→│  Services   │                 │
│  │  (Fastify)  │  │(Auth+Zod)  │  │  (Logic)    │                 │
│  └─────────────┘  └─────────────┘  └──────┬──────┘                 │
│                                           │                         │
│  ┌────────────────────────────────────────┼────────────────────┐    │
│  │                                        │                    │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────▼───┐  ┌──────────┐ │    │
│  │  │  Prisma  │  │AI Client │  │   OCR      │  │ Storage  │ │    │
│  │  │  (ORM)   │  │(DeepSeek)│  │(Tesseract) │  │(Supabase)│ │    │
│  │  └──────────┘  └──────────┘  └────────────┘  └──────────┘ │    │
│  │                                                            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐              │    │
│  │  │  Git     │  │ AO3      │  │  Stripe    │              │    │
│  │  │(version) │  │(scraping)│  │  (pagos)   │              │    │
│  │  └──────────┘  └──────────┘  └────────────┘              │    │
│  └────────────────────────────────────────────────────────────┘    │
└────────────────────────────────────────────────────────────────────┘
                     │
              ┌──────▼──────┐
              │  Supabase   │
              │ (PostgreSQL)│
              └─────────────┘
```

---

## Stack Tecnológico Final

### Frontend Web
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19 | UI framework |
| Vite | 8 | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4 | Estilos utility-first |
| MUI | 9 | Componentes UI |
| Zustand | 5 | State management |
| TipTap | 2.x | Editor de texto enriquecido |
| React Flow | 1.x | Diagramas |
| React Router | 7 | Navegación SPA |
| Lucide React | latest | Iconografía |
| Recharts | latest | Estadísticas |
| Framer Motion | latest | Animaciones |

### Frontend Móvil
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React Native | latest | App móvil nativa |
| Expo | latest | Toolchain RN |
| React Native Paper | latest | UI components |
| TipTap (webview) | - | Editor en móvil via WebView |

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22 LTS | Runtime |
| Fastify | 5 | HTTP framework |
| TypeScript | 5.x | Type safety |
| Prisma | 6+ | ORM para Supabase |
| Zod | 3.x | Validación de esquemas |
| BetterAuth | latest | Autenticación |
| Socket.io | latest | WebSocket |
| Stripe | latest | Pasarela de pago |
| simple-git | latest | Versionado de documentos |
| Tesseract.js | latest | OCR (PDFs escaneados) |
| Puppeteer | latest | AO3 web scraping |

### Infraestructura
| Servicio | Propósito |
|----------|-----------|
| Supabase | PostgreSQL + Storage |
| Vercel | Hosting frontend web |
| Railway/Render | Hosting backend |
| Expo EAS | Build y distribución app móvil |

### Integraciones IA
| API | Propósito |
|-----|-----------|
| DeepSeek | Chat, Character.AI, sugerencias |
| MiMo | Análisis de coherencia, autocompletado |

---

## Fases de Implementación

### Fase 0: Fundación (Sin dependencias)
**Objetivo:** Setup del monorepo, tooling básico, configuración de desarrollo

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T1 | Setup monorepo pnpm workspaces | `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.npmrc` |
| T2 | Setup TypeScript + Vite (frontend) | `frontend/package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts` |
| T3 | Setup Fastify + TypeScript (backend) | `backend/package.json`, `tsconfig.json`, `src/index.ts` |
| T4 | Setup Prisma + Supabase | `backend/prisma/schema.prisma`, `.env.example` |

**Verificación:** `pnpm install` funciona, `pnpm dev` corre frontend y backend

---

### Fase 1: Autenticación (Depende: Fase 0)
**Objetivo:** Sistema de login/registro completo

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T5 | Schema Prisma - Users + Sessions | `backend/prisma/schema.prisma` |
| T6 | BetterAuth + endpoints auth | `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts` |
| T7 | Frontend auth (login/register) | `frontend/src/pages/auth/Login.tsx`, `Register.tsx`, `stores/auth-store.ts` |
| T8 | Mobile auth (login/register) | `mobile/src/screens/Login.tsx`, `Register.tsx` |

**Verificación:** Login/register funciona en web y móvil, tokens se manejan correctamente

---

### Fase 2: Core Editor (Depende: Fase 1)
**Objetivo:** Editor de documentos funcional con capítulos y subpáginas

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T9 | Schema Prisma - Documents/Projects/Folders | `backend/prisma/schema.prisma` |
| T10 | API CRUD documentos y proyectos | `backend/src/routes/documents.ts`, `projects.ts` |
| T11 | TipTap editor setup | `frontend/src/components/editor/DocumentEditor.tsx`, `Toolbar.tsx` |
| T12 | Capítulos y subpáginas | `frontend/src/components/editor/ChapterTree.tsx` |
| T13 | Sidebar + navegación | `frontend/src/components/sidebar/Sidebar.tsx`, `ProjectTree.tsx` |
| T14 | Guardado automático | `frontend/src/hooks/useAutoSave.ts` |
| T15 | Mobile editor (WebView) | `mobile/src/screens/Editor.tsx` |

**Verificación:** Crear/editar documentos funciona, capítulos y subpáginas operativas

---

### Fase 3: Notas y Versionado (Depende: Fase 2)
**Objetivo:** Sistema de notas y versionado tipo Git

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T16 | Schema Prisma - Notes | `backend/prisma/schema.prisma` |
| T17 | API CRUD notas | `backend/src/routes/notes.ts` |
| T18 | UI notas (crear/editar/colapsar) | `frontend/src/components/editor/NotesPanel.tsx` |
| T19 | Versionado Git (ramas/fusiones) | `backend/src/lib/git-service.ts`, `backend/src/routes/branches.ts` |
| T20 | UI gestión de ramas | `frontend/src/components/branches/BranchManager.tsx` |
| T21 | Historial de cambios | `frontend/src/components/branches/History.tsx` |

**Verificación:** Notas funcionan por documento/rama/subpágina, versionado crea/fusiona ramas

---

### Fase 4: Modo de Creación (Depende: Fase 2)
**Objetivo:** Wizard de creación de historias (directo + guiado)

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T22 | Modo directo (crear documento rápido) | `frontend/src/components/story-setup/DirectMode.tsx` |
| T23 | Wizard modo guiado (preguntas AO3) | `frontend/src/components/story-setup/GuidedMode.tsx` |
| T24 | Preguntas de estructura (4 partes) | `frontend/src/components/story-setup/StructureQuestions.tsx` |
| T25 | Autocompletado IA en wizard | `backend/src/services/ai-service.ts` |

**Verificación:** Crear historia en modo directo y guiado funciona, wizard genera estructura

---

### Fase 5: Personajes (Depende: Fase 2)
**Objetivo:** Sistema completo de gestión de personajes

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T26 | Schema Prisma - Characters + Attributes | `backend/prisma/schema.prisma` |
| T27 | API CRUD personajes | `backend/src/routes/characters.ts` |
| T28 | Formulario completo de personaje | `frontend/src/components/characters/CharacterForm.tsx` |
| T29 | Fichas de personajes (cards) | `frontend/src/components/characters/CharacterCard.tsx` |
| T30 | Árbol genealógico | `frontend/src/components/characters/FamilyTree.tsx` |
| T31 | Evolución de personajes | `frontend/src/components/characters/CharacterEvolution.tsx` |
| T32 | Filtros por atributos | `frontend/src/components/characters/CharacterFilters.tsx` |
| T33 | IA autocompletado personajes | `backend/src/services/ai-service.ts` |

**Verificación:** CRUD personajes completo, árbol genealógico funciona, evolución crea versiones

---

### Fase 6: Timeline y Relaciones (Depende: Fase 5)
**Objetivo:** Línea del tiempo y mapa de relaciones visual

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T34 | Schema Prisma - Timeline Events | `backend/prisma/schema.prisma` |
| T35 | API CRUD timeline | `backend/src/routes/timeline.ts` |
| T36 | UI línea del tiempo | `frontend/src/components/timeline/Timeline.tsx` |
| T37 | Mapa de relaciones (React Flow) | `frontend/src/components/relations/RelationsMap.tsx` |
| T38 | Nodos personalizados (personajes) | `frontend/src/components/relations/CharacterNode.tsx` |
| T39 | Filtros por tipo de relación | `frontend/src/components/relations/RelationFilters.tsx` |

**Verificación:** Timeline muestra eventos, mapa de relaciones con nodos y conexiones funcionales

---

### Fase 7: Lore y Worldbuilding (Depende: Fase 2)
**Objetivo:** Sistema de lore, razas, glosario, criaturas, mapa mundial

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T40 | Schema Prisma - Lore, Races, Glossary, Creatures, Locations | `backend/prisma/schema.prisma` |
| T41 | API CRUD lore/razas/glosario/criaturas | `backend/src/routes/lore.ts`, `races.ts`, `glossary.ts`, `creatures.ts` |
| T42 | UI Lore (formularios + listas) | `frontend/src/components/lore/LoreEditor.tsx` |
| T43 | UI Razas/Pueblos | `frontend/src/components/lore/RacesEditor.tsx` |
| T44 | UI Glosario | `frontend/src/components/lore/GlossaryEditor.tsx` |
| T45 | UI Bestias/Criaturas | `frontend/src/components/lore/CreaturesEditor.tsx` |
| T46 | Mapa mundial (React Flow) | `frontend/src/components/worldmap/WorldMap.tsx` |
| T47 | OCR para PDFs escaneados (Tesseract.js) | `backend/src/services/ocr-service.ts` |
| T48 | Upload + procesamiento de PDFs/imágenes | `backend/src/routes/ocr.ts` |

**Verificación:** CRUD lore/razas/glosario funciona, mapa mundial con nodos, OCR extrae texto de PDFs

---

### Fase 8: Estructura y Subtramas (Depende: Fase 2)
**Objetivo:** Tablero tipo Trello y gestión de subtramas

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T49 | Schema Prisma - StructureBoard, Columns, Cards | `backend/prisma/schema.prisma` |
| T50 | API CRUD estructura | `backend/src/routes/structure.ts` |
| T51 | Tablero drag & drop | `frontend/src/components/structure/StructureBoard.tsx` |
| T52 | Schema Prisma - Subplots | `backend/prisma/schema.prisma` |
| T53 | API CRUD subtramas | `backend/src/routes/subplots.ts` |
| T54 | UI subtramas | `frontend/src/components/subplots/SubplotEditor.tsx` |
| T55 | IA sugerencias subtramas | `backend/src/services/ai-service.ts` |

**Verificación:** Tablero con columnas y tarjetas drag & drop, subtramas CRUD funciona

---

### Fase 9: Integración IA (Depende: Fase 2, Fase 5)
**Objetivo:** Modos de IA (Chat, Character.AI, Sugerencias)

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T56 | AI Client (DeepSeek/MiMo) | `backend/src/lib/ai-client.ts` |
| T57 | RAG Service (contexto de historia) | `backend/src/lib/rag-service.ts` |
| T58 | API endpoints IA | `backend/src/routes/ai.ts` |
| T59 | Modo Chat (companion) | `frontend/src/components/ai/ChatPanel.tsx` |
| T60 | Modo Character.AI (solo texto) | `frontend/src/components/ai/CharacterChat.tsx` |
| T61 | Modo Sugerencias (inconsistencias) | `frontend/src/components/ai/SuggestionsPanel.tsx` |
| T62 | Bloqueo de escritura por IA | `backend/src/services/ai-guard.ts` |

**Verificación:** Chat IA funciona, Character.AI en modo texto, sugerencias detectan inconsistencias

---

### Fase 10: Estadísticas (Depende: Fase 2)
**Objetivo:** Estadísticas de escritura estilo GitHub

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T63 | Schema Prisma - WritingStats | `backend/prisma/schema.prisma` |
| T64 | API estadísticas | `backend/src/routes/stats.ts` |
| T65 | Dashboard estadísticas | `frontend/src/components/stats/StatsDashboard.tsx` |
| T66 | GitHub-style contribution graph | `frontend/src/components/stats/ContributionGraph.tsx` |
| T67 | Frases motivacionales | `frontend/src/components/stats/MotivationalQuotes.tsx` |

**Verificación:** Estadísticas muestran palabras/día, racha, contribuciones por día

---

### Fase 11: Exportación y AO3 (Depende: Fase 2)
**Objetivo:** Exportar documentos y publicar en AO3

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T68 | Exportación PDF | `backend/src/services/export-service.ts` |
| T69 | Exportación Markdown | `backend/src/services/export-service.ts` |
| T70 | Exportación HTML (con CSS) | `backend/src/services/export-service.ts` |
| T71 | Editor visual HTML/AO3 | `frontend/src/components/export/AO3Editor.tsx` |
| T72 | AO3 Web Scraping (Puppeteer) | `backend/src/services/ao3-service.ts` |
| T73 | Endpoint AO3 (login + publicar) | `backend/src/routes/ao3.ts` |
| T74 | UI exportación | `frontend/src/components/export/ExportPanel.tsx` |

**Verificación:** PDF/MD/HTML se exportan, AO3 scraping funciona sin almacenar credenciales

---

### Fase 12: Etiquetas y Compartir (Depende: Fase 2)
**Objetivo:** Sistema de etiquetas AO3 y beta readers

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T75 | Schema Prisma - Tags, SharedDocuments | `backend/prisma/schema.prisma` |
| T76 | API etiquetas | `backend/src/routes/tags.ts` |
| T77 | API compartir documentos | `backend/src/routes/sharing.ts` |
| T78 | UI etiquetas (AO3 style) | `frontend/src/components/tags/TagManager.tsx` |
| T79 | IA sugerencia de etiquetas | `backend/src/services/ai-service.ts` |
| T80 | Link compartible + comentarios | `frontend/src/pages/SharedDocument.tsx` |

**Verificación:** Etiquetas CRUD funciona, compartir por link genera URL única, comentarios funcionan

---

### Fase 13: Pasarela de Pago (Depende: Fase 1)
**Objetivo:** Sistema de suscripciones con Stripe

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T81 | Stripe integration | `backend/src/lib/stripe.ts` |
| T82 | API suscripciones | `backend/src/routes/subscriptions.ts` |
| T83 | API webhooks Stripe | `backend/src/routes/webhooks.ts` |
| T84 | UI planes y precios | `frontend/src/pages/Pricing.tsx` |
| T85 | Gestión de suscripción | `frontend/src/components/payment/SubscriptionManager.tsx` |
| T86 | Pay-as-you-go tokens | `backend/src/services/token-service.ts` |
| T87 | Límites por tier | `backend/src/middleware/tier-check.ts` |

**Verificación:** Checkout funciona, webhooks procesan pagos, límites por tier se respetan

---

### Fase 14: App Móvil (Depende: Fase 1-13)
**Objetivo:** App móvil completa con todas las features

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T88 | Setup Expo + React Native | `mobile/package.json`, `app.json` |
| T89 | Navegación (React Navigation) | `mobile/src/navigation/AppNavigator.tsx` |
| T90 | Screens principales | `mobile/src/screens/` |
| T91 | Editor móvil (WebView TipTap) | `mobile/src/screens/Editor.tsx` |
| T92 | Personajes móvil | `mobile/src/screens/Characters.tsx` |
| T93 | Timeline móvil | `mobile/src/screens/Timeline.tsx` |
| T94 | Lore/Worldbuilding móvil | `mobile/src/screens/Lore.tsx` |
| T95 | IA Chat móvil | `mobile/src/screens/AIChat.tsx` |
| T96 | Configuración y cuenta | `mobile/src/screens/Settings.tsx` |

**Verificación:** App móvil funciona en iOS y Android, todas las features core operativas

---

### Fase 15: Polish y Optimización (Depende: Todas las fases)
**Objetivo:** Optimización, responsive, error handling, tests

| Tarea | Descripción | Archivos |
|-------|-------------|----------|
| T97 | Responsive design (320px+) | Todos los componentes |
| T98 | Loading states + skeletons | `frontend/src/components/ui/Skeleton.tsx` |
| T99 | Error boundaries | `frontend/src/components/ui/ErrorBoundary.tsx` |
| T100 | Tests unitarios (70% cobertura) | `frontend/src/**/*.test.tsx`, `backend/src/**/*.test.ts` |
| T101 | Tests integración | `backend/src/**/*.test.ts` |
| T102 | Performance optimization | `frontend/vite.config.ts` (code splitting) |
| T103 | Modo oscuro/claro | `frontend/src/stores/theme-store.ts` |
| T104 | SEO + meta tags | `frontend/index.html` |

**Verificación:** Lighthouse > 90, tests pasan, responsive en todos los breakpoints

---

## Dependencias entre Fases

```
Fase 0 (Fundación)
    ↓
Fase 1 (Auth)
    ↓
Fase 2 (Core Editor) ←─────────────────────────────────────┐
    ↓                                                        │
    ├── Fase 3 (Notas + Versionado)                         │
    ├── Fase 4 (Modo Creación)                              │
    ├── Fase 5 (Personajes)                                 │
    │       ↓                                               │
    │       └── Fase 6 (Timeline + Relaciones)              │
    ├── Fase 7 (Lore + Worldbuilding)                       │
    ├── Fase 8 (Estructura + Subtramas)                     │
    ├── Fase 9 (IA) ←── depends on Fase 5                  │
    ├── Fase 10 (Estadísticas)                              │
    ├── Fase 11 (Exportación + AO3)                         │
    ├── Fase 12 (Etiquetas + Compartir)                     │
    └── Fase 13 (Pagos) ←── depends on Fase 1               │
                                                            │
Fase 14 (App Móvil) ←── depends on Fase 1-13 ──────────────┘
    ↓
Fase 15 (Polish)
```

---

## Riesgos y Mitigaciones

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| TipTap muy complejo para MVP | Alto | Empezar con extensiones básicas, iterar |
| BetterAuth + Supabase conflictos | Medio | Investigar compatibilidad antes de T6 |
| API keys de IA expuestas | Alto | Nunca exponer al frontend, siempre via backend |
| Performance del editor | Medio | Lazy loading, debounce en guardado |
| OCR precisión baja | Medio | Pre-procesamiento de imágenes, fallback a input manual |
| AO3 scraping bloqueado | Medio | Ofrecer copiar/pegar como alternativa |
| React Native + WebView limitaciones | Medio | Priorizar features nativas, WebView solo para editor |

---

## Decisiones Técnicas Clave

1. **pnpm workspaces** para monorepo
2. **REST API** (no GraphQL) para simplicidad
3. **Zustand** para estado global
4. **TipTap** para editor (extensible)
5. **React Flow** para diagramas
6. **Prisma** como ORM (type-safe)
7. **Vitest** para tests
8. **Tesseract.js** para OCR (JavaScript nativo, sin Python)
9. **Puppeteer** para AO3 scraping
10. **React Native/Expo** para móvil (independiente del web)

---

## Siguientes Pasos

1. ✅ Spec aprobado con respuestas
2. ✅ Plan creado
3. → Crear lista de tareas detallada en `tasks/todo.md`
4. → Ejecutar Fase 0 (fundación)

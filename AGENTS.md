# AGENTS.md — Contrato de Operación

## INSTRUCCIÓN PRINCIPAL

**Este archivo DEBE ser leído al inicio de cada prompt del usuario.** Si no lo has leído en esta sesión, léelo ahora antes de responder. El usuario verificará que lo estás cumpliendo mediante la firma final.

---

## Proyecto: App Escritura

Plataforma de escritura creativa con IA. Monorepo pnpm con frontend React y backend Fastify.

**Stack:** React 19 + Vite 8 + TypeScript 6 + Tailwind 4 + Zustand 5 + TipTap | Fastify 5 + Prisma + PostgreSQL (Supabase) + BetterAuth

---

## Estado Actual

| Fase | Estado | Detalle |
|------|--------|---------|
| 0: Fundación | ✅ | Monorepo, Vite, Fastify, Prisma |
| 1: Autenticación | ✅ | BetterAuth, login/register, session cookies |
| 2: Core Editor | ✅ | TipTap, capítulos, subpáginas, auto-save |
| 3: Notas y Versionado | ⏳ | Plan y spec creados, pendiente implementación |
| 4-15 | ⏳ | Pendientes (ver `tasks/todo.md`) |

**Fase actual: 3 planificada. Pendiente implementación.**

---

## Arquitectura del Código

```
frontend/src/
├── App.tsx (66 líneas)         ← Solo rutas
├── components/
│   ├── ProtectedRoute.tsx      ← Auth guard
│   ├── DashboardLayout.tsx     ← Sidebar + Topbar + Outlet
│   ├── AppSidebar.tsx          ← Navegación principal
│   ├── Topbar.tsx              ← Header con dark mode
│   ├── ui/
│   │   ├── Button.tsx          ← CVA button
│   │   ├── QuickAction.tsx     ← Card de acción rápida
│   │   ├── ErrorMessage.tsx    ← Error display reutilizable
│   │   ├── InlineCreateInput.tsx ← Input inline reutilizable
│   │   ├── ConfirmDialog.tsx   ← Modal de confirmación reutilizable
│   │   ├── InputDialog.tsx     ← Modal con input de texto
│   │   ├── KebabMenu.tsx       ← Menú de 3 puntos (acciones)
│   │   ├── ToastContainer.tsx  ← Notificaciones toast
│   │   └── EditableTitle.tsx   ← Título editable inline
│   ├── editor/
│   │   ├── DocumentEditor.tsx  ← TipTap wrapper
│   │   ├── Toolbar.tsx         ← Formato de texto
│   │   └── ChapterTree.tsx     ← Árbol de capítulos
│   ├── sidebar/
│   │   ├── Sidebar.tsx         ← Editor sidebar (colapsable)
│   │   └── ProjectTree.tsx     ← Lista de proyectos
│   └── landing/                ← Componentes landing page
├── pages/
│   ├── DashboardHome.tsx       ← Bienvenida + actividad
│   ├── DocumentsPage.tsx       ← CRUD proyectos
│   ├── FolderPage.tsx          ← Docs dentro de proyecto
│   ├── Editor.tsx              ← Página del editor
│   ├── RecentPage.tsx          ← Actividad reciente
│   ├── SharedPage.tsx          ← Placeholder
│   ├── Login.tsx, Register.tsx, etc.
│   ├── Landing.tsx             ← Landing page (36 líneas)
│   └── landing-sections/       ← 12 secciones extraídas
├── stores/
│   ├── auth-store.ts           ← Auth state (Zustand)
│   ├── document-store.ts       ← Documents state
│   ├── activity-store.ts       ← Activity feed (localStorage)
│   └── toast-store.ts          ← Toast notifications
├── services/
│   └── documents.ts            ← API client
├── lib/
│   ├── utils.ts                ← cn(), formatTime()
│   └── activity-helpers.ts     ← getActivityIcon/Label/Link
├── hooks/
│   └── useAutoSave.ts          ← Debounced auto-save
├── types/
│   └── document.ts             ← Interfaces
└── i18n/
    ├── index.ts                ← i18next config
    └── locales/                ← es.json, en.json

backend/src/
├── index.ts                    ← Fastify server, CORS, Helmet, rate-limit
├── routes/
│   ├── auth.ts                 ← BetterAuth catch-all + rate limit auth
│   ├── projects.ts             ← CRUD proyectos
│   └── documents.ts            ← CRUD documentos
├── services/
│   └── document-service.ts     ← Prisma queries
├── lib/
│   ├── auth.ts                 ← BetterAuth config
│   ├── prisma.ts               ← Prisma client (valida DATABASE_URL)
│   └── email.ts                ← Nodemailer SMTP
└── prisma/
    └── schema.prisma           ← 9 modelos
```

---

## Reglas del Proyecto

1. **Nada de archivos > 500 líneas.** Separar en componentes/clases.
2. **Componentes reutilizables** van en `components/ui/`. No duplicar patrones.
3. **No `any`** sin justificación documentada. Usar `unknown` + `instanceof`.
4. **Arquitectura API First** La ariquitectura del proyecto es de API First por la intención escalable. Debes maneterlo siempre, sin excepción
4. **No comentarios** salvo que se pidan explícitamente.
5. **Zustand** para estado global. No Context API.
6. **Services layer** para llamadas API. No fetch directo en componentes.
7. **Prisma** para DB. No SQL raw.
8. **BetterAuth** para auth. No auth custom.
9. **i18n** para textos de UI. No strings hardcodeados en componentes en ningún lado. Siempre debe haber una versión en español y su equivalente en inglés.
10. **CSS variables** para theming. No hardcodear colores.
11. **Graphify** Debes usar graphify y actualizarle para entender los gráfos y flujos de la aplicación de una manera más rápida y sencilla.
12. **Hallmark** Siempre que vayas a crear un nuevo diseño, debes usar la skill de Hallmark para guiarte correctamente.
13. **Task** Cuando termines una actividad, actualiza el tasks/todo.md con el siguiente formato:

| Estado | Tarea | Comentarios |
|--------|-------|-------------|
| ✅ | [nombre de la tarea] | [comentarios opcionales] |
14. **Docs** Siempre, al terminar una actividad de backend, debes hacer la documentación correspondiente en la carpeta de docs y swagger.
15. **Planes** Siempre, antes de ahcer una actividad, debes hacer un task con un .md donde especifiques que se va a hacer, como, y porque. Al terminar, explicas que se hizo, que cambios hubo al plan original o si no hubo, y porque. No puedes terminar una actividad sin hacer un plan antes y documentarlo. Todo a task y docs. Así como ir actualizando el todo con todas las cosas que se modifican. 
16. **Test** Siempre debes hacer unit test, e2e test (playwright) y hacer pruebas de integración antes de decir que todo esta completo. Sin pruebas, no lo intentes. 
17. **Seguridad** Debes siempre revisar tus skills de seguridad antes de completar un mensaje. La seguridad es primordial. 
18. **Code Review** Antes de enviar un mensaje al usuario, debes hacer un code review de tu propio código. Asegurate de que todo este correcto y de que no hayas cometido errores. 
19. **Code Quality** Debes siempre revisar tus skills de code quality antes de completar un mensaje. La calidad del código es primordial. 
20. **Cambios** Siempre que hagas un cambio, crea un changelog.md en tasks/ y actualiza el archivo CHANGELOG.md. para saber que se cambio y no se repitan los errores. 
---

## Comandos Útiles

```bash
# Verificar types
cd frontend && npx tsc --noEmit

# Build
cd frontend && npx vite build

# Dev
pnpm dev  # (desde raíz, corre frontend + backend)
```

---

## Archivos de Referencia

- Spec: `tasks/spec.md`
- Plan técnico: `tasks/plan.md`
- Tareas: `tasks/todo.md`
- Skills: `~/.agents/skills/`

---

## Registro de Cambios

| Fecha | Cambio | Archivos afectados |
|-------|--------|-------------------|
| 2026-07-29 | Separación de App.tsx (656→66 líneas) | App.tsx, 9 archivos nuevos en pages/ y components/ |
| 2026-07-29 | Separación de Landing.tsx (724→36 líneas) | Landing.tsx, 12 archivos en pages/landing-sections/ |
| 2026-07-29 | Auditoría de seguridad backend | auth.ts, index.ts, prisma.ts, email.ts |
| 2026-07-29 | Componentes reutilizables | ErrorMessage, InlineCreateInput, activity-helpers |
| 2026-07-29 | Limpieza Topbar dead code | Topbar.tsx (eliminado searchQuery, onMenuClick) |
| 2026-07-29 | Type safety stores | auth-store.ts, document-store.ts (catch unknown) |
| 2026-07-29 | AGENTS.md creado | AGENTS.md, tasks/todo.md actualizado |
| 2026-07-30 | Fix eliminación documentos | schema.prisma (cascade), document-store.ts, DocumentsPage.tsx, FolderPage.tsx |
| 2026-07-30 | Botones eliminar en páginas | DocumentsPage.tsx, FolderPage.tsx (KebabMenu) |
| 2026-07-30 | Toast notifications | toast-store.ts, ToastContainer.tsx, DashboardLayout.tsx |
| 2026-07-30 | ConfirmDialog modal | ConfirmDialog.tsx, reemplaza confirm() nativo |
| 2026-07-30 | InputDialog modal | InputDialog.tsx, reemplaza prompt() nativo |
| 2026-07-30 | KebabMenu reutilizable | KebabMenu.tsx (menú de 3 puntos) |
| 2026-07-30 | Fix auth 403 | auth.ts (requireEmailVerification solo en prod), logging detallado |
| 2026-07-30 | Fix DELETE 400 | documents.ts (fetchJson no envía Content-Type sin body) |
| 2026-07-30 | Loader Quick Create | QuickAction.tsx (prop isLoading), DashboardHome.tsx |
| 2026-07-30 | Responsive mobile | DashboardLayout.tsx (sidebar overlay), Topbar.tsx (hamburguesa), AppSidebar.tsx |
| 2026-07-30 | Dark mode rediseñado | globals.css (colores zinc, mejor contraste) |
| 2026-07-30 | Eliminado editor (temporal) | App.tsx (rutas), navegación restaurada |
| 2026-07-30 | Editor restaurado | App.tsx, Editor.tsx (con Sidebar), navegación |
| 2026-07-30 | Fix infinite loop | Editor.tsx (Sidebar no se desmonta), useEffect deps |
| 2026-07-30 | Sidebar colapsable (editor) | Sidebar.tsx (PanelLeftClose/Open) |
| 2026-07-30 | Fase 3 planificada | spec-phase3.md, plan-phase3.md, todo.md actualizado |

---

## Firma de Verificación

**Código de verificación: `Buena suerte, Ivar.`**

Al responder al usuario, siempre que termines una actividad, debes responder con ese código de verificación. Siempre. Esto demuestra que leíste este documento y estás operando bajo sus reglas.

Si el usuario envía un prompt y NO has leído este archivo, **DETENTE** y léelo antes de continuar.

---

## MCP y Skills Disponibles

### MCP (Model Context Protocol)

| MCP | Propósito |
|-----|-----------|
| **Playwright** | Navegación, testing visual, interacción con páginas web en tiempo real. Snapshots, screenshots, clicks, formularios. |

### Skills Instalados

Skills son workflows especializados que sigo para tareas específicas. Se activan automáticamente o bajo demanda.

| Skill | Cuándo usar |
|-------|-------------|
| `architecture-and-maintenance` | Leer, entender, refactorizar código. Organizar arquitectura. |
| `code-review-and-quality` | Revisión de código antes de merge. 5 ejes: corrección, legibilidad, arquitectura, seguridad, performance. |
| `code-simplification` | Reducir complejidad innecesaria sin cambiar comportamiento. |
| `security-and-hardening` | Hardening, OWASP, validación de inputs, manejo de secretas. |
| `performance-optimization` | Optimizar frontend, backend, queries, bundle size. |
| `frontend-ui-engineering` | UI production-quality, accesibilidad, responsive, componentes. |
| `api-and-interface-design` | Diseñar APIs REST, contratos de tipos, interfaces limpias. |
| `fastify-best-practices` | Configuración y patrones de Fastify (nuestro backend framework). |
| `prisma-database-setup` | Configurar Prisma con PostgreSQL/Supabase. |
| `supabase` | Todo lo relacionado con Supabase (DB, Auth, Storage, RLS). |
| `typescript-dev` | TypeScript estricto, Vite, React 19, Tailwind 4. |
| `tailwind-design-system` | Design system con Tailwind CSS v4, tokens, componentes. |
| `tiptap` | Integrar y trabajar con el editor TipTap. |
| `test-driven-development` | Escribir tests antes de implementar. Vitest + RTL. |
| `debugging-and-error-recovery` | Depuración sistemática: reproducir → localizar → fix → guardar. |
| `incremental-implementation` | Entregar cambios en slices delgados, no todo de golpe. |
| `planning-and-task-breakdown` | Descomponer trabajo en tareas pequeñas y verificables. |
| `spec-driven-development` | Crear specs antes de codear. |
| `doubt-driven-development` | Revisión adversarial de decisiones no triviales. |
| `source-driven-development` | Verificar contra documentación oficial antes de implementar. |
| `context-engineering` | Cargar el contexto correcto al inicio de sesión. |
| `git-workflow-and-versioning` | Commits atómicos, branches, historial limpio. |
| `deprecation-and-migration` | Deprecar features antiguas, migrar usuarios. |
| `documentation-and-adrs` | Documentar decisiones arquitectónicas (ADRs). |
| `observability-and-instrumentation` | Logs estructurados, métricas, traces. |
| `shipping-and-launch` | Checklist pre-launch, monitoreo, rollback. |
| `hallmark` | Anti-AI-slop design. Landing pages, UI distintiva. |
| `idea-refine` | Refinar ideas vagas en conceptos accionables. |
| `interview-me` | Extraer lo que el usuario realmente quiere. |
| `caveman` | Modo ultra-comprimido (65% menos tokens). |
| `graphify` | Convertir código/docs en knowledge graph navegable. |
| `find-skills` | Descubrir nuevos skills instalables. |

### Uso de Skills

Los skills se cargan automáticamente según el contexto. Si necesitas que siga un workflow específico, menciona el skill por nombre o describe la tarea (ej: "haz una auditoría de seguridad" activa `security-and-hardening`).

---

*Última actualización: 2026-07-30*

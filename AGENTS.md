# AGENTS.md — Contrato de Operación

## INSTRUCCIÓN PRINCIPAL

**Este archivo DEBE ser leído al inicio de cada prompt del usuario.** Si no lo has leído en esta sesión, léelo ahora antes de responder. El usuario verificará que lo estás cumpliendo mediante la firma final.

---

## Proyecto: Archivum

Plataforma de escritura creativa con IA. Monorepo pnpm con frontend React y backend Fastify.

**Stack:** React 19 + Vite 8 + TypeScript 6 + Tailwind 4 + Zustand 5 + TipTap | Fastify 5 + Prisma + PostgreSQL (Supabase) + BetterAuth

---

## Estado Actual

| Fase | Estado | Detalle |
|------|--------|---------|
| 0: Fundación | ✅ | Monorepo, Vite, Fastify, Prisma |
| 1: Autenticación | ✅ | BetterAuth, login/register, session cookies |
| 2: Core Editor | ✅ | TipTap, capítulos, subpáginas, auto-save |
| 3: Notas y Versionado | ✅ | CRUD notas, versiones con restore, máx 50 |
| 4-15 | ⏳ | Pendientes (ver `tasks/todo.md`) |

**Fase actual: 3 completada. Siguiente: 4 (Modo de Creación).**

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
│   │   ├── ChapterTree.tsx     ← Árbol de capítulos
│   │   ├── PostItWall.tsx      ← Pared de post-its (M15)
│   │   └── VersionsPanel.tsx   ← Panel de versiones en el editor (M13→M15)
│   ├── notes/                  ← NoteCard, NotesList (Fase 3) + PostIt, PostItWall (M15)
│   ├── versions/               ← VersionCard, VersionsList (Fase 3)
│   ├── sidebar/
│   │   └── Sidebar.tsx         ← Editor sidebar (solo Contenido, M18)
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
│   ├── documents.ts            ← API client (proyectos, documentos, notas, versiones)
│   └── auth.ts                 ← API client auth
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
│   ├── documents.ts            ← CRUD documentos
│   ├── notes.ts                ← CRUD notas (Fase 3)
│   └── versions.ts             ← Versionado: listar/crear/obtener/restaurar (Fase 3)
├── services/
│   ├── document-service.ts     ← Prisma queries (proyectos + documentos)
│   ├── note-service.ts         ← CRUD notas con ownership, ámbito documento/proyecto, isHidden (Fase 3 + M15)
│   └── version-service.ts      ← Snapshots, límite 50 FIFO, restore (Fase 3)
├── lib/
│   ├── auth.ts                 ← BetterAuth config
│   ├── prisma.ts               ← Prisma client (valida DATABASE_URL)
│   ├── email.ts                ← Nodemailer SMTP
│   └── session.ts              ← getSessionUser compartido (Fase 3)
└── prisma/
    └── schema.prisma           ← 11 modelos (User, Session, Account, Verification, Project, Folder, Document, Note, DocumentVersion, Character, World, Diagram)
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
11. **Graphify** Debes usar graphify y actualizarle para entender los gráfos y flujos de la aplicación de una manera más rápida y sencilla. Siempre que vayas a buscar algo para "entender como funciona el flujo de..." ve a consultar graphify antes que hacerlo por tu cuenta.
12. **Hallmark** Siempre que vayas a crear un nuevo diseño, debes usar la skill de Hallmark para guiarte correctamente.
13. **Task** Cuando termines una actividad, actualiza el `todo.md` de la carpeta correspondiente (`tasks/fase-XX-*/todo.md` o `tasks/mantenimiento/mXX-*/`) con el siguiente formato:

| Estado | Tarea | Comentarios |
|--------|-------|-------------|
| ✅ | [nombre de la tarea] | [comentarios opcionales] |
14. **Docs** Siempre, al terminar una actividad de backend, debes hacer la documentación correspondiente en la carpeta de docs y swagger.
15. **Planes** Siempre, antes de ahcer una actividad, debes hacer un task con un .md donde especifiques que se va a hacer, como, y porque. Al terminar, explicas que se hizo, que cambios hubo al plan original o si no hubo, y porque. No puedes terminar una actividad sin hacer un plan antes y documentarlo. Todo a task y docs. Así como ir actualizando el todo con todas las cosas que se modifican. 
16. **Test** Siempre debes hacer unit test, e2e test (playwright) y hacer pruebas de integración antes de decir que todo esta completo. Sin pruebas, no lo intentes. 
17. **Seguridad** Debes siempre revisar tus skills de seguridad antes de completar un mensaje. La seguridad es primordial. 
18. **Code Review** Antes de enviar un mensaje al usuario, debes hacer un code review de tu propio código. Asegurate de que todo este correcto y de que no hayas cometido errores. 
19. **Code Quality** Debes siempre revisar tus skills de code quality antes de completar un mensaje. La calidad del código es primordial. 
20. **Cambios** Siempre que hagas un cambio, actualiza el `changelog.md` de la carpeta correspondiente (fase o mantenimiento) y el índice global `tasks/CHANGELOG.md`, para saber que se cambio y no se repitan los errores. 
21. **Estructura de tasks/** Los documentos de planificación viven por carpeta: `tasks/fase-XX-*/` (spec.md, plan.md, todo.md, changelog.md) y `tasks/mantenimiento/mXX-*/` (plan.md, changelog.md). Los archivos raíz de `tasks/` son solo índices globales. Ver `tasks/README.md`.
22. **Localstorage** Jamás uses localstorage. Usa Zustand con persistencia de datos en el backend. Para nada, en ningún concepto, debe usarse localstorage.
23. **Ambiguedad** Prefiero que me preguntes y uses la skill de entrevista, todas tus dudas, antes de que empieces a sobrepensar. Ahorrar tokens debe ser vital. Cualquier duda que tengas, debes preguntarme a mi. 
24. **Orden** Las paginas se deben agrupar en carpetas por sus funciones y que se relacione con su nombre. Por ejemplo: Si es una pagina de login, debe estar en una carpeta que se llame login. Si es una pagina de registro, debe estar en una carpeta que se llame register.

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

- Índice global de specs: `tasks/spec.md` (detalle en cada `tasks/fase-XX-*/spec.md`)
- Índice global de planes: `tasks/plan.md` (detalle en cada `tasks/fase-XX-*/plan.md`)
- Índice global de tareas: `tasks/todo.md` (detalle en cada `tasks/fase-XX-*/todo.md`)
- Índice global de cambios: `tasks/CHANGELOG.md` (detalle en cada carpeta)
- Estructura de tasks: `tasks/README.md`
- Skills: `~/.agents/skills/`

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

*Última actualización: 2026-07-31*

# CHANGELOG

Todos los cambios notables de este proyecto se documentan en este archivo. El detalle histórico completo está en `tasks/CHANGELOG.md`.

## 2026-07-31

### Simplificación: Sidebar del editor solo con "Contenido" (M18)

- La sidebar del editor queda con un único apartado: "Contenido" (árbol de capítulos/subpáginas).
- Eliminada la lista de proyectos del editor (la navegación sigue por la sidebar global). `ProjectTree.tsx` removido (dead code).
- Tests: frontend 66/66, E2E verificado.

### Fix: Loader al crear documento + bloqueo doble Enter (M17)

- Al dar Enter para crear (documento, nota, capítulo o proyecto), el input se deshabilita con un spinner mientras se crea y los Enter adicionales se ignoran — **ya no se crean duplicados**.
- Tests: frontend 66/66, E2E verificado (3 Enter → 1 documento).

### Fix: Actividad reciente vacía (M16)

- La página Recientes mostraba "No hay actividad reciente" porque el rename a "Archivum" cambió la clave del localStorage sin migrar los datos existentes.
- `loadActivities()` ahora migra automáticamente desde la clave legacy. Tests: 6 nuevos.

### Feature: Post-its en el editor — notas generales + visibilidad (M15)

- **Pared de post-its** siempre visible en el editor (columna lateral colapsable) con filtros **Todas | Historia | Documento | Ocultas** y badge de notas ocultas.
- **Notas generales de la historia** (nivel proyecto, visibles en todos sus documentos) y **notas por documento/subpágina**; toggle ver/ocultar por post-it y restauración desde el filtro Ocultas.
- Diseño post-it real (tokens amarillo/azul/rosa, tilt, edición inline con auto-save).
- Backend: migración `notes_scope_hidden` (documentId nullable + projectId + isHidden), endpoints nuevos de proyecto.
- Tests: frontend 54/54, backend 23/23, E2E verificado.

### Feature: Rename de la aplicación a "Archivum" (M14)

- Nombre de la app actualizado en toda la UI (sidebar, landing, auth, topbar), i18n, emails, Swagger, README y docs.
- Plan + changelog: `tasks/mantenimiento/m14-rename-archivum/`.

### Docs: Reestructuración de tasks/ por fases

- Documentación de planificación organizada por carpetas: `tasks/fase-XX-*/` (spec.md, plan.md, todo.md, changelog.md por fase) y `tasks/mantenimiento/mXX-*/` (plan + changelog por tarea de mantenimiento).
- Los archivos raíz (`tasks/spec.md`, `plan.md`, `todo.md`, `CHANGELOG.md`) son ahora índices globales con links. Ver `tasks/README.md`.

### Feature: Notas y Versiones dentro del editor (M13)

- Panel lateral en el editor con pestañas Notas/Versiones (botón en el header del documento).
- Notas consultables, editables y eliminables sin salir del editor; versiones visibles y creables desde el editor.
- Tests: frontend 45/45, E2E verificado.

### Feature: Fase 3 — Notas y Versionado (T16-T23)

- **Notas por documento** (post-its colapsables): CRUD completo, auto-save con debounce, pestaña "Notas" en FolderPage con selector de documento.
- **Versionado lineal** (snapshots): crear versión manual, listar, ver contenido de snapshot, restaurar (reescribe el documento), máx. 50 por documento (FIFO).
- Backend: modelos `Note` + `DocumentVersion` (migración aplicada), 8 endpoints nuevos con auth por sesión + Swagger.
- Tests: backend 19/19, frontend 40/40, E2E Playwright completo (notas con persistencia, restore real verificado).

### Feature: Botón "Volver" en el editor (M12)

- Botón "Volver" en el Topbar visible solo en el editor; navega a la carpeta del proyecto (`/app/documents/:projectId`) o al dashboard.
- i18n `common.back` (es/en), test `Topbar.test.tsx` (frontend 27/27), E2E verificado.

### Feature: Editor polish — Sidebar acordeón + Toolbar de formato (M11)

- **Sidebar del editor**: "Mis proyectos" y "Contenido" son ahora acordeones animados (`components/ui/AccordionSection.tsx`, grid-rows 0fr→1fr, aria-expanded/aria-hidden).
- **Toolbar ampliado**: selector de fuente (tokens `var(--font-*)`), alineación (izquierda/centro/derecha/justificar), interlineado, espacio antes/después de párrafo y botón de guión largo (—). Tooltips con i18n.
- **Extensiones TipTap**: `TextAlign`, `TextStyleKit` (fontFamily/lineHeight) y `ParagraphSpacing` custom (extiende Paragraph con `spacingBefore`/`spacingAfter`).
- **i18n**: ~30 claves nuevas en `editorApp.*` (es/en).
- **Tests**: 16 nuevos (frontend 23/23, backend 3/3), typecheck y build limpios, E2E Playwright verificado (formato persiste tras reload, acordeones OK, consola sin errores).

### Fix: Carga de carpetas lenta + flash de "carpeta vacía" (M10)

- `GET /projects/:id` combinado (proyecto + tree en paralelo): ~500ms → ~220ms.
- Cookie cache de sesión BetterAuth (`session.cookieCache.enabled`).
- `LoadingState` reutilizable; `FolderPage`/`Editor` sin flash de vacío.

## 2026-07-30

### Fixes y features

- Eliminación de documentos con cascada Prisma + botones de borrado en páginas.
- Toast notifications, ConfirmDialog, InputDialog, KebabMenu reutilizables.
- Fix auth 403 (`requireEmailVerification` solo en prod), fix DELETE 400, responsive mobile, dark mode rediseñado, editor restaurado con sidebar colapsable.

## 2026-07-29

### Auditoría y refactor

- Separación de `App.tsx` (656→66) y `Landing.tsx` (724→36), componentes reutilizables, auditoría de seguridad backend, type safety, AGENTS.md.

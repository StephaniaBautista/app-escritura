# API Documentation

Documentacion de la API de Archivum.

## Endpoints

### Auth
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesion
- `POST /api/auth/logout` - Cerrar sesion
- `GET /api/auth/session` - Obtener sesion actual
- `POST /api/auth/forgot-password` - Solicitar reset de contrasena
- `POST /api/auth/reset-password` - Restablecer contrasena

### Documents
- `GET /api/documents` - Listar documentos
- `POST /api/documents` - Crear documento
- `GET /api/documents/:id` - Obtener documento
- `PATCH /api/documents/:id` - Actualizar documento
- `DELETE /api/documents/:id` - Eliminar documento
- `POST /api/documents/:id/duplicate` - Duplicar pestaña de documento y subpestañas


### Projects
- `GET /api/projects` - Listar proyectos
- `POST /api/projects` - Crear proyecto
- `GET /api/projects/:id` - Obtener proyecto (endpoint combinado, ver abajo)
- `PATCH /api/projects/:id` - Actualizar proyecto
- `DELETE /api/projects/:id` - Eliminar proyecto

### `GET /api/projects/:id` — Endpoint combinado (2026-07-31)

Devuelve el proyecto **y** su árbol de documentos en un solo round-trip:

```json
{
  "id": "cms97dkzp0000cwsyt3cxdj8v",
  "name": "Novela",
  "folders": [],
  "documents": [],
  "tree": []
}
```

- `tree: DocumentNode[]` — estructura jerárquica (carpetas → documentos → capítulos → subpáginas).
- Cambio **aditivo**: el resto de campos se mantiene; reemplaza a los 2 requests (`GET /projects/:id` + `GET /projects/:id/documents`) que el frontend hacía antes.
- El frontend renderiza el título al instante desde el cache del store y solo espera el `tree` para el contenido.

### Characters
- `GET /api/characters` - Listar personajes
- `POST /api/characters` - Crear personaje
- `GET /api/characters/:id` - Obtener personaje
- `PATCH /api/characters/:id` - Actualizar personaje
- `DELETE /api/characters/:id` - Eliminar personaje

### Notes (2026-07-31, Fase 3 + M15)
- `GET /api/documents/:documentId/notes` - Listar notas de un documento (más reciente primero)
- `POST /api/documents/:documentId/notes` - Crear nota de documento `{ title, content? }`
- `GET /api/projects/:projectId/notes` - Listar notas generales de la historia (proyecto)
- `POST /api/projects/:projectId/notes` - Crear nota general `{ title, content? }`
- `PATCH /api/notes/:id` - Actualizar nota `{ title?, content?, isHidden? }`
- `DELETE /api/notes/:id` - Eliminar nota

Las notas son texto plano (título + contenido). Ambitos (M15): las notas de documento tienen `documentId`; las notas generales de la historia tienen `documentId: null` + `projectId` y son visibles en todos los documentos del proyecto (pared de post-its del editor). `isHidden` controla el toggle ver/ocultar (restaurar = `isHidden: false`). Ownership: todas las operaciones verifican que la nota/documento/proyecto pertenezca a la sesión (404 si no).

### Versions (2026-07-31, Fase 3)
- `GET /api/documents/:documentId/versions` - Listar versiones (snapshots), más reciente primero
- `POST /api/documents/:documentId/versions` - Crear versión (snapshot del título + contenido actual)
- `GET /api/versions/:id` - Obtener versión completa (incluye `content` TipTap JSON)
- `POST /api/versions/:id/restore` - Restaurar versión: reescribe el título y contenido del documento
- `DELETE /api/versions/:id` - Eliminar una versión (snapshot). Si la versión es fuente de una rama (`Branch.sourceVersionId`), el enlace se pone a `null` (`onDelete: SetNull`).

Reglas:
- `version` es auto-incremental por documento (`@@unique([documentId, version])`).
- Límite por tier según `TIER_LIMITS` (FREE: 20, MEDIUM: 50, PRO+: sin límite); al exceder, las más antiguas se eliminan (FIFO).
- `GET /documents/:documentId/versions` no incluye `content` (lista ligera); el contenido completo se obtiene con `GET /versions/:id`.
- `DELETE /versions/:id` requiere ownership: devuelve `404` si la versión no pertenece a la sesión.

### Versions + Branches (2026-08-01, M23)
- `GET /api/branches/:branchId/versions` - Listar versiones de una rama, más reciente primero
- `POST /api/branches/:branchId/versions` - Crear versión (snapshot) dentro de una rama concreta
- `GET /api/documents/:documentId/versions?branchId=...` - Filtrar versiones por rama
- `POST /api/documents/:documentId/versions` - Crear versión; acepta `{ branchId }` en el body (por defecto: main)

Reglas:
- `version` es auto-incremental **por rama** (`@@unique([branchId, version])`).
- El límite de versiones (FIFO) se aplica por rama según tier.
- Si no se envía `branchId`, la versión se crea en la rama `main` (fallback).

### Auto-Version (2026-08-01, M22 — actualizado 2026-08-04, M24)
- `POST /api/auto-version/check/:documentId` - Comprobar y crear snapshot automático según trigger. Body: `{ trigger, lastActivityAt?, branchId? }` (triggers: `inactivity | exit | hourly | daily | weekly | monthly`)
- `PATCH /api/documents/:documentId/activity` - Actualizar `lastActivityAt` (heartbeat del editor)

Reglas:
- Solo crea snapshot si el trigger está habilitado en los settings del usuario y hay cambios desde la última versión.
- `branchId` opcional: si viene, el snapshot se crea en esa rama (la rama activa del editor); si no, en `main`.

### Branches (2026-08-01, M23)
- `GET /api/documents/:documentId/branches` - Listar ramas (main primero por orden alfabético)
- `POST /api/documents/:documentId/branches` - Crear rama `{ name, sourceVersionId? }`
- `GET /api/branches/:branchId` - Obtener rama
- `PATCH /api/branches/:branchId` - Renombrar rama `{ name }` (main no se renombra)
- `DELETE /api/branches/:branchId` - Eliminar rama (main no se elimina)
- `GET /api/documents/:documentId/branches/graph` - Datos del grafo: `{ nodes, edges, branches }` con colores por rama
- `POST /api/branches/:branchId/merge` - Fusionar rama origen en otra

Reglas:
- **main siempre existe**: se crea automáticamente con cada documento (incluye duplicados).
- El merge crea un **merge commit** (versión con dos padres vía `version_parents`) en la rama destino.
- Sin conflictos → `201 { merged: true, version }`.
- Con conflictos → `409 { merged: false, conflicts, mergedContent }`; se debe reenviar con `resolution: { content }` para completar.
- Detección de conflictos: diff por índice de nodos TipTap JSON contra el punto de bifurcación (`sourceVersionId` de la rama origen; fallback: primera versión del documento).
- Mismas ramas → `400 MERGE_FAILED`.

### Story Options (2026-08-04, Fase 4)
- `GET /api/story-options?type=rating|storyType|category|narrator|ending|fandom|tag|problem` - Listar opciones (defaults del sistema + custom del usuario)
- `GET /api/story-options/all` - Listar todas las opciones agrupadas por tipo
- `POST /api/story-options` - Crear opción custom `{ type, value, label }`
- `DELETE /api/story-options/:id` - Eliminar opción custom del usuario (los defaults no se pueden eliminar)

Reglas:
- **Defaults**: `userId=null, isDefault=true`. Seedeados al arrancar el servidor. Compartidos entre todos los usuarios.
- **Custom por usuario**: `userId=X, isDefault=false`. Creadas por el usuario, reutilizables entre proyectos.
- `@@unique([userId, type, value])` evita duplicados por usuario+tipo.

## Autenticacion

Todos los endpoints (excepto auth) requieren sesion. La autenticacion es por cookie (`better-auth.session_token`), no JWT en header.

La sesion se valida contra la DB solo al refrescar (`updateAge`, 1 dia); entre medias la sesion va firmada en la cookie `better-auth.session_data` (cookie cache, maxAge 1 dia) para evitar queries de validacion por request.

## Swagger UI

La documentacion interactiva esta disponible en:

```
http://localhost:3001/docs
```

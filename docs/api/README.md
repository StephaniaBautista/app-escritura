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

### Characters (2026-08-08, Fase 5)
- `GET /api/projects/:projectId/characters` - Listar personajes del proyecto (orden alfabético)
- `POST /api/projects/:projectId/characters` - Crear personaje `{ name, ... }` (todos los campos opcionales salvo `name`)
- `GET /api/characters/:id` - Obtener personaje con sus **evoluciones** (`evolutions[]`)
- `PUT /api/characters/:id` - Actualizar personaje
- `DELETE /api/characters/:id` - Eliminar personaje (limpieza transaccional de `parentIds` huérfanos en otros personajes)
- `POST /api/characters/:id/evolve` - Crear evolución `{ reason, changes? }` (copia con cambios)
- `PUT /api/characters/:id/image` - Subir imagen `{ dataUrl }` (base64, mime `jpeg|png|webp|gif`, máx 3 MB) → Supabase Storage → actualiza `imageUrl` y borra la imagen anterior
- `DELETE /api/characters/:id/image` - Eliminar imagen (storage + campo `imageUrl`)
- `PUT /api/characters/:id/background-images` - Reemplazar fondos de la ficha `{ keepUrls?: string[], dataUrls?: string[] }` (hasta 6 imágenes nuevas, mime `jpeg|png|webp|gif`, máx 3 MB por imagen) → Supabase Storage; las URLs retiradas se eliminan

Campos del personaje:
- Datos: `name`, `description`, `nicknames[]`, `age`, `gender`, `heightCm`, `orientation`, `maritalStatus`, `species`, `birthPlace`, `birthDate`, `isOC`
- Ficha visual: `sheetBackgroundMode` (`default|single|collage`) y `sheetBackgroundImages[]` (hasta 6 URLs HTTPS)
- Rol: `role` (Principal/Secundario/Extra/custom), `roleSpec`
- Familia: `parentIds[]` (los hijos se derivan: personajes cuyo `parentIds` contiene el id)
- Evolución: `evolvesFromId`, `evolutionReason`
- Texto libre (Json `attributes`): `motivations`, `weaknesses`, `internalConflict`, `personality`, `virtues`, `flaws`, `jobStudies`, `clothing`, `skills`, `health`, `hobbies`, `extraData`

Reglas:
- **Ownership**: todas las operaciones verifican que el proyecto pertenezca a la sesión (404 si no).
- **parentIds saneados al proyecto**: al crear/actualizar/evolucionar, los ids que no pertenezcan al mismo proyecto se descartan.
- **Evolución**: copia con cambios que hereda atributos y `parentIds`; registra `evolvesFromId` y `evolutionReason`. Al borrar un personaje con evoluciones, `evolvesFromId` pasa a `null` (las evoluciones sobreviven).
- **Imagen**: escritura solo desde el backend (service role). Si faltan `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` → `503 STORAGE_UNAVAILABLE`. El gate de evolución "después de la primera aparición" se añade con Timeline (Fase 6).

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

### Story Options (2026-08-04, Fase 4; M28: + ship, character; Fase 04b: globales; Fase 04d: por fandom)
- `GET /api/story-options?type=rating|storyType|category|narrator|ending|fandom|tag|problem|ship|character[&fandoms=...]` - Listar opciones **globales**. Para `ship`/`character`, `fandoms` (comas) filtra por los fandoms seleccionados (`hasSome`); `fandoms=` vacío devuelve solo generales (`isEmpty`); sin el parámetro devuelve todas.
- `GET /api/story-options/all` - Listar todas las opciones globales agrupadas por tipo
- `POST /api/story-options` - Crear opción global `{ type, value, label, fandoms? }` (cualquier usuario autenticado; dedupe case-insensitive)
- `DELETE /api/story-options/:id` - Eliminar opción global (**permiso `moderate`**; los defaults no se pueden eliminar)

Reglas:
- **Global**: todas las opciones son compartidas por todos los usuarios (modelo AO3). `fandom`, `ship`, `character`, `tag` se consumen con autocompletado en el wizard; los demás con select.
- **Por fandom**: solo ships y personajes tienen `fandoms[]`; el autocompletado filtra por los fandoms elegidos (estricto: con fandom → solo los suyos; sin fandom → solo generales). Las **etiquetas son siempre globales** (nunca se filtran por fandom).
- **Defaults**: `isDefault=true`, seedeados al arrancar el servidor.
- `@@unique([type, value])` evita duplicados; el servicio además deduplica case-insensitive.
- La creación requiere sesión; el listado devuelve el pool completo.

### Admin: Moderación (2026-08-06, Fase 04c; jerarquía por fandom en Fase 04e)
- `GET /api/admin/story-options/tree` (**permiso `moderate`**) - Listar **fandoms con sus hijos** (ships/characters) agrupados por tipo. Las opciones sin fandom (OC, generales) se **descartan**: no aparecen en el panel. Las **etiquetas son globales** y no forman parte del árbol.
- `GET /api/admin/story-options/groups?type=...` (**permiso `moderate`**) - Listar opciones del tipo agrupadas por **similitud de texto** (normalización + Levenshtein ≥ 0.8). La UI de moderación lo usa para las **etiquetas globales** (`type=tag`).
- `PATCH /api/admin/story-options/:id/fandom` (**permiso `moderate`**) - **Mover** una opción (ship/character) a un fandom: body `{ fandom: string }`. **Reemplaza** el array `fandoms` por `[fandom]` (movimiento, no suma). Las etiquetas no son movibles (son globales).
- `DELETE /api/admin/story-options/:id` (**permiso `moderate`**) - Eliminar una opción global. Si el tipo es `fandom` y **tiene hijos** → `409 HAS_CHILDREN` (hay que moverlos antes).
- **Permisos**: `admin` (gestionar roles/cuentas) y `moderate` (moderar opciones). `GET /api/me` devuelve `{ user, role, permissions }`.

Respuesta de `tree`:
```json
{
  "fandoms": [
    { "id": "...", "value": "Harry Potter", "label": "Harry Potter", "isDefault": false,
      "counts": { "ship": 1, "character": 2 } }
  ],
  "children": {
    "Harry Potter": { "ship": [ ... ], "character": [ ... ] }
  }
}
```

### Admin: Roles y Cuentas (2026-08-06, Fase 04c; + gestión de cuentas 2026-08-08)
- `GET /api/admin/roles` (**permiso `admin`**) - Listar roles con nº de cuentas
- `POST /api/admin/roles` (**`admin`**) - Crear rol `{ name, label, permissions[] }` (name minúsculas sin espacios; system no modificable)
- `PATCH /api/admin/roles/:id` (**`admin`**) - Actualizar `label`/`permissions`
- `DELETE /api/admin/roles/:id` (**`admin`**) - Eliminar rol; las cuentas asignadas pasan a `user` (los roles de sistema no se eliminan)
- `GET /api/admin/users` (**`admin`**) - Listar cuentas `{ id, email, name, role, status, suspendedUntil }`
- `PATCH /api/admin/users/:id/role` (**`admin`**) - Asignar rol `{ role }`
- `PATCH /api/admin/users/:id/status` (**`admin`**) - Cambiar estado `{ status: 'active'|'suspended'|'banned', until? }`. `until` (ISO) obligatorio y futuro para `suspended`; al banear/suspender se borran las sesiones del usuario. Errores: `403` no (es `400`) → `SELF_TARGET` (cuenta propia), `PROTECTED_ADMIN` (otro superadmin), `INVALID_UNTIL`, `NOT_FOUND`.
- `DELETE /api/admin/users/:id` (**`admin`**) - **Eliminación física total** de la cuenta (cascada: proyectos, documentos, notas, versiones, ramas, settings, actividad, sesiones, accounts). Errores: `404 NOT_FOUND`, `400 SELF_TARGET`/`PROTECTED_ADMIN`.

Reglas de estado de cuenta:
- `status`: `active` | `suspended` | `banned`. La suspensión es temporal (`suspendedUntil`; reactiva sola al vencer); el ban es permanente hasta desbanear manualmente.
- **Login bloqueado al instante**: `POST /api/auth/sign-in/email` devuelve `403 ACCOUNT_BANNED` / `403 ACCOUNT_SUSPENDED` si la cuenta está bloqueada.
- **Sesiones activas**: al banear/suspender se borran las sesiones en DB; por el cookieCache de BetterAuth (1 día) un usuario ya logueado tarda hasta 24 h en ser expulsado.
- **Protección**: no se puede modificar/eliminar la propia cuenta ni a otro superadmin (por permiso `admin`).
- **Modelo**: tabla `Role` (catálogo gestionable, seed `user`/`superadmin`). `User.role` guarda el nombre del rol. Roles con permisos configurables (`admin`, `moderate`).

### Story Bank: preguntas y plantillas (2026-08-08, Fase 4 Slice 5)
- `GET /api/story-questions` - Listar todas las preguntas del **banco de preguntas** (modo guiado del wizard)
- `POST /api/story-questions` (**permiso `moderate`**) - Crear pregunta `{ text, textEn? }`
- `PATCH /api/story-questions/:id` (**`moderate`**) - Editar pregunta `{ text?, textEn? }`
- `DELETE /api/story-questions/:id` (**`moderate`**) - Eliminar pregunta (incluidas las de sistema)
- `GET /api/story-templates` - Listar las **plantillas de estructura** (con sus secciones y `questionIds` por sección)
- `POST /api/story-templates` (**`moderate`**) - Crear plantilla `{ name, nameEn?, description?, descriptionEn?, sections[] }`
- `PATCH /api/story-templates/:id` (**`moderate`**) - Editar plantilla (mismos campos, todos opcionales)
- `DELETE /api/story-templates/:id` (**`moderate`**) - Eliminar plantilla (incluidas las de sistema)

Reglas:
- **Banco de preguntas**: respuestas siempre texto abierto; el usuario del modo guiado elige preguntas extra del banco (`StoryMeta.bankAnswers`). Un solo banco global para todos los usuarios.
- **Plantillas**: cada plantilla define sus secciones (`id`: `inicio|desarrollo|climax|final` o custom con `title`/`titleEn`) y las preguntas asignadas por sección (`questionIds` referencian `StoryQuestion`). Máx 12 secciones; ids únicos; títulos obligatorios en secciones custom.
- **Defaults**: `isDefault=true`, sembrados **solo si la tabla está vacía** (primer arranque). El admin puede **editar y borrar cualquier pregunta/plantilla, incluidas las de sistema**; los cambios persisten entre reinicios (el seed no vuelve a crearlas).
- Cache en memoria 5 min (`MemoryCache`), invalidada en cualquier escritura.

### Activity (2026-08-06, M29)
- `GET /api/activity` - Listar la actividad reciente del usuario (más reciente primero, máx. 20)
- `POST /api/activity` - Crear entrada `{ type, title, folderId?, documentId? }` (`type`: `folder_created | document_created | document_edited`)
- `DELETE /api/activity/document/:documentId` - Eliminar las entradas de actividad de un documento
- `DELETE /api/activity/folder/:folderId` - Eliminar las entradas de actividad de un proyecto/carpeta

Reglas:
- El feed de actividad reciente migró de `localStorage` al backend (M29): cada usuario solo ve su propia actividad (ownership por `userId` en todas las operaciones).
- Las entradas se crean desde el frontend al crear/editar documentos y carpetas; se limpian al eliminar el recurso.

### Cache en memoria (2026-08-08, M31 T7)

Los endpoints de **datos globales** (idénticos para todos los usuarios, leídos mucho y modificados rara vez) usan `backend/src/lib/cache.ts` (`MemoryCache<T>`), un cache en memoria por-instancia con TTL:

| Endpoint | Clave de cache | TTL | Invalidación |
|----------|----------------|-----|--------------|
| `GET /api/story-options?type=...&fandoms=...` | `list:{type}:{fandoms}` | 5 min | create/delete/moveFandom |
| `GET /api/story-options/all` | `all` | 5 min | ídem |
| `GET /api/admin/story-options/tree` | `fandomTree` | 5 min | ídem |
| `GET /api/admin/story-options/groups?type=...` | `groups:{type}` | 5 min | ídem |
| `GET /api/i18n/:lng/:ns` (M31 T2) | `i18n:{lng}:{ns}` | largo | — (archivos estáticos) |

- TTL corto (5 min) como red de seguridad; la **invalidación en escritura** hace que las mutaciones (crear/borrar/mover opción, seed) se reflejen de inmediato.
- **No** se cachea ningún dato por-usuario (ownership): solo datos globales/compartidos.
- **Escala:** el cache es por-instancia del backend. Al desplegar más de una instancia se sustituye por **Redis/Upstash** manteniendo la misma API (`get/set/delete/clear`) sin tocar los services.

## Autenticacion

Todos los endpoints (excepto auth) requieren sesion. La autenticacion es por cookie (`better-auth.session_token`), no JWT en header.

La sesion se valida contra la DB solo al refrescar (`updateAge`, 1 dia); entre medias la sesion va firmada en la cookie `better-auth.session_data` (cookie cache, maxAge 1 dia) para evitar queries de validacion por request.

## Swagger UI

La documentacion interactiva esta disponible en **desarrollo** (no se registra en produccion, M29):

```
http://localhost:3001/docs
```

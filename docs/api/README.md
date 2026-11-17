# API Documentation

Documentacion de la API de Archivum.

## Endpoints

### Exportación (Fase 11)

Descarga del documento (o documento + capítulos) a PDF, Markdown, HTML con CSS o HTML listo para pegar en AO3: [contrato](./export.md). `POST /api/documents/:id/export`; tag Swagger `Export`.

### Mapas (M70)

Varios lienzos por proyecto, JSON de objetos (iconos, trazos, formas, texto) e imagen de fondo: [contrato](./maps.md). Tag Swagger `Worldbuilding`.

### Estadísticas de escritura (Fase 10)

Palabras actuales y añadidas, tiempo activo, rachas, rango de fechas y calendario por cuenta, carpeta o escrito: [contrato y metodología](./stats.md). `GET /api/stats` y `POST /api/stats/activity`; el guardado de documentos admite `timeZone`.

### Asistencia de IA (Fase 9)

Chat contextual, conversación con personajes, análisis de coherencia, autocompletado de fichas, creación de personajes desde el manuscrito, autocompletado de la línea de tiempo, sugerencias de subtramas, orden de capítulos, autocompletado del wizard de historia y sugerencias de etiquetas: [contrato, permisos y configuración](./ai.md). Rutas bajo `/api/projects/:projectId/ai`, tag Swagger `AI`. Informe de uso para administración: [admin-ai-usage](./admin-ai-usage.md).

### Estructura / tablero de capítulos (Fase 8)

Tablero kanban por proyecto, sincronización de capítulos y movimiento de tarjetas: [contrato](./structure.md). Tag Swagger `Structure`.

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
- `PATCH /api/projects/:id/timeline-config` - Guardar sistema de tiempo de la línea temporal `{ timeSystem: "relative"|"era", beforeLabel?, afterLabel? }` (siglas máx. 10 caracteres; default relative)
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
- `DELETE /api/characters/:id` - Eliminar personaje (limpieza transaccional de `parentIds` huérfanos y reparenting de evoluciones hijas al origen anterior)
- `POST /api/characters/:id/evolve` - Crear evolución `{ reason, changes? }` (copia con cambios; `changes.storyPoint` opcional pero si viene debe ser **posterior** al del origen → `400 EVOLUTION_POINT_INVALID`)
- `PATCH /api/characters/:id/evolution-reason` - Actualizar el motivo de una evolución `{ reason }` (string o null para limpiar)
- `PUT /api/characters/:id/image` - Subir imagen `{ dataUrl }` (base64, mime `jpeg|png|webp|gif`, máx 3 MB) → Supabase Storage → actualiza `imageUrl` y borra la imagen anterior
- `DELETE /api/characters/:id/image` - Eliminar imagen (storage + campo `imageUrl`)
- `PUT /api/characters/:id/background-images` - Reemplazar fondos de la ficha `{ keepUrls?: string[], dataUrls?: string[] }` (hasta 6 imágenes nuevas, mime `jpeg|png|webp|gif`, máx 3 MB por imagen) → Supabase Storage; las URLs retiradas se eliminan

Campos del personaje:
- Datos: `name`, `description`, `nicknames[]`, `age`, `gender`, `heightCm`, `orientation`, `maritalStatus`, `species`, `birthPlace`, `birthDate`, `isOC`
- Ficha visual: `sheetBackgroundMode` (`default|single|collage`) y `sheetBackgroundImages[]` (hasta 6 URLs HTTPS)
- Rol: `role` (Principal/Secundario/Extra/custom), `roleSpec`
- Familia: `parentIds[]` (los hijos se derivan: personajes cuyo `parentIds` contiene el id)
- Evolución: `evolvesFromId`, `evolutionReason`, `storyPoint` (`inicio|desarrollo|climax|final` — punto de la historia en que aparece esta versión del personaje)
- Texto libre (Json `attributes`): `motivations`, `weaknesses`, `internalConflict`, `personality`, `virtues`, `flaws`, `jobStudies`, `clothing`, `skills`, `health`, `hobbies`, `extraData`

Reglas:
- **Ownership**: todas las operaciones verifican que el proyecto pertenezca a la sesión (404 si no).
- **parentIds saneados al proyecto**: al crear/actualizar/evolucionar, los ids que no pertenezcan al mismo proyecto se descartan.
- **Evolución**: copia con cambios que hereda atributos y `parentIds`; registra `evolvesFromId`, `evolutionReason` y `storyPoint`. Al borrar una evolución con evoluciones hijas, las hijas se reparentan al origen anterior de la borrada (las cadenas A→A1→A2 sobreviven). La coherencia de línea de tiempo (marcador ligero): una evolución solo puede tener un `storyPoint` estrictamente posterior al de su origen; se integrará con la Timeline en Fase 6.
- **Imagen**: escritura solo desde el backend (service role). Si faltan `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` → `503 STORAGE_UNAVAILABLE`. La coherencia temporal entre evolución y origen (marcador ligero `storyPoint`) ya está implementada; la Timeline (Fase 6) la usará como gate.

### Relaciones entre personajes (2026-08-10, Fase 6 + M41)
- `GET /api/projects/:projectId/relationships` - Listar relaciones del proyecto (opcional `?type=romance|friendship|enemity|family|custom`); incluye `characterA`/`characterB` embebidos (id, name, imageUrl, heightCm)
- `POST /api/projects/:projectId/relationships` - Crear relación `{ characterAId, characterBId, type, label?, description? }` (par normalizado A<B; `409 RELATIONSHIP_EXISTS` si ya existe; `400 INVALID_CHARACTERS` si el par no pertenece al proyecto o es el mismo personaje)
- `PUT /api/relationships/:id` - Actualizar relación (tipo, label, descripción o re-vincular el par; `409`/`404` tipados)
- `DELETE /api/relationships/:id` - Eliminar relación (`204`; `404` si no existe o no es del usuario)

Reglas:
- **Simétricas**: el par se normaliza (`characterAId < characterBId`) y el `@unique` impide duplicados en ambos sentidos. La UI resuelve la otra parte según el punto de vista.
- **Tipos**: `romance` (pareja), `friendship`, `enemity`, `family` (requiere `label`: hermano, primo, abuelo...), `custom` (label libre).
- **Ownership**: todas las operaciones verifican el proyecto del usuario (404 si no).

### Catálogos estáticos (2026-08-10, M41)
Tablas de solo lectura sembradas al arranque (seed idempotente), servidas por API autenticada con cache en memoria (TTL 5 min). Sin endpoints de escritura: son catálogos de sistema, no gestionables por admin.

- `GET /api/character-options` - Catálogo de opciones del formulario de personaje agrupado por `type` (`gender`, `orientation`, `maritalStatus`, `role`). Opcional `?type=` para filtrar un solo tipo. Cada opción: `{ id, type, value, label, labelEn, sortOrder, isDefault }`. El personaje guarda `value` como string libre (**modo híbrido**: la tabla sugiere, el usuario puede escribir valores custom vía `SelectOrCustom`).
- `GET /api/story-sections` - Secciones estándar de estructura (`inicio`, `desarrollo`, `climax`, `final`) con `sortOrder`. Fuente de validación del banco de plantillas: `validateSections` consulta esta tabla para decidir si un id de sección es estándar (sin título) o custom (título obligatorio).

Seed: 17 opciones de personaje (4 géneros, 5 orientaciones, 5 estados civiles, 3 roles) y 4 secciones. Solo se siembran filas que no existen (el patrón de "tabla vacía" de Fase 4).

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

### Settings
- `GET /api/settings` y `PATCH /api/settings` — tema, idioma, versionado automático y `uiPrefs`. Las preferencias de IA (`aiToolPresets`, `reviewEnabledByDefault`) viven en `uiPrefs`; `GET` añade `aiModes` (sin claves). Detalle en [ai.md](./ai.md).

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

### Timeline, Relaciones y Diagramas (2026-08-10, Fase 6)

**Timeline:**
- `GET /api/projects/:projectId/timeline` - Listar eventos (ordenados por `order` asc)
- `POST /api/projects/:projectId/timeline` - Crear evento `{ title, date?, description?, order?, eraId?, characterIds?, icon?, color?, groupName?, precision?, endDate?, label?, labelColor?, relatedEventIds?, relatedDocumentIds? }` (M46: `precision`: year|month|day|minute; `color`/`labelColor` hex `#rrggbb`; `date`/`endDate` texto — los formularios guardan el formato canónico `Y`, `Y-M`, `Y-M-D` o `Y-M-D hh:mm`, y se sigue aceptando texto libre legado; `characterIds`, `relatedEventIds` (sin el propio evento), `relatedDocumentIds` (docs y subpáginas del proyecto) y `eraId` saneados al proyecto — `eraId` ajeno se guarda como `null`; las **evoluciones** de personaje se descartan si el original no aparece en un evento **anterior**; sin `order` usa el contador)
- `PUT /api/timeline/:id` - Actualizar evento (mismos campos, todos opcionales; `imageUrl` solo acepta `null` para quitar la imagen, que se borra del storage). Si cambian `date` o `characterIds`, se vuelve a aplicar la regla de evoluciones (el original debe aparecer en un evento anterior).
- `subplotId?: string | null` (M71) en crear/actualizar: enlaza el evento a una subtrama del mismo proyecto (capa fantasma); una subtrama ajena responde `400 SUBPLOT_NOT_IN_PROJECT`; `null` desasocia; al borrar la subtrama el campo pasa a `null`. Ver [structure.md](./structure.md#subtramas-capa-fantasma).
- `PUT /api/timeline/:id/image` - Subir imagen del evento `{ dataUrl }` (base64 `data:image/{jpeg,png,webp,gif}`, máx 3 MB) a Supabase Storage (`timeline/<eventId>/<uuid>`); reemplaza y borra la anterior. Errores: `400 INVALID_IMAGE|IMAGE_TOO_LARGE`, `503 STORAGE_UNAVAILABLE`
- `DELETE /api/timeline/:id` - Borrar evento (204); borra también su imagen del storage

**Épocas / franjas (M60, extendido en M62 y M46):**
- `GET /api/projects/:projectId/timeline-eras` - Listar épocas (ordenadas por `order` asc)
- `POST /api/projects/:projectId/timeline-eras` - Crear época `{ name, color?, precision?, startDate?, endDate?, rollover? }` (`precision`: year|month|week|day|hour|minute; `color` hex `#rrggbb`; fechas en formato canónico `Y[-M[-D]]` (texto libre legado sigue aceptado); `rollover`: newYear|afterYear; sin `order` usa el contador)
- `PUT /api/timeline-eras/:id` - Actualizar época (mismos campos, todos opcionales)
- `DELETE /api/timeline-eras/:id` - Borrar época (204); sus eventos quedan con `eraId = null` (franja General)
- Autocompletado IA: `POST /api/projects/:projectId/ai/timeline-fill` — extrae épocas/eventos del manuscrito (techo 50/50); no persiste; el cliente aplica el CRUD de arriba. Ver [ai.md](./ai.md).

**Relaciones (estructuradas):**
- `GET /api/projects/:projectId/relationships?type=` - Listar relaciones `{ characterA, characterB, type, label?, description? }` (filtro opcional por tipo)
- `POST /api/projects/:projectId/relationships` - Crear relación `{ characterAId, characterBId, type, label?, description? }`. El par se **normaliza** (`characterAId < characterBId`); `409 RELATIONSHIP_EXISTS` si el par ya existe; `400 INVALID_CHARACTERS` si algún personaje no es del proyecto
- `PUT /api/relationships/:id` - Actualizar relación (cambiar tipo/label/descripción o el par con las mismas validaciones)
- `DELETE /api/relationships/:id` - Borrar relación (204)

Tipos: `romance | friendship | enemity | family | custom` (custom/family requieren `label`).

**Diagramas (pizarra):**
- `GET /api/projects/:projectId/diagrams` - Listar diagramas del proyecto
- `POST /api/projects/:projectId/diagrams` - Crear diagrama `{ name?, type?: familyTree|relationships|custom, layout? }`
- `POST /api/projects/:projectId/diagrams/generate` - Auto-generar `{ type: familyTree|relationships, name? }`: el árbol se posiciona por niveles desde `parentIds` (raíces arriba); las relaciones en círculo con todos los personajes
- `GET /api/diagrams/:id` - Obtener diagrama con su `layout`
- `PUT /api/diagrams/:id` - Renombrar o guardar layout `{ layout: { nodes: [{id, position}], notes: [{id, position, text}] } }` (mantiene lo no enviado)
- `DELETE /api/diagrams/:id` - Borrar diagrama (204)

Reglas:
- El layout guarda **solo posiciones** de nodos y notas; los edges se derivan: `familyTree` → `parentIds`, `relationships|custom` → `CharacterRelationship`.
- Las conexiones dibujadas en la pizarra crean/borran **relaciones estructuradas reales** (no dibujo muerto); las relaciones se pueden filtrar por tipo y se ven también en la ficha de personaje (Fase 5).

### Lore (Fase 7, M64)
- `GET /api/projects/:projectId/lore` - Listar entradas (orden `order`, `createdAt`)
- `POST /api/projects/:projectId/lore` - Crear `{ name, type?, description?, limits?, powerSource?, cost?, usedBy?, order? }` (`type`: magic|faction|religion|location|item|custom; inválido → `custom`)
- `PUT /api/lore/:id` - Actualizar los mismos campos (todos opcionales). No acepta `pdfUrl`/`pdfName`
- `PUT /api/lore/:id/pdf` - Adjuntar PDF (`multipart/form-data`, campo `file`, mime `application/pdf`, cabecera `%PDF-`, máx. 10 MB) → Supabase `lore/<id>/<uuid>.pdf`. Reemplaza y borra el anterior
- `DELETE /api/lore/:id/pdf` - Quitar el PDF (storage + campos)
- `DELETE /api/lore/:id` - Borrar la entrada (204) y su PDF

### Razas (Fase 7, M65)
- `GET /api/projects/:projectId/races` - Listar razas (orden por nombre)
- `POST /api/projects/:projectId/races` - Crear `{ name, classification?, description?, physicalTraits?, magicDescription?, spiritualTraits?, lifeExpectancy?, language?, culture?, religion?, origin?, territory?, relationsWithOthers?, importantNotes? }`. `hasMagic` se deriva de `magicDescription`. `lifeExpectancy` es texto libre. No acepta `imageUrl`
- `PUT /api/races/:id` - Actualizar los mismos campos
- `PUT /api/races/:id/image` - Subir imagen `{ dataUrl }` (jpeg|png|webp|gif, máx. 3 MB) al bucket **separado** `race-images` (`races/<id>/<uuid>`). Si el bucket no existe, el backend lo crea (público). No usa `character-images`.
- `DELETE /api/races/:id/image` - Quitar la imagen
- `PUT /api/races/:id/pdf` - Adjuntar PDF (`multipart/form-data`, campo `file`, mime `application/pdf`, cabecera `%PDF-`, máx. 10 MB) → Supabase `character-images` `races/<id>/<uuid>.pdf`. Reemplaza y borra el anterior. No acepta `pdfUrl`/`pdfName` en create/update
- `DELETE /api/races/:id/pdf` - Quitar el PDF (storage + campos)
- `DELETE /api/races/:id` - Borrar la raza (204), su imagen y su PDF

### Criaturas (Fase 7, M69)
- `GET /api/projects/:projectId/creatures` - Listar criaturas (orden por nombre)
- `POST /api/projects/:projectId/creatures` - Crear `{ name, species?, dangerType?, description? }` (`dangerType`: none|low|medium|high|lethal; inválido → null). No acepta `imageUrl`
- `PUT /api/creatures/:id` - Actualizar los mismos campos
- `PUT /api/creatures/:id/image` - Subir imagen `{ dataUrl }` (jpeg|png|webp|gif, máx. 3 MB) al bucket **separado** `creature-images` (`creatures/<id>/<uuid>`). Si el bucket no existe, el backend lo crea (público)
- `DELETE /api/creatures/:id/image` - Quitar la imagen
- `DELETE /api/creatures/:id` - Borrar la criatura (204) y su imagen

### OCR (Fase 7, T47–T48)
- `POST /api/ocr` - Extraer texto de una imagen o PDF (`multipart/form-data`, campo `file`).
  - Tipos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  - Tamaño máximo: 10 MB (imágenes) / 32 MB (PDF). El límite de `multipart` es 32 MB.
  - Idiomas: Tesseract.js `spa+eng`.
  - PDF con capa de texto: extrae con pdf.js; PDF escaneado: OCR de las imágenes embebidas.
  - Respuesta: `{ text: string }`.
  - Errores: `401 UNAUTHORIZED`, `400 NO_FILE`, `415 UNSUPPORTED_TYPE`, `413 FILE_TOO_LARGE`.
  - Auth: cookie de sesión. El texto no se persiste; el cliente puede copiarlo o volcarlo a lore/glosario.

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

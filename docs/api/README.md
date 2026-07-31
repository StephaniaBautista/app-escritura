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

Reglas:
- `version` es auto-incremental por documento (`@@unique([documentId, version])`).
- Máximo **50 versiones** por documento; al exceder, las más antiguas se eliminan (FIFO).
- `GET /documents/:documentId/versions` no incluye `content` (lista ligera); el contenido completo se obtiene con `GET /versions/:id`.

## Autenticacion

Todos los endpoints (excepto auth) requieren sesion. La autenticacion es por cookie (`better-auth.session_token`), no JWT en header.

La sesion se valida contra la DB solo al refrescar (`updateAge`, 1 dia); entre medias la sesion va firmada en la cookie `better-auth.session_data` (cookie cache, maxAge 1 dia) para evitar queries de validacion por request.

## Swagger UI

La documentacion interactiva esta disponible en:

```
http://localhost:3001/docs
```

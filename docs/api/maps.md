# Mapas (M70)

Editor visual de mapas por proyecto. Tag Swagger `Worldbuilding`. Auth: cookie de sesión. Ownership: el proyecto debe ser del usuario.

## Recursos

`MapBoard`: `{ id, projectId, name, backgroundUrl, canvas, order, createdAt, updatedAt }`

`canvas`: `{ version: 1, objects: MapObject[] }`

Tipos de objeto: `icon` | `path` | `rect` | `ellipse` | `line` | `text`. El backend sanitiza ids, colores hex, tamaños y recorta texto. Máximo 600 objetos; el JSON no puede superar ~700 KB. `backgroundUrl` no se acepta en el body de update: solo el endpoint de imagen.

## Endpoints

- `GET /api/projects/:projectId/maps` — lista (`order`, `createdAt`)
- `POST /api/projects/:projectId/maps` — crear `{ name }` (1–120). Lienzo vacío. 201
- `PUT /api/maps/:id` — `{ name?, canvas? }`. Errores: `400 NAME_REQUIRED | CANVAS_INVALID | CANVAS_TOO_LARGE`
- `PUT /api/maps/:id/background` — `{ dataUrl }` jpeg|png|webp|gif, máx. 3 MB → `character-images` `maps/<id>/<uuid>`. Sustituye y borra el fondo anterior
- `DELETE /api/maps/:id/background` — quita el fondo
- `DELETE /api/maps/:id` — 204; borra también el archivo de fondo

Errores comunes: `401 UNAUTHORIZED`, `404 NOT_FOUND`, `400 INVALID_IMAGE`, `503 STORAGE_UNAVAILABLE`.

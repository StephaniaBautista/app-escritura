# Estructura — tablero de capítulos

Base: `/api`. Todas las rutas requieren sesión BetterAuth y un proyecto del usuario.

## Tableros

| Método y ruta | Descripción |
| --- | --- |
| `GET /projects/:projectId/boards` | Lista tableros; crea uno por defecto con columnas Inicio/Desarrollo/Clímax/Conclusión si no existe |
| `POST /projects/:projectId/boards` | Crea un tablero |
| `PUT /boards/:id` | Actualiza nombre u orden |
| `DELETE /boards/:id` | Elimina tablero y columnas/tarjetas en cascada |
| `POST /boards/:boardId/sync-chapters` | Crea tarjetas `chapter` con `referenceId` para capítulos del proyecto aún no enlazados; las coloca en la primera columna |

## Columnas y tarjetas

| Método y ruta | Descripción |
| --- | --- |
| `POST /boards/:boardId/columns` | Crea columna |
| `PUT /columns/:id` | Actualiza columna |
| `DELETE /columns/:id` | Elimina columna y tarjetas |
| `PUT /boards/:boardId/columns/reorder` | Reordena columnas (`columnIds`) |
| `POST /columns/:columnId/cards` | Crea tarjeta (`cardType`: scene/chapter/character/document/note; `subplotId?` opcional) |
| `PUT /cards/:id` | Actualiza tarjeta (`subplotId: null` desasocia la subtrama) |
| `DELETE /cards/:id` | Elimina tarjeta |
| `PUT /columns/:columnId/cards/reorder` | Reordena tarjetas en columna |
| `PUT /cards/:id/move` | Mueve tarjeta a otra columna (`toColumnId`, `toIndex`) |

## Subtramas (capa fantasma)

| Método y ruta | Descripción |
| --- | --- |
| `GET /projects/:projectId/subplots` | Lista subtramas ordenadas por `order` |
| `POST /projects/:projectId/subplots` | Crea subtrama (`title`, `description?`, `status`: active/resolved/dropped, `color?`) |
| `PUT /subplots/:id` | Actualiza subtrama |
| `DELETE /subplots/:id` | Elimina subtrama; sus tarjetas y eventos quedan con `subplotId = null` (SetNull) |
| `PUT /projects/:projectId/subplots/reorder` | Reordena (`subplotIds`) |

Tarjetas (`StructureCard`) y eventos de línea de tiempo (`TimelineEvent`) aceptan `subplotId: string | null`. La subtrama debe pertenecer al mismo proyecto; si no, la ruta responde `400 { error: { code: 'SUBPLOT_NOT_IN_PROJECT' } }`. Omitir el campo no lo modifica. En la UI los ítems con `subplotId` se dibujan como «fantasmas» dentro de la trama principal y se pueden ocultar por subtrama (estado en memoria, no persistido).

## IA — orden sugerido

`POST /projects/:projectId/ai/structure-suggestions` requiere permiso `ai_chat`. Devuelve sugerencias `kind: chapter_order` con `chapterId` (documento capítulo) y `columnPhase` (`beginning` | `development` | `climax` | `ending`). No modifica el tablero hasta que el autor acepte cada sugerencia en la UI.

Ver también [ai.md](./ai.md).

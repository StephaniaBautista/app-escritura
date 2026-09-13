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
| `POST /columns/:columnId/cards` | Crea tarjeta (`cardType`: scene/chapter/character/document/note) |
| `PUT /cards/:id` | Actualiza tarjeta |
| `DELETE /cards/:id` | Elimina tarjeta |
| `PUT /columns/:columnId/cards/reorder` | Reordena tarjetas en columna |
| `PUT /cards/:id/move` | Mueve tarjeta a otra columna (`toColumnId`, `toIndex`) |

## IA — orden sugerido

`POST /projects/:projectId/ai/structure-suggestions` requiere permiso `ai_chat`. Devuelve sugerencias `kind: chapter_order` con `chapterId` (documento capítulo) y `columnPhase` (`beginning` | `development` | `climax` | `ending`). No modifica el tablero hasta que el autor acepte cada sugerencia en la UI.

Ver también [ai.md](./ai.md).

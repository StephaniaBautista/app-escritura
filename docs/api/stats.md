# Estadísticas de escritura

Estas rutas requieren sesión de Better Auth y estado de cuenta vigente consultado en la base de datos. Los filtros y documentos se limitan al propietario; un recurso ajeno devuelve `404`. No requieren permisos de IA ni suscripción.

## GET /api/stats

Parámetros opcionales: `days=30|90|365` (365 por defecto), `timeZone=America/Mexico_City` (UTC por defecto), `projectId`, `documentId`.

```json
{
  "timeZone": "America/Mexico_City",
  "today": "2026-09-12",
  "trackedSince": "2026-09-01",
  "range": { "from": "2026-08-14", "to": "2026-09-12" },
  "summary": {
    "totalWords": 2100, "wordsAdded": 600, "activeSeconds": 1800,
    "activeDays": 6, "currentStreak": 2, "longestStreak": 4,
    "dailyAverage": 20, "todayWords": 150
  },
  "days": [{ "date": "2026-08-14", "wordsAdded": 0, "activeSeconds": 0 }],
  "projects": [{ "id": "project-id", "name": "Novela" }],
  "documents": [{ "id": "document-id", "title": "Manuscrito", "projectId": "project-id", "parentId": null }]
}
```

`days` incluye todos los días del periodo, también los que tienen cero actividad. El ejemplo abrevia ese arreglo. `projects` y `documents` contienen opciones actuales propias. `trackedSince` es la primera fecha registrada con palabras o tiempo en el ámbito y es `null` si no existe actividad.

`totalWords` cuenta el contenido actual de los documentos existentes del ámbito. `documentId` incluye el nodo y sus descendientes actuales, de modo que seleccionar un manuscrito suma sus capítulos. Se detectan ciclos al recorrerlos. Si también se envía `projectId`, el documento debe pertenecer a ese proyecto.

`wordsAdded`, `activeSeconds`, `activeDays` y `dailyAverage` corresponden al periodo solicitado. El promedio incluye los días con cero palabras y se redondea a dos decimales. `todayWords` corresponde al día local actual. Las rachas se calculan con todo el historial; un día es activo únicamente cuando añadió palabras. La racha actual admite hoy o ayer como último día activo. El tiempo sin palabras no prolonga la racha.

El historial conserva sus identificadores de proyecto y documento al escribir. Borrar un documento o un proyecto no borra la actividad histórica de la cuenta; el historial de un proyecto existente conserva la actividad de sus documentos borrados. No es posible filtrar por un proyecto o documento borrado. El filtro de documento usa únicamente su árbol actual: no reconstruye ancestros históricos. Mover documentos no reescribe los registros anteriores. Borrar la cuenta elimina su historial.

## PATCH /api/documents/:id

El campo opcional `timeZone` asigna el día local a las palabras añadidas. Si falta, se usa UTC. Cambiar de zona horaria después no cambia las fechas almacenadas.

El texto visible se extrae de todo el JSON TipTap, sin los límites de contexto de IA. Los nodos inline se concatenan; bloques y saltos de línea separan palabras. Se cuentan tokens separados por espacios que contengan una letra o número Unicode; puntuación o emoji aislados no cuentan. Atributos y texto alternativo de imágenes no cuentan.

Un cambio real de contenido registra `max(0, palabrasNuevas - palabrasAnteriores)` dentro de la misma transacción serializable que guarda el documento y su contador. Repetir el mismo PATCH, cambiar formato, renombrar o eliminar palabras no incrementa la actividad. Crear con contenido, duplicar y restaurar versiones actualiza el total actual sin añadir actividad. El historial comienza con la instrumentación; no se infiere actividad antigua. Una espera agotada al adquirir la transacción se reintenta una sola vez si el callback aún no comenzó. Los conflictos serializables mantienen un máximo de tres intentos totales; los errores de tiempo durante o después del guardado no se repiten automáticamente.

## POST /api/stats/activity

```json
{
  "documentId": "document-id",
  "sessionId": "0d0d38b8-9172-4bd9-a126-c08ee557d961",
  "activeMilliseconds": 15000,
  "timeZone": "America/Mexico_City"
}
```

La primera solicitud para ese UUID debe usar `activeMilliseconds: 0`. Las siguientes envían el acumulado de tiempo activo, nunca un delta. El máximo es 28 800 000 ms (ocho horas). La sesión queda ligada al usuario, documento y zona horaria. Caduca a las ocho horas y admite como máximo doscientas sesiones vigentes por usuario.

```json
{
  "sessionId": "0d0d38b8-9172-4bd9-a126-c08ee557d961",
  "acceptedMilliseconds": 15000,
  "creditedMilliseconds": 15000,
  "totalActiveMilliseconds": 15000,
  "expiresAt": "2026-09-12T20:00:00.000Z"
}
```

`acceptedMilliseconds` es el mayor acumulado recibido; `creditedMilliseconds` es el crédito de esta solicitud; `totalActiveMilliseconds` es lo acreditado en esa sesión. Los reintentos y valores anteriores no acreditan tiempo ni mueven el reloj. El crédito nunca supera el incremento declarado, el tiempo transcurrido del servidor ni 60 segundos por reporte. Un reloj transaccional por usuario evita sumar intervalos solapados entre pestañas; el exceso declarado no se guarda para cobrarlo después. Los intervalos se reparten por día local si cruzan medianoche.

El editor abre la sesión con el primer cambio y reporta cada quince segundos mientras está visible, tiene foco y hubo actividad reciente, con un envío final al ocultarse o cerrarse. El servidor limita las declaraciones del cliente; no pretende medir productividad sin interacción. No existe un endpoint que acepte palabras calculadas por el cliente.

## Errores

Las rutas de estadísticas devuelven `{ "error": "CODIGO" }`: `400 STATS_INVALID_INPUT` o `STATS_INVALID_TIME_ZONE`, `401 UNAUTHORIZED`, `403 FORBIDDEN`, `404 NOT_FOUND`, `409 STATS_SESSION_NOT_STARTED` o `STATS_SESSION_SCOPE_MISMATCH`, `410 STATS_SESSION_EXPIRED`, `429 STATS_SESSION_LIMIT`, `500 STATS_REQUEST_FAILED`. Los errores de PATCH conservan el formato de documentos `{ "error": { "code": "CODIGO", "message": "CODIGO" } }`. No se incluyen textos de documentos, secretos ni mensajes internos de base de datos en errores de estadísticas.

## Contadores antiguos

Desde `backend/`, con el entorno configurado:

```sh
node --env-file=.env --import tsx scripts/backfill-document-word-count.ts
node --env-file=.env --import tsx scripts/backfill-document-word-count.ts --apply
```

La primera orden sólo informa los totales de documentos pendientes y palabras. La segunda actualiza únicamente contadores nulos cuya fecha de modificación y contenido siguen siendo los leídos; omite documentos editados concurrentemente y preserva `updatedAt`. No altera contenido ni crea historial. Hasta completarla, GET calcula en lectura el conteo de los documentos antiguos pendientes.

## Verificación local

Con Node 24, backend en 3001 y frontend en 5173, crear una fixture dedicada desde `backend/`:

```sh
STATS_E2E_FIXTURE=/private/tmp/archivum-phase10-fixture.json NODE_ENV=test node --import tsx src/test/stats-fixture.ts
```

Desde `frontend/`, ejecutar únicamente el spec correspondiente:

```sh
STATS_E2E_FIXTURE=/private/tmp/archivum-phase10-fixture.json STATS_E2E_BROWSER_CHANNEL=chrome pnpm exec playwright test e2e/stats.spec.ts --workers=1
```

Al terminar, limpiar desde `backend/`:

```sh
STATS_E2E_FIXTURE=/private/tmp/archivum-phase10-fixture.json NODE_ENV=test node --import tsx src/test/stats-fixture.ts --cleanup
```

La fixture crea dos cuentas sintéticas, datos propios y sesiones temporales; valida identificadores y propiedad antes de borrarlos. No se debe reutilizar una cuenta real. El manifiesto permite limpiar también una preparación interrumpida.

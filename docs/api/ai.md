# Asistencia de IA — Fase 9

Base: `/api/projects/:projectId/ai`. Todas las rutas requieren sesión BetterAuth y un proyecto del usuario. El servidor consulta el estado y rol actuales de la cuenta, además de la sesión. El tag `AI` de Swagger contiene los esquemas de petición y respuesta.

## Configuración

Configurar en `backend/.env` las claves `DEEPSEEK_API_KEY`, `MUSE_API_KEY`, `GLM_API_KEY`, `OPENAI_API_KEY` y `RAG_API_KEY` (embeddings del asesor). Modelos opcionales: `DEEPSEEK_MODEL` (por defecto `deepseek-flash`), `MUSE_CONTRIBUTOR_MODEL`, `MUSE_STANDARD_MODEL`, `GLM_MODEL`, `OPENAI_MODEL`. Las claves nunca se envían al navegador. Las URLs de proveedores son fijas y HTTPS.

Los clientes de escritura eligen un **modo** (`saver`, `balanced`, `quality`, `private`, `sealed`), no un nombre de marca. Tres modos avisan de que el texto puede usarse para entrenar. El modo `private` usa OpenAI con Zero Data Retention (`available` si hay `OPENAI_API_KEY`; `comingSoon: false`). Sin clave, pedirlo responde `503 AI_UNAVAILABLE` y no se reenvía a un modo que entrena. No hay fallback entre proveedores: un modo que no entrena no se reenvía a uno que sí.

El campo `provider` de las peticiones admite esos cinco modos. Las respuestas de chat ocultan el nombre real del modelo. El gasto por modelo (con nombre real) está en `GET /api/admin/ai-usage` (permiso `admin`): [informe](./admin-ai-usage.md).

Una respuesta vacía o incompatible con el contrato admite una sola solicitud adicional para corregir su formato. Conserva las fuentes y los límites originales, cuenta en la cuota y comparte un plazo total de 190 segundos con la primera generación. El resultado inválido no se guarda ni se reenvía como instrucciones; si la corrección falla, la API devuelve el error correspondiente. No se reintentan automáticamente errores de autenticación, red o cuota.

## Permisos

| Permiso del rol | Funciones |
| --- | --- |
| `ai_chat` | Companion, sugerencias de subtramas y orden de capítulos en el tablero |
| `ai_characters` | Conversación con personajes y autocompletado de fichas |
| `ai_suggestions` | Coherencia, inconsistencias y agujeros de guion |

El superadministrador tiene todos los permisos y `canCopy: true`. Los roles de usuario existentes conservan sus permisos. Los administradores pueden asignar estos permisos desde la gestión de roles. Facturación y suscripciones pertenecen a Fase 13.

## Rutas

| Método y sufijo | Entrada | Resultado |
| --- | --- | --- |
| `GET /capabilities` | — | Modos configurados (`id`, `available`, `trainsData`, `comingSoon`), permisos, capítulos, páginas de escritura (con `parentId` para reconstruir el árbol), personajes y `canCopy` |
| `GET /conversations` | — | Hasta 100 conversaciones del proyecto |
| `POST /conversations` | `mode: adviser\|character`, `title?`, `characterId?`, `chapterId?` | Conversación creada, HTTP 201 |
| `GET /conversations/:id` | — | Conversación y mensajes ordenados |
| `DELETE /conversations/:id` | — | Borra conversación y mensajes, HTTP 204 |
| `POST /conversations/:id/messages` | `message`, `requestId`, `direction?`, `webSearch?`, `provider?`, `locale?` | Turno con mensajes del usuario y asistente |
| `POST /suggestions` | `documentId?`, `draftContent?`, `provider?`, `locale?` | Diagnóstico de coherencia con fuentes |
| `POST /character-suggestions` | `characterId`, `provider?`, `locale?` | Campos de ficha sugeridos con citas |
| `POST /subplot-suggestions` | `subplotId?`, `provider?`, `locale?` | Sugerencias de relación narrativa |
| `POST /structure-suggestions` | `documentId?`, `provider?`, `locale?` | Colocación por página de escritura en el tablero |
| `POST /wizard-completion` | `stage`, `provider?`, `locale?` | Completa o sugiere mejoras de **una etapa** del wizard |
| `POST /tag-suggestions` | `provider?`, `locale?` | Sugiere etiquetas al estilo AO3 a partir del manuscrito; no persiste `storyMeta` |
| `POST /character-fill` | `characterId?`, `name?`, `provider?`, `locale?` | Crea o completa fichas de personaje a partir de documentos; no persiste personajes |
| `POST /timeline-fill` | `provider?`, `locale?` | Extrae o completa épocas y eventos (hasta 50 de cada) a partir de documentos; no persiste la línea |

`provider` admite `saver`, `balanced`, `quality`, `private` o `sealed`; `locale`, `es` o `en`. El modo de **generación** (revisión, wizard/etiquetas, línea de tiempo, personajes) lo elige la cuenta en `uiPrefs.aiToolPresets` (`GET`/`PATCH /api/settings`) y el cliente lo envía en `provider`. `reviewEnabledByDefault` (por defecto `false`) decide si la revisión del editor arranca encendida. `GET /api/settings` incluye `aiModes` (`id`, `available`, `trainsData`, `comingSoon`) para el selector, sin claves. El modo `private` se puede guardar en `aiToolPresets`. `webSearch` (boolean, solo asesor) lanza una búsqueda web pública a partir de **la pregunta del usuario**, nunca del manuscrito (Brave Search si hay `BRAVE_SEARCH_API_KEY`; si no, DuckDuckGo). Si se omite o es `false`, el modelo debe limitarse a las fuentes del proyecto. El modo `character` es un **ensayo de escena**: el personaje improvisa en primera persona, en presente, con diálogo como voz principal y como mucho una acotación breve entre asteriscos por turno; responde en dos a seis frases y no recita el pasado ni resume lo ocurrido. Sigue las premisas del autor sobre la escena y sobre a quién interpreta, porque el chat es el espacio de ensayo y su texto nunca se inserta en el manuscrito; por eso las peticiones de prosa solo se bloquean en el asesor. Su conocimiento termina en el punto elegido: si el autor menciona algo posterior, el personaje reacciona como quien no estuvo allí. Exige personaje y un **capítulo o subpágina** propios del proyecto como límite, y rechaza `webSearch` y `direction`. La evidencia es la ficha del personaje (solo campos respaldados por el texto) más las páginas del manuscrito hasta ese punto, incluida la subpágina elegida y lo que cuelga de ella; nada posterior entra en el contexto, y se etiqueta como memoria del personaje para que no se lea como un informe. Su selección es inmutable en la conversación: cambiar el límite de conocimiento requiere una conversación diferente.

`requestId` identifica el intento lógico de envío. Repetir el mismo identificador y contenido devuelve el turno persistido; reutilizarlo con otros datos produce `409 AI_REQUEST_CONFLICT`. Si el proveedor falla o su salida no es válida, no se guarda un turno incompleto.

## Contexto y sugerencias

El asesor indexa el manuscrito del proyecto en `ai_document_chunks` (pgvector + embeddings OpenAI `text-embedding-3-small` con `RAG_API_KEY`). Una pregunta embebe la consulta y recupera los pasajes más similares **solo de ese proyecto y usuario**; no se mezcla con otras carpetas ni se envía el libro entero al modelo. El contexto del turno es un subconjunto recuperado (más sinopsis y fichas). Si la clave de embeddings está configurada y el índice o pgvector fallan, la API responde `503 AI_RAG_UNAVAILABLE` (no vuelve al muestreo por palabras clave). Sin clave, el contexto se extrae en caliente como antes. Personaje, wizard y sugerencias con `pageMode`/`spread`/`documentId` siguen el recorte TipTap previo: si la petición nombra una página o usa modo por página (estructura y wizard en manuscritos cortos, menos de 8.000 palabras), esa página entra completa. El recorte por consulta con `[...]` solo aplica a esas rutas. Si una página supera 56.000 caracteres, se corta por el final del texto. A partir de 8.000 palabras el wizard, las fichas, las etiquetas y la línea de tiempo **no** usan modo página: muestrean inicio, medio y final (hasta ~2 millones de caracteres por documento) y caben en 56.000 caracteres. Un libro de 300.000 palabras no se envía entero.

`draftContent` es el borrador de la página activa, máximo 56.000 caracteres, y requiere `documentId`. Si el borrador es más corto que el texto guardado (p. ej. recorte del cliente), se usa la página persistida completa. El editor solicita análisis solamente cuando el autor activa la función, aplica debounce y descarta resultados que pertenecen a un documento o borrador anterior.

Cada respuesta de sugerencias devuelve `suggestions`, `sources`, `provider` y `model`. El máximo es cuatro ítems, salvo `chapter_order` (hasta 40, una por página de escritura). Una sugerencia incluye `id`, `kind`, `title` (160 caracteres), `description` (600 caracteres) y `sourceIds`. Los tipos son `inconsistency`, `plot_hole`, `character_completion`, `subplot` y `chapter_order`.

- En análisis de un documento, cada sugerencia debe incluir el `documentId` solicitado y una `quote` literal de su extracto. En análisis global ambos son opcionales. Las decoraciones visuales se calculan sobre el texto y no se guardan dentro del documento; la primera edición invalida resultados y marcas.
- El autocompletado envía únicamente extractos documentales como evidencia. Exige campos admitidos y un valor que aparezca literalmente en la cita, sin normalizar ni inventar datos. Las instrucciones excluyen datos contradictorios; la ocupación corresponde a `attributes.jobStudies`. La aplicación muestra una previsualización; solo la aceptación del autor invoca el CRUD habitual del personaje y preserva los demás campos.
- Las subtramas tienen `relation: intertwined|complementary|residual`. La respuesta no crea una subtrama hasta que el autor la acepta.
- El orden de páginas usa `chapterId` (id de documento, capítulo o subpágina) y `columnPhase: beginning|development|climax|ending` solo para colocar esa página en el tablero. La evidencia es el texto completo de cada página, no un resumen en tres actos. La respuesta no mueve tarjetas hasta que el autor acepta cada sugerencia. `GET /capabilities` incluye `pages` con todas las páginas de escritura.
- El autocompletado del wizard (`POST /wizard-completion`) exige permiso `ai_suggestions` y `stage`: `description`, `basics`, `couples`, `characters`, `tags` o `structure`. Cada llamada trabaja esa etapa: `basics` incluye `type`; `couples` incluye `ships` y `categories` aunque la historia no esté marcada como romance. Campos vacíos o pobres van en `meta`/`description` (complete). Campos ya sólidos van en `suggestions` `{field,title,description,value}` para que el autor aplique. No hay candado de un solo uso. Aplica la cuota AI general. Sin palabras visibles: `422 AI_WIZARD_EMPTY`. Texto insuficiente: `422 AI_WIZARD_INSUFFICIENT`. La ruta no escribe `storyMeta`. En `structure`, responde a las preguntas fijas en `sections[].answers`. Si la etapa es `tags`, las instrucciones permiten inferir tropes tipo AO3. Si el manuscrito más el prompt superan 60.000 caracteres, se recortan extractos (nunca `400 AI_INVALID_INPUT` por tamaño). En manuscritos largos la evidencia se muestrea a lo largo del libro; no se envían las 300.000 palabras.
- El autocompletado de fichas (`POST /character-fill`) exige permiso `ai_characters`. Reutiliza el mismo umbral de manuscrito que el wizard (`422 AI_WIZARD_EMPTY` / `422 AI_WIZARD_INSUFFICIENT`) y no llama al proveedor si no hay texto suficiente. Sin `characterId` extrae personajes nombrados que aún no existen en el proyecto. Con `characterId` (o `name` en un borrador) solo rellena campos vacíos. Una ficha ya completa responde `409 AI_CHARACTER_COMPLETE`. Incluye `orientation` cuando el manuscrito nombra o implica una orientación sexual, normalizada al catálogo de la ficha (`Heterosexual`, `Homosexual`, `Bisexual`, `Pansexual`, `Asexual` u opciones personalizadas). La ruta no escribe personajes; el cliente aplica el parche en el formulario, crea uno o añade todos con el CRUD habitual.
- El autocompletado de línea de tiempo (`POST /timeline-fill`) exige permiso `ai_suggestions`. Reutiliza `assertManuscriptEligible` / `projectWordCount` / `minWordsForGaps` (mismos códigos `422 AI_WIZARD_EMPTY` / `422 AI_WIZARD_INSUFFICIENT`). Extrae **todas** las épocas y eventos con evidencia en el manuscrito, con techo de seguridad de 50 épocas y 50 eventos (no un tope narrativo de 1–3). Deduplica por nombre/título (case-insensitive). En filas existentes solo rellena campos vacíos (`startDate`/`endDate` en épocas; `description`, `date`, `endDate`, `eraName`, `characterNames` en eventos). `eraName` y `characterNames` se resuelven contra épocas propuestas o existentes y personajes del proyecto. La ruta no escribe la línea; el cliente aplica con el CRUD de timeline (una a una o «Agregar todos»). `maxTokens` 4096 (tope del cliente IA).
- `POST /character-suggestions` usa el mismo gate de manuscrito vacío/insuficiente. Sin extractos documentales responde `422 AI_WIZARD_EMPTY` en lugar de una lista vacía.

En Character.AI se respeta la jerarquía y orden de capítulos del manuscrito seleccionado. Se excluyen capítulos posteriores y fuentes globales sin ubicación cronológica verificable. La respuesta puede reconocer que desconoce un hecho.

## Guard y límites

Las rutas IA no escriben documentos. El companion es un chat: responde al mensaje del autor y usa el proyecto como contexto, sin volcar un informe si no se pide. Una solicitud de redactar o continuar una escena sin dirección explícita devuelve `422 AI_WRITING_BLOCKED`. El campo opcional `direction` permite asesoramiento estructural, nunca prosa para insertar. Las respuestas de personaje son texto conversacional breve.

La UI limita copiar, cortar y arrastrar respuestas salvo `canCopy`; esto no impide capturas de pantalla ni la extracción mediante herramientas del navegador.

Se admiten como máximo 100 conversaciones por proyecto y 200 mensajes por conversación. El historial expira a los 90 días y se limpia al listar o crear conversaciones y mediante una tarea horaria del backend. El borrado de usuario, proyecto, personaje o capítulo relacionado elimina los datos asociados mediante cascada. La cuota de 10 intentos de generación por minuto y usuario, incluidas las correcciones de formato, se coordina en base de datos con una operación simultánea por usuario. Si se habilita fallback, un intento puede consultar al proveedor alternativo.

## Errores

Los errores tienen forma `{ "error": "CODE" }`. Las respuestas nunca incluyen claves, cuerpos de error del proveedor ni stack traces. Casos principales: `400 AI_INVALID_INPUT`, `401 UNAUTHORIZED`, `403 AI_PERMISSION_REQUIRED`, `404 NOT_FOUND`, `409 AI_REQUEST_CONFLICT`, `409 AI_CHARACTER_COMPLETE`, `422 AI_WRITING_BLOCKED`, `422 AI_WIZARD_EMPTY`, `422 AI_WIZARD_INSUFFICIENT`, `429 AI_RATE_LIMITED`, `502 AI_INVALID_RESPONSE`, `503 AI_UNAVAILABLE`, `503 AI_RAG_UNAVAILABLE` y `504 AI_TIMEOUT`. Una clave rechazada devuelve `503 AI_AUTHENTICATION_FAILED`.

## Pruebas del flujo integrado

Con Node 24, dependencias instaladas, backend en `3001` y frontend en `5173`, ejecutar desde la raíz:

```bash
pnpm --filter backend exec node --import tsx src/test/ai-fixture.ts
AI_E2E_BROWSER_CHANNEL=chrome pnpm --filter frontend exec playwright test e2e/ai.spec.ts --workers=1
pnpm --filter backend exec node --import tsx src/test/ai-fixture.ts --cleanup
```

El helper usa la base configurada en `backend/.env`, crea dos cuentas y roles sintéticos exclusivos y guarda sus sesiones en archivos temporales con permisos `600`. La limpieza valida el marcador y elimina únicamente sus cuentas, proyectos, roles y archivos. Si falla un setup parcial, conserva el manifiesto para ejecutar la limpieza con la misma ruta. `AI_E2E_FIXTURE` permite elegir una ruta temporal común a los tres comandos. Sin Chrome local puede omitirse `AI_E2E_BROWSER_CHANNEL` y utilizar el navegador instalado por Playwright.

Los diez E2E prueban API, historial, permisos, aislamiento, reintentos, selección de capítulos, marcas del editor, aceptación de campos y subtramas, y tamaños móviles. Las respuestas generativas se simulan explícitamente; estas pruebas no consumen los proveedores. Las pruebas reales de DeepSeek se realizan aparte y exclusivamente con la historia sintética.

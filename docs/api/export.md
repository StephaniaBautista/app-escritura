# Exportación (Fase 11)

Exporta un documento del usuario autenticado a Markdown, HTML con CSS, HTML AO3 o PDF.

## `POST /api/documents/:id/export`

Tag Swagger: `Export`. Cookie de sesión requerida.

### Body

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `format` | `md` \| `html` \| `ao3` \| `pdf` | Obligatorio |
| `includeChildren` | boolean | Por defecto `false`. Si es `true`, concatena el documento raíz y sus descendientes (capítulos/subpáginas) en orden de árbol; cada hijo va bajo un `h2` con su título |
| `ao3` | object | Solo con `format=ao3` |

Campos `ao3` (todos opcionales; default entre paréntesis):

| Campo | Valores |
|-------|---------|
| `fontFamily` | `serif` (serif) \| `sans` \| `mono` |
| `fontSize` | 10–24 px (14) |
| `lineSpacing` | 1–2.5 (1.5) |
| `paragraphStyle` | `block` (salto en blanco) \| `indent` (sangría 1.5em) |
| `sceneSeparator` | string máx. 40 (`* * *`) |
| `includeTitle` | boolean (`true`) |

### Respuesta

- `200`: cuerpo binario con `Content-Disposition: attachment; filename="…"` y content-type según formato (`text/markdown`, `text/html`, `application/pdf`).
- `401`: sin sesión.
- `404`: documento inexistente o de otro usuario.
- `400`: formato no soportado.
- `500`: fallo de exportación.

### Notas

- El HTML AO3 solo emite etiquetas admitidas por el editor rico de AO3 (`p`, `h1`–`h6`, `em`, `strong`, `del`, `code`, `blockquote`, `hr`, `br`, `ul`/`ol`/`li`, `a` http(s)).
- No hay login ni publicación directa en AO3: el usuario copia el HTML y lo pega (opción B del spec; scraping aplazado).
- El PDF se genera en servidor con pdfkit (A4, márgenes 72 pt, Helvetica).

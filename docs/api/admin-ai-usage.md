# Informe de uso de IA (admin)

`GET /api/admin/ai-usage?from=&to=`

Requiere sesión y permiso `admin`. `from` y `to` son fechas ISO opcionales; el rango por defecto es 30 días y el máximo 366.

La respuesta agrupa por proveedor real, modelo y modo interno, e incluye una serie diaria `days` (UTC) para gráficas:

- `requests`
- `promptTokens` / `completionTokens` / `totalTokens`
- `estimatedUsd` (tarifas internas, DeepSeek a precio peak)
- `days[]`: `date` (`YYYY-MM-DD`) y las mismas métricas por día, con ceros en días sin uso

No incluye textos de prompts ni claves. Tag Swagger `Admin`.

`GET /api/admin/ai-web-search` comprueba el motor de búsqueda del asesor (`brave` si hay `BRAVE_SEARCH_API_KEY`, si no `duckduckgo`). Devuelve `keyConfigured`, `ok`, `status` y `hits`. Nunca incluye la clave ni fragmentos de resultados.

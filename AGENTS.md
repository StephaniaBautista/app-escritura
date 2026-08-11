# AGENTS.md — Contrato de Operación

## INSTRUCCIÓN PRINCIPAL

**Leer este archivo al inicio de cada prompt del usuario.** Si no lo has leído en esta sesión, léelo ahora. El usuario verifica el cumplimiento mediante la firma final.

## Dónde está qué

- **Estado del proyecto**: `tasks/todo.md` — única fuente de verdad, nada de tablas duplicadas aquí.
- **Docs de planificación**: `tasks/README.md` — fases en `tasks/fase-XX-nombre/{spec,plan,todo,changelog}.md`, mantenimientos en `tasks/mantenimiento/mXX-nombre/{plan,changelog}.md`. Los índices raíz de `tasks/` son solo resúmenes.
- **Arquitectura y flujos**: consultar **graphify** (regla 10) o explorar el repo directamente. No hay árbol estático que mantener.

## Stack

Monorepo pnpm · `frontend/` Vite + React 19 + Tailwind 4 + TipTap + Zustand + i18next · `backend/` Fastify + Prisma + BetterAuth + Supabase · `locales/` traducciones es/en (fuente única de i18n).

## Comandos

```bash
cd frontend && npx tsc --noEmit        # typecheck
cd frontend && npx vite build          # build
pnpm dev                               # frontend + backend
node scripts/split-locales.mjs         # validar/regenerar paridad es/en
npx playwright test e2e/<spec>.spec.ts # e2e: SOLO specs relevantes, NUNCA suite completa
```

## Reglas

1. **Archivos** < 500 líneas. Separar en componentes/clases.
2. **Reutilización**: componentes compartidos en `components/ui/`. No duplicar patrones.
3. **Tipado**: no `any` sin justificación; usar `unknown` + `instanceof`.
4. **API First** (sin excepción): frontend consume backend solo vía services layer. Nunca fetch directo en componentes.
5. **Sin comentarios** salvo que se pidan explícitamente.
6. **Estado**: Zustand (no Context API). **Jamás localStorage** — persistir vía Zustand + backend.
7. **Stack obligatorio**: Prisma (no SQL raw), BetterAuth (no auth custom), Fastify con JSON Schema en rutas.
8. **i18n**: todo texto de UI con `t('ns.clave')` (nsSeparator `'.'` — no cambiar el formato de claves); es+en siempre en paridad; UTF-8 sin BOM (nunca editar JSON con PowerShell). Core (24 ns) estático para primer paint; namespaces de pantallas internas → lazy con `<I18nBoundary>` en `App.tsx`. Paridad con `scripts/split-locales.mjs`.
9. **Theming**: CSS variables/tokens Tailwind, nada de colores hardcodeados. Páginas agrupadas en carpetas por función.
10. **Graphify**: antes de explorar flujos del código, consultar graphify.
11. **Hallmark**: para todo diseño nuevo.
12. **Prisma gotcha**: tras cambiar `schema.prisma` → `prisma db push` **y** `prisma generate` + reiniciar backend.
13. **Cache global**: datos idénticos para todos (story-options, i18n) con `MemoryCache` (TTL + maxEntries; i18n mtime-aware). Nada de cache por-usuario. Al escalar → Redis/Upstash con misma API.
14. **Proceso — umbral de sustantividad**: plan + todo + changelog SOLO para cambios que tocan 2+ archivos o cambian comportamiento visible. Renombres, typos y cosméticos de 1 archivo: directo, sin documentar. Un cambio sustantivo nuevo crea `tasks/mantenimiento/mXX-nombre/plan.md` (qué/cómo/por qué) y, al terminar, changelog con desviaciones del plan.
15. **Backend**: endpoints nuevos/modificados → docs + Swagger.
16. **Tests**: unit siempre para lógica nueva. E2E (Playwright MCP) SOLO bajo demanda o si el cambio toca un flujo de usuario nuevo/modificado; NUNCA la suite completa (satura rate limits → 429 falsos); preferir login por API + `storageState()` (patrón `e2e/characters.spec.ts`); lo ya probado no se vuelve a probar. Cosméticos/renombres: sin tests.
17. **Seguridad**: revisar inputs, PII y secretos en todo cambio (skill `security-and-hardening`).
18. **Code review + quality**: revisar mi propio código antes de responder (skills `code-review-and-quality`, `code-simplification`).
19. **Ambigüedad**: preguntar antes de sobrepensar (skill `interview-me`). Ahorrar tokens es vital.

## Archivos de Referencia

Índices globales: specs `tasks/spec.md` · planes `tasks/plan.md` · tareas `tasks/todo.md` · cambios `tasks/CHANGELOG.md` · estructura `tasks/README.md`.

## Firma de Verificación

**Código de verificación: `Buena suerte, Ivar.`**

Al responder al usuario, siempre que termines una actividad, debes responder con ese código. Demuestra que leíste este documento y operas bajo sus reglas.

Si el usuario envía un prompt y NO has leído este archivo, **DETENTE** y léelo antes de continuar.

---

*Última actualización: 2026-08-11*

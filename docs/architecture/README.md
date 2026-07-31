# Arquitectura

Diagrama de arquitectura de la plataforma Archivum.

## Stack Tecnologico

### Frontend
- React 19
- Vite 8
- TypeScript
- Tailwind CSS 4
- Zustand (state management)
- TipTap (editor)
- React Flow (diagramas)
- react-i18next (internacionalizacion)

### Backend
- Node.js 22 LTS
- Fastify 5
- Prisma 7 (ORM)
- BetterAuth (autenticacion)
- Stripe (pagos)
- Socket.io (websocket)

### Infraestructura
- Supabase (PostgreSQL + Storage)
- Vercel (frontend)
- Railway (backend)
- Expo EAS (movil)

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Pages    │  │  Components │  │   Stores    │         │
│  │  (Routes)   │→│  (React)    │→│  (Zustand)  │         │
│  └─────────────┘  └─────────────┘  └──────┬──────┘         │
│                                           │                 │
│                                    ┌──────▼──────┐         │
│                                    │  Services   │         │
│                                    │  (API calls)│         │
│                                    └──────┬──────┘         │
└───────────────────────────────────────────┼─────────────────┘
                                            │ fetch/REST
                                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Routes    │→│  Middleware  │→│  Services   │         │
│  │  (Fastify)  │  │(Auth+Zod)  │  │  (Logic)    │         │
│  └─────────────┘  └─────────────┘  └──────┬──────┘         │
│                                           │                 │
│                    ┌──────────────────────┼────────┐        │
│                    │                      │        │        │
│             ┌──────▼──────┐  ┌────────────▼───┐   │        │
│             │   Prisma    │  │  AI Clients    │   │        │
│             │   (ORM)     │  │(Deepseek/MiMo) │   │        │
│             └──────┬──────┘  └────────────────┘   │        │
└────────────────────┼──────────────────────────────┘        │
                     │                                        │
              ┌──────▼──────┐                                │
              │  Supabase   │                                │
              │ (PostgreSQL)│                                │
              └─────────────┘                                │
```

## Editor (TipTap)

### Extensiones registradas (DocumentEditor.tsx)

| Extensión | Propósito |
|-----------|-----------|
| `StarterKit` (`heading: 1-3`, `paragraph: false`) | Base del editor |
| `ParagraphSpacing` (custom, `extensions/ParagraphSpacing.ts`) | Atributos `spacingBefore`/`spacingAfter` en el nodo paragraph (`'none'\|'md'` → `margin-top/bottom: 1.5em`); comandos `setParagraphSpacing`/`unsetParagraphSpacing` |
| `TextAlign` | Alineación en headings y paragraphs (`setTextAlign`) |
| `TextStyleKit` (fontFamily, lineHeight; color/bg/fontSize deshabilitados) | Marks de fuente e interlineado vía `textStyle` |
| `Placeholder`, `CharacterCount` | Placeholder y contador de caracteres/palabras |

Todas las extensiones `@tiptap/*` en versión 3.29.0 (regla: misma versión). `@tiptap/core` es dependencia directa por el module augmentation de `Commands` en ParagraphSpacing.

### Toolbar (`components/editor/Toolbar.tsx` + `toolbar/`)

- Estado reactivo con `useEditorState` (selector); sin estado local.
- Controles extraídos en `components/editor/toolbar/`: `ToolbarSelect` (select reutilizable), `FontSelect` (fuentes como tokens `var(--font-display)`/`var(--font-mono)` + familias web), `AlignGroup`, `LineHeightSelect`, `ParagraphSpacingControls`, `EmDashButton`.
- Grupos: bold/italic/strike │ H1-H3 │ alineación │ fuente/interlineado/espaciado/guión largo │ listas/cita/código/hr │ undo/redo.
- Tooltips y labels con i18n (claves `editorApp.*`; el bloque `editor.*` pertenece a la landing).
- Estado de fuente/interlineado vía `getAttributes('textStyle')` (no `isActive` — resuelve por CSS del browser, doc oficial).

### Sidebar del editor (`components/sidebar/Sidebar.tsx`)

- `AccordionSection` (`components/ui/AccordionSection.tsx`): acordeón animado reutilizable (grid-rows 0fr→1fr, 200ms, `motion-reduce`), a11y completo (`aria-expanded`/`aria-controls`/`aria-hidden` + `visibility:hidden` al cerrar).
- "Mis proyectos" (ProjectTree) y "Contenido" (ChapterTree) como secciones acordeón, abiertas por defecto; botones + como `actions` del header.
- `ProjectTree` recibe `createSignal?: number`: el botón + del acordeón incrementa un contador en Sidebar; ProjectTree lo procesa con ajuste de estado en render (guard `createSignal > lastSignal`) — patrón oficial de React, evita "Too many re-renders".

### Persistencia

- El contenido (JSON de TipTap) viaja como `content` del documento — aditivo: marks `textStyle` y atributos de párrafo se agregan sin romper documentos existentes.

## Seguridad

- Autenticacion con BetterAuth (JWT)
- CORS configurado
- Rate limiting
- Helmet (security headers)
- Validacion de inputs con Zod
- API keys de IA solo en backend

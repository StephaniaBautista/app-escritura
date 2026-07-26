# Tareas: App Escritura - Plan Completo

## Fase 0: Fundación
**Objetivo:** Setup del monorepo, tooling básico, configuración de desarrollo

- [ ] **T1: Setup proyecto monorepo pnpm**
  - Acceptance: `pnpm install` funciona, workspaces configurados
  - Verify: `pnpm install` sin errores, `pnpm -r ls` muestra workspaces
  - Files: `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.npmrc`

- [ ] **T2: Setup TypeScript + Vite (frontend)**
  - Acceptance: App React corre en `localhost:5173` con Tailwind
  - Verify: `pnpm dev` abre página con Tailwind funcionando
  - Files: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tailwind.config.ts`, `frontend/index.html`, `frontend/src/main.tsx`

- [ ] **T3: Setup Fastify + TypeScript (backend)**
  - Acceptance: Servidor corre en `localhost:3001`, health check responde
  - Verify: `curl localhost:3001/health` devuelve `{ status: "ok" }`
  - Files: `backend/package.json`, `backend/tsconfig.json`, `backend/src/index.ts`

- [ ] **T4: Setup Prisma + Supabase**
  - Acceptance: Conexión a Supabase verificada, Prisma Client generado
  - Verify: `pnpm prisma generate` sin errores, test de conexión
  - Files: `backend/prisma/schema.prisma`, `backend/.env.example`

---

## Fase 1: Autenticación
**Objetivo:** Sistema de login/registro completo

- [ ] **T5: Schema Prisma - Users + Sessions**
  - Acceptance: Modelo User y Session existen en DB con campos necesarios
  - Verify: `pnpm prisma migrate dev` crea tablas
  - Files: `backend/prisma/schema.prisma`

- [ ] **T6: BetterAuth + endpoints auth**
  - Acceptance: Endpoints POST /auth/login, /auth/register, /auth/logout funcionan
  - Verify: Test con curl/Postman, devuelve tokens
  - Files: `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts`, `backend/src/lib/auth.ts`

- [ ] **T7: Frontend auth (login/register)**
  - Acceptance: Páginas login/register renderizan, formularios envían datos
  - Verify: Login redirige a dashboard, registro crea usuario
  - Files: `frontend/src/pages/auth/Login.tsx`, `frontend/src/pages/auth/Register.tsx`, `frontend/src/stores/auth-store.ts`, `frontend/src/services/auth.ts`

- [ ] **T8: Mobile auth (login/register)**
  - Acceptance: Screens login/register renderizan en móvil
  - Verify: Login funciona en Expo Go
  - Files: `mobile/src/screens/Login.tsx`, `mobile/src/screens/Register.tsx`

---

## Fase 2: Core Editor
**Objetivo:** Editor de documentos funcional con capítulos y subpáginas

- [ ] **T9: Schema Prisma - Documents/Projects/Folders**
  - Acceptance: Modelos Project, Document, Folder existen en DB
  - Verify: `pnpm prisma migrate dev` crea tablas
  - Files: `backend/prisma/schema.prisma`

- [ ] **T10: API CRUD documentos y proyectos**
  - Acceptance: CRUD completo de documentos y proyectos via REST
  - Verify: Tests con Supertest pasan
  - Files: `backend/src/routes/documents.ts`, `backend/src/routes/projects.ts`, `backend/src/services/document-service.ts`

- [ ] **T11: TipTap editor setup**
  - Acceptance: Editor renderiza, soporta bold/italic/headings/lists
  - Verify: Editor funcional en navegador
  - Files: `frontend/src/components/editor/DocumentEditor.tsx`, `frontend/src/components/editor/Toolbar.tsx`, `frontend/src/components/editor/extensions/`

- [ ] **T12: Capítulos y subpáginas**
  - Acceptance: Crear capítulos y subpáginas dentro del documento
  - Verify: Árbol de capítulos se renderiza, navegación funciona
  - Files: `frontend/src/components/editor/ChapterTree.tsx`

- [ ] **T13: Sidebar + navegación**
  - Acceptance: Sidebar muestra árbol de proyectos/documentos
  - Verify: Click en documento abre editor
  - Files: `frontend/src/components/sidebar/Sidebar.tsx`, `frontend/src/components/sidebar/ProjectTree.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Editor.tsx`

- [ ] **T14: Guardado automático**
  - Acceptance: Documentos se guardan automáticamente al escribir (debounce 500ms)
  - Verify: Cambios persisten después de recargar
  - Files: `frontend/src/hooks/useAutoSave.ts`, `frontend/src/services/documents.ts`

- [ ] **T15: Mobile editor (WebView)**
  - Acceptance: Editor TipTap funciona en WebView de React Native
  - Verify: Escribir y guardar funciona en Expo Go
  - Files: `mobile/src/screens/Editor.tsx`, `mobile/src/components/EditorWebView.tsx`

---

## Fase 3: Notas y Versionado
**Objetivo:** Sistema de notas y versionado tipo Git

- [ ] **T16: Schema Prisma - Notes**
  - Acceptance: Modelo Note existe en DB con scope (global/rama/subpágina)
  - Verify: `pnpm prisma migrate dev` crea tabla
  - Files: `backend/prisma/schema.prisma`

- [ ] **T17: API CRUD notas**
  - Acceptance: CRUD de notas con filtros por scope
  - Verify: Tests pasan
  - Files: `backend/src/routes/notes.ts`, `backend/src/services/note-service.ts`

- [ ] **T18: UI notas (crear/editar/colapsar)**
  - Acceptance: Panel de notas funcional, colapsable
  - Verify: Crear/editar/eliminar nota funciona
  - Files: `frontend/src/components/editor/NotesPanel.tsx`

- [ ] **T19: Versionado Git (ramas/fusiones)**
  - Acceptance: Crear ramas, fusionar, ver historial
  - Verify: Crear rama desde main, fusionar, revertir
  - Files: `backend/src/lib/git-service.ts`, `backend/src/routes/branches.ts`

- [ ] **T20: UI gestión de ramas**
  - Acceptance: Selector de ramas, crear/fusionar UI
  - Verify: Cambiar de rama actualiza contenido
  - Files: `frontend/src/components/branches/BranchManager.tsx`

- [ ] **T21: Historial de cambios**
  - Acceptance: Lista de commits por rama
  - Verify: Ver diff entre versiones
  - Files: `frontend/src/components/branches/History.tsx`

---

## Fase 4: Modo de Creación
**Objetivo:** Wizard de creación de historias (directo + guiado)

- [ ] **T22: Modo directo (crear documento rápido)**
  - Acceptance: Modal con nombre + descripción crea documento
  - Verify: Documento creado aparece en sidebar
  - Files: `frontend/src/components/story-setup/DirectMode.tsx`

- [ ] **T23: Wizard modo guiado (preguntas AO3)**
  - Acceptance: Wizard con preguntas de rating, tipo, fandom, ships
  - Verify: Wizard genera metadata de historia
  - Files: `frontend/src/components/story-setup/GuidedMode.tsx`

- [ ] **T24: Preguntas de estructura (4 partes)**
  - Acceptance: Preguntas de inicio/desarrollo/climax/final
  - Verify: Estructura se guarda en historia
  - Files: `frontend/src/components/story-setup/StructureQuestions.tsx`

- [ ] **T25: Autocompletado IA en wizard**
  - Acceptance: IA sugiere descripciones basado en contenido
  - Verify: Sugerencias aparecen al escribir
  - Files: `backend/src/services/ai-service.ts`, `frontend/src/components/story-setup/AISuggestions.tsx`

---

## Fase 5: Personajes
**Objetivo:** Sistema completo de gestión de personajes

- [ ] **T26: Schema Prisma - Characters + Attributes**
  - Acceptance: Modelo Character con todos los atributos del spec
  - Verify: `pnpm prisma migrate dev` crea tabla
  - Files: `backend/prisma/schema.prisma`

- [ ] **T27: API CRUD personajes**
  - Acceptance: CRUD completo de personajes con todos los campos
  - Verify: Tests pasan
  - Files: `backend/src/routes/characters.ts`, `backend/src/services/character-service.ts`

- [ ] **T28: Formulario completo de personaje**
  - Acceptance: Formulario con todos los campos del spec (imagen, nombre, apodos, edad, etc.)
  - Verify: Crear/editar personaje con todos los campos
  - Files: `frontend/src/components/characters/CharacterForm.tsx`

- [ ] **T29: Fichas de personajes (cards)**
  - Acceptance: Cards de personajes con info resumida
  - Verify: Cards muestran datos correctamente
  - Files: `frontend/src/components/characters/CharacterCard.tsx`, `frontend/src/pages/Characters.tsx`

- [ ] **T30: Árbol genealógico**
  - Acceptance: Visualización de relaciones familiares
  - Verify: Conectar padres/hijos funciona
  - Files: `frontend/src/components/characters/FamilyTree.tsx`

- [ ] **T31: Evolución de personajes**
  - Acceptance: Crear evolución = copia con cambios
  - Verify: Evolución mantiene características primordiales
  - Files: `frontend/src/components/characters/CharacterEvolution.tsx`

- [ ] **T32: Filtros por atributos**
  - Acceptance: Filtros por cada select del formulario + alturas
  - Verify: Filtrar personajes funciona
  - Files: `frontend/src/components/characters/CharacterFilters.tsx`

- [ ] **T33: IA autocompletado personajes**
  - Acceptance: IA sugiere personalidad, virtudes, defectos basado en historia
  - Verify: Sugerencias aparecen al escribir
  - Files: `backend/src/services/ai-service.ts`

---

## Fase 6: Timeline y Relaciones
**Objetivo:** Línea del tiempo y mapa de relaciones visual

- [ ] **T34: Schema Prisma - Timeline Events**
  - Acceptance: Modelo TimelineEvent con personajes involucrados
  - Verify: `pnpm prisma migrate dev` crea tabla
  - Files: `backend/prisma/schema.prisma`

- [ ] **T35: API CRUD timeline**
  - Acceptance: CRUD de eventos con personajes
  - Verify: Tests pasan
  - Files: `backend/src/routes/timeline.ts`, `backend/src/services/timeline-service.ts`

- [ ] **T36: UI línea del tiempo**
  - Acceptance: Timeline visual con eventos
  - Verify: Crear/editar evento funciona
  - Files: `frontend/src/components/timeline/Timeline.tsx`, `frontend/src/pages/Timeline.tsx`

- [ ] **T37: Mapa de relaciones (React Flow)**
  - Acceptance: Nodos de personajes con conexiones
  - Verify: Crear conexión entre personajes
  - Files: `frontend/src/components/relations/RelationsMap.tsx`, `frontend/src/pages/Relations.tsx`

- [ ] **T38: Nodos personalizados (personajes)**
  - Acceptance: Nodos muestran avatar y nombre del personaje
  - Verify: Nodos son interactivos
  - Files: `frontend/src/components/relations/CharacterNode.tsx`

- [ ] **T39: Filtros por tipo de relación**
  - Acceptance: Filtrar por romance, amigos, enemigos, familia
  - Verify: Filtro oculta/muestra conexiones
  - Files: `frontend/src/components/relations/RelationFilters.tsx`

---

## Fase 7: Lore y Worldbuilding
**Objetivo:** Sistema de lore, razas, glosario, criaturas, mapa mundial

- [ ] **T40: Schema Prisma - Lore, Races, Glossary, Creatures, Locations**
  - Acceptance: Modelos Lore, Race, Glossary, Creature, Location en DB
  - Verify: `pnpm prisma migrate dev` crea tablas
  - Files: `backend/prisma/schema.prisma`

- [ ] **T41: API CRUD lore/razas/glosario/criaturas**
  - Acceptance: CRUD de todos los modelos
  - Verify: Tests pasan
  - Files: `backend/src/routes/lore.ts`, `races.ts`, `glossary.ts`, `creatures.ts`, `worldmap.ts`

- [ ] **T42: UI Lore (formularios + listas)**
  - Acceptance: Crear/editar entradas de lore con tipo y límites
  - Verify: CRUD funciona
  - Files: `frontend/src/components/lore/LoreEditor.tsx`, `frontend/src/pages/Lore.tsx`

- [ ] **T43: UI Razas/Pueblos**
  - Acceptance: Formulario completo de razas
  - Verify: CRUD funciona
  - Files: `frontend/src/components/lore/RacesEditor.tsx`

- [ ] **T44: UI Glosario**
  - Acceptance: Formulario palabra/pronunciación/significado
  - Verify: CRUD funciona
  - Files: `frontend/src/components/lore/GlossaryEditor.tsx`

- [ ] **T45: UI Bestias/Criaturas**
  - Acceptance: Formulario de criaturas
  - Verify: CRUD funciona
  - Files: `frontend/src/components/lore/CreaturesEditor.tsx`

- [ ] **T46: Mapa mundial (React Flow)**
  - Acceptance: Nodos de ubicaciones con conexiones
  - Verify: Drag & drop funciona
  - Files: `frontend/src/components/worldmap/WorldMap.tsx`

- [ ] **T47: OCR para PDFs escaneados (Tesseract.js)**
  - Acceptance: Extrae texto de PDFs escaneados e imágenes
  - Verify: Subir PDF escaneado devuelve texto
  - Files: `backend/src/services/ocr-service.ts`

- [ ] **T48: Upload + procesamiento de PDFs/imágenes**
  - Acceptance: Endpoint para subir archivos y procesar OCR
  - Verify: Upload funciona, OCR procesa archivo
  - Files: `backend/src/routes/ocr.ts`

---

## Fase 8: Estructura y Subtramas
**Objetivo:** Tablero tipo Trello y gestión de subtramas

- [ ] **T49: Schema Prisma - StructureBoard, Columns, Cards**
  - Acceptance: Modelos Board, Column, Card en DB
  - Verify: `pnpm prisma migrate dev` crea tablas
  - Files: `backend/prisma/schema.prisma`

- [ ] **T50: API CRUD estructura**
  - Acceptance: CRUD de tablero, columnas, tarjetas
  - Verify: Tests pasan
  - Files: `backend/src/routes/structure.ts`

- [ ] **T51: Tablero drag & drop**
  - Acceptance: Tablero con columnas (Inicio, Desarrollo, Climax, Conclusión)
  - Verify: Drag & drop entre columnas funciona
  - Files: `frontend/src/components/structure/StructureBoard.tsx`, `frontend/src/pages/Structure.tsx`

- [ ] **T52: Schema Prisma - Subplots**
  - Acceptance: Modelo Subplot en DB
  - Verify: `pnpm prisma migrate dev` crea tabla
  - Files: `backend/prisma/schema.prisma`

- [ ] **T53: API CRUD subtramas**
  - Acceptance: CRUD de subtramas
  - Verify: Tests pasan
  - Files: `backend/src/routes/subplots.ts`

- [ ] **T54: UI subtramas**
  - Acceptance: Crear/editar subtramas vinculadas a historia principal
  - Verify: CRUD funciona
  - Files: `frontend/src/components/subplots/SubplotEditor.tsx`

- [ ] **T55: IA sugerencias subtramas**
  - Acceptance: IA sugiere si subtrama se entrelaza con principal
  - Verify: Sugerencias aparecen
  - Files: `backend/src/services/ai-service.ts`

---

## Fase 9: Integración IA
**Objetivo:** Modos de IA (Chat, Character.AI, Sugerencias)

- [ ] **T56: AI Client (DeepSeek/MiMo)**
  - Acceptance: Cliente IA configurado con DeepSeek
  - Verify: Llamada a API funciona
  - Files: `backend/src/lib/ai-client.ts`

- [ ] **T57: RAG Service (contexto de historia)**
  - Acceptance: IA tiene contexto de historia, personajes, timeline, lore
  - Verify: IA responde con conocimiento de la historia
  - Files: `backend/src/lib/rag-service.ts`

- [ ] **T58: API endpoints IA**
  - Acceptance: Endpoints para chat, character.AI, sugerencias
  - Verify: Tests pasan
  - Files: `backend/src/routes/ai.ts`

- [ ] **T59: Modo Chat (companion)**
  - Acceptance: Chat conversacional que conoce la historia
  - Verify: Chat funciona, IA responde con contexto
  - Files: `frontend/src/components/ai/ChatPanel.tsx`

- [ ] **T60: Modo Character.AI (solo texto)**
  - Acceptance: Chat tipo rol con personajes
  - Verify: Seleccionar personaje, chatear en rol
  - Files: `frontend/src/components/ai/CharacterChat.tsx`

- [ ] **T61: Modo Sugerencias (inconsistencias)**
  - Acceptance: IA marca inconsistencias en rojo
  - Verify: Escribir texto inconsistente muestra sugerencias
  - Files: `frontend/src/components/ai/SuggestionsPanel.tsx`

- [ ] **T62: Bloqueo de escritura por IA**
  - Acceptance: IA nunca escribe la historia, solo sugiere
  - Verify: Pedir "continúa" sin dirección es rechazado
  - Files: `backend/src/services/ai-guard.ts`

---

## Fase 10: Estadísticas
**Objetivo:** Estadísticas de escritura estilo GitHub

- [ ] **T63: Schema Prisma - WritingStats**
  - Acceptance: Modelo WritingStat en DB
  - Verify: `pnpm prisma migrate dev` crea tabla
  - Files: `backend/prisma/schema.prisma`

- [ ] **T64: API estadísticas**
  - Acceptance: Endpoint devuelve stats por día/carpeta/cuenta
  - Verify: Tests pasan
  - Files: `backend/src/routes/stats.ts`

- [ ] **T65: Dashboard estadísticas**
  - Acceptance: Dashboard muestra palabras, horas, racha
  - Verify: Stats se renderizan correctamente
  - Files: `frontend/src/components/stats/StatsDashboard.tsx`, `frontend/src/pages/Stats.tsx`

- [ ] **T66: GitHub-style contribution graph**
  - Acceptance: Gráfico de contribuciones por día
  - Verify: Gráfico muestra datos correctamente
  - Files: `frontend/src/components/stats/ContributionGraph.tsx`

- [ ] **T67: Frases motivacionales**
  - Acceptance: Muestra frases según progreso
  - Verify: Frases aparecen en stats
  - Files: `frontend/src/components/stats/MotivationalQuotes.tsx`

---

## Fase 11: Exportación y AO3
**Objetivo:** Exportar documentos y publicar en AO3

- [ ] **T68: Exportación PDF**
  - Acceptance: Exportar documento a PDF con formato
  - Verify: PDF descargado contiene contenido
  - Files: `backend/src/services/export-service.ts`, `backend/src/routes/export.ts`

- [ ] **T69: Exportación Markdown**
  - Acceptance: Exportar documento a Markdown
  - Verify: MD descargado contiene contenido
  - Files: `backend/src/services/export-service.ts`

- [ ] **T70: Exportación HTML (con CSS)**
  - Acceptance: Exportar documento a HTML con estilos
  - Verify: HTML descargado es visualizable
  - Files: `backend/src/services/export-service.ts`

- [ ] **T71: Editor visual HTML/AO3**
  - Acceptance: Editor visual para formatos AO3
  - Verify: Editor permite personalizar HTML
  - Files: `frontend/src/components/export/AO3Editor.tsx`

- [ ] **T72: AO3 Web Scraping (Puppeteer)**
  - Acceptance: Scraping de AO3 sin almacenar credenciales
  - Verify: Login + publicar funciona
  - Files: `backend/src/services/ao3-service.ts`

- [ ] **T73: Endpoint AO3 (login + publicar)**
  - Acceptance: Endpoint para publicar en AO3
  - Verify: Publicación funciona
  - Files: `backend/src/routes/ao3.ts`

- [ ] **T74: UI exportación**
  - Acceptance: Panel de exportación con opciones
  - Verify: Exportar en todos los formatos funciona
  - Files: `frontend/src/components/export/ExportPanel.tsx`

---

## Fase 12: Etiquetas y Compartir
**Objetivo:** Sistema de etiquetas AO3 y beta readers

- [ ] **T75: Schema Prisma - Tags, SharedDocuments**
  - Acceptance: Modelos Tag, SharedDocument en DB
  - Verify: `pnpm prisma migrate dev` crea tablas
  - Files: `backend/prisma/schema.prisma`

- [ ] **T76: API etiquetas**
  - Acceptance: CRUD de etiquetas
  - Verify: Tests pasan
  - Files: `backend/src/routes/tags.ts`

- [ ] **T77: API compartir documentos**
  - Acceptance: Generar link compartible, comentarios
  - Verify: Link funciona, comentarios se guardan
  - Files: `backend/src/routes/sharing.ts`

- [ ] **T78: UI etiquetas (AO3 style)**
  - Acceptance: Sistema de etiquetas similar a AO3
  - Verify: Crear/asignar etiquetas funciona
  - Files: `frontend/src/components/tags/TagManager.tsx`

- [ ] **T79: IA sugerencia de etiquetas**
  - Acceptance: IA sugiere etiquetas basado en contenido
  - Verify: Sugerencias aparecen al escribir
  - Files: `backend/src/services/ai-service.ts`

- [ ] **T80: Link compartible + comentarios**
  - Acceptance: Documento compartible por link, comentarios funcionan
  - Verify: Acceder por link muestra documento, comentar funciona
  - Files: `frontend/src/pages/SharedDocument.tsx`

---

## Fase 13: Pasarela de Pago
**Objetivo:** Sistema de suscripciones con Stripe

- [ ] **T81: Stripe integration**
  - Acceptance: Stripe configurado en backend
  - Verify: Crear checkout session funciona
  - Files: `backend/src/lib/stripe.ts`

- [ ] **T82: API suscripciones**
  - Acceptance: Endpoints para crear/gestionar suscripciones
  - Verify: Tests pasan
  - Files: `backend/src/routes/subscriptions.ts`

- [ ] **T83: API webhooks Stripe**
  - Acceptance: Webhooks procesan eventos de Stripe
  - Verify: Eventos se procesan correctamente
  - Files: `backend/src/routes/webhooks.ts`

- [ ] **T84: UI planes y precios**
  - Acceptance: Página de precios con 5 tiers
  - Verify: Planes se muestran correctamente
  - Files: `frontend/src/pages/Pricing.tsx`

- [ ] **T85: Gestión de suscripción**
  - Acceptance: Upgrade/downgrade/cancelar suscripción
  - Verify: Cambios de plan funcionan
  - Files: `frontend/src/components/payment/SubscriptionManager.tsx`

- [ ] **T86: Pay-as-you-go tokens**
  - Acceptance: Compra de tokens extra
  - Verify: Tokens se agregan a la cuenta
  - Files: `backend/src/services/token-service.ts`

- [ ] **T87: Límites por tier**
  - Acceptance: Middleware verifica límites por tier
  - Verify: Límites se respetan (personajes, ramas, IA, etc.)
  - Files: `backend/src/middleware/tier-check.ts`

---

## Fase 14: App Móvil
**Objetivo:** App móvil completa con todas las features

- [ ] **T88: Setup Expo + React Native**
  - Acceptance: App Expo funciona en Expo Go
  - Verify: `pnpm start` corre app en dispositivo/emulador
  - Files: `mobile/package.json`, `mobile/app.json`

- [ ] **T89: Navegación (React Navigation)**
  - Acceptance: Navegación entre pantallas funciona
  - Verify: Tabs y stack navigation funcionan
  - Files: `mobile/src/navigation/AppNavigator.tsx`

- [ ] **T90: Screens principales**
  - Acceptance: Dashboard, Editor, Personajes, Timeline, Lore
  - Verify: Todas las screens renderizan
  - Files: `mobile/src/screens/Dashboard.tsx`, `Characters.tsx`, `Timeline.tsx`, `Lore.tsx`

- [ ] **T91: Editor móvil (WebView)**
  - Acceptance: Editor TipTap funciona en WebView
  - Verify: Escribir y guardar funciona
  - Files: `mobile/src/screens/Editor.tsx`, `mobile/src/components/EditorWebView.tsx`

- [ ] **T92: Personajes móvil**
  - Acceptance: CRUD de personajes en móvil
  - Verify: Crear/editar personaje funciona
  - Files: `mobile/src/screens/Characters.tsx`

- [ ] **T93: Timeline móvil**
  - Acceptance: Timeline visual en móvil
  - Verify: Ver/crear eventos funciona
  - Files: `mobile/src/screens/Timeline.tsx`

- [ ] **T94: Lore/Worldbuilding móvil**
  - Acceptance: Lore/razas/glosario en móvil
  - Verify: CRUD funciona
  - Files: `mobile/src/screens/Lore.tsx`

- [ ] **T95: IA Chat móvil**
  - Acceptance: Chat IA funciona en móvil
  - Verify: Enviar/recibir mensajes funciona
  - Files: `mobile/src/screens/AIChat.tsx`

- [ ] **T96: Configuración y cuenta**
  - Acceptance: Settings, perfil, suscripción
  - Verify: Cambiar settings funciona
  - Files: `mobile/src/screens/Settings.tsx`

---

## Fase 15: Polish y Optimización
**Objetivo:** Optimización, responsive, error handling, tests

- [ ] **T97: Responsive design (320px+)**
  - Acceptance: App funcional en mobile (320px+)
  - Verify: Test en 320px, 768px, 1024px, 1440px
  - Files: Todos los componentes

- [ ] **T98: Loading states + skeletons**
  - Acceptance: Skeletons en carga de datos
  - Verify: Loading state visible
  - Files: `frontend/src/components/ui/Skeleton.tsx`

- [ ] **T99: Error boundaries**
  - Acceptance: Error boundaries capturan errores
  - Verify: Error boundary muestra fallback
  - Files: `frontend/src/components/ui/ErrorBoundary.tsx`

- [ ] **T100: Tests unitarios (70% cobertura)**
  - Acceptance: 70% cobertura en lógica de negocio
  - Verify: `pnpm test` pasa, cobertura >= 70%
  - Files: `frontend/src/**/*.test.tsx`, `backend/src/**/*.test.ts`

- [ ] **T101: Tests integración**
  - Acceptance: Tests de endpoints API
  - Verify: Tests de auth y CRUD pasan
  - Files: `backend/src/**/*.test.ts`

- [ ] **T102: Performance optimization**
  - Acceptance: LCP < 2.5s, bundle size optimizado
  - Verify: Lighthouse score > 90
  - Files: `frontend/vite.config.ts`

- [ ] **T103: Modo oscuro/claro**
  - Acceptance: Toggle modo oscuro/claro, persistencia
  - Verify: Toggle cambia tema, persiste
  - Files: `frontend/src/stores/theme-store.ts`, `frontend/src/components/ui/ThemeToggle.tsx`

- [ ] **T104: SEO + meta tags**
  - Acceptance: Meta tags configurados
  - Verify: Preview en redes sociales funciona
  - Files: `frontend/index.html`

---

## Resumen de Fases

| Fase | Tareas | Dependencia |
|------|--------|-------------|
| 0: Fundación | T1-T4 | Ninguna |
| 1: Autenticación | T5-T8 | Fase 0 |
| 2: Core Editor | T9-T15 | Fase 1 |
| 3: Notas + Versionado | T16-T21 | Fase 2 |
| 4: Modo Creación | T22-T25 | Fase 2 |
| 5: Personajes | T26-T33 | Fase 2 |
| 6: Timeline + Relaciones | T34-T39 | Fase 5 |
| 7: Lore + Worldbuilding | T40-T48 | Fase 2 |
| 8: Estructura + Subtramas | T49-T55 | Fase 2 |
| 9: Integración IA | T56-T62 | Fase 2, 5 |
| 10: Estadísticas | T63-T67 | Fase 2 |
| 11: Exportación + AO3 | T68-T74 | Fase 2 |
| 12: Etiquetas + Compartir | T75-T80 | Fase 2 |
| 13: Pasarela de Pago | T81-T87 | Fase 1 |
| 14: App Móvil | T88-T96 | Fase 1-13 |
| 15: Polish | T97-T104 | Todas |

**Total: 104 tareas en 16 fases**

# Spec: App Escritura — Plataforma de Escritura Creativa Completa

## Objetivo

Plataforma web + móvil de escritura creativa especializada para escritores de historias y fanfics. Combina un editor tipo Google Docs con herramientas de worldbuilding, gestión de personajes, versionado tipo Git, asistencia de IA (DeepSeek/MiMo), y sistema de suscripciones con pasarela de pago.

**Usuario objetivo:** Escritores de historias originales y fanfics que necesitan organizar universos complejos, mantener coherencia narrativa, y publicar en plataformas como AO3.

**Plataformas:** Web (navegador) + App móvil nativa (React Native/Expo)

---

## Tech Stack

### Frontend Web
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19 | UI framework |
| Vite | 6+ | Build tool |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4 | Estilos utility-first |
| MUI | 9 | Componentes UI (selects, modals, forms) |
| Zustand | 5 | State management |
| TipTap | 2.x | Editor de texto enriquecido |
| React Flow | 1.x | Diagramas (relaciones, mapas, timeline visual) |
| React Router | 7 | Navegación SPA |
| Lucide React | latest | Iconografía |
| Recharts | latest | Estadísticas/gráficas |
| Framer Motion | latest | Animaciones |

### Frontend Móvil
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React Native | latest | App móvil nativa |
| Expo | latest | Toolchain RN |
| React Native Paper | latest | UI components |
| TipTap (webview) | - | Editor en móvil via WebView |

### Backend
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 22 LTS | Runtime |
| Fastify | 5 | HTTP framework |
| TypeScript | 5.x | Type safety |
| Prisma | 6+ | ORM para Supabase |
| Zod | 3.x | Validación de esquemas |
| BetterAuth | latest | Autenticación |
| Socket.io | latest | WebSocket (notas en tiempo real, sugerencias IA) |
| Stripe | latest | Pasarela de pago |
| simple-git | latest | Versionado de documentos |

### Infraestructura
| Servicio | Propósito |
|----------|-----------|
| Supabase | PostgreSQL + Storage (imágenes, archivos) |
| Vercel | Hosting frontend web |
| Railway/Render | Hosting backend |
| Expo EAS | Build y distribución app móvil |

### Integraciones IA
| API | Propósito |
|-----|-----------|
| DeepSeek | Chat, Character.AI, sugerencias |
| MiMo | Análisis de coherencia, autocompletado |

---

## Comandos

```bash
# Frontend (web)
cd frontend
pnpm install
pnpm dev               # localhost:5173
pnpm build
pnpm lint
pnpm typecheck
pnpm test

# Backend
cd backend
pnpm install
pnpm dev               # localhost:3001
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio

# Ambos (raíz)
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test

# Móvil
cd mobile
pnpm install
pnpm start             # Expo dev server
pnpm android
pnpm ios
```

---

## Estructura del Proyecto

```
App Escritura/
├── frontend/                    # App React Web
│   ├── src/
│   │   ├── components/
│   │   │   ├── editor/          # TipTap editor + extensiones
│   │   │   │   ├── DocumentEditor.tsx
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   ├── NotesPanel.tsx
│   │   │   │   ├── AIPanel.tsx
│   │   │   │   └── extensions/  # Extensiones TipTap custom
│   │   │   ├── characters/      # Fichas, evolución, árbol genealógico
│   │   │   ├── timeline/        # Línea del tiempo
│   │   │   ├── relations/       # Mapa de relaciones (React Flow)
│   │   │   ├── lore/            # Lore, razas, glosario, criaturas
│   │   │   ├── worldmap/        # Mapa mundial (React Flow)
│   │   │   ├── structure/       # Tablero Trello/Asana
│   │   │   ├── subplots/        # Subtramas
│   │   │   ├── stats/           # Estadísticas
│   │   │   ├── export/          # Exportación PDF/MD/HTML
│   │   │   ├── sharing/         # Beta reader, comentarios
│   │   │   ├── tags/            # Etiquetas AO3
│   │   │   ├── story-setup/     # Wizard creación de historia
│   │   │   ├── sidebar/         # Navegación
│   │   │   ├── branches/        # Gestión de ramas
│   │   │   ├── payment/         # Suscripciones, planes
│   │   │   └── ui/              # Componentes genéricos
│   │   ├── pages/
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Editor.tsx
│   │   │   ├── StorySetup.tsx
│   │   │   ├── Characters.tsx
│   │   │   ├── Timeline.tsx
│   │   │   ├── Relations.tsx
│   │   │   ├── Lore.tsx
│   │   │   ├── Structure.tsx
│   │   │   ├── Stats.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── Pricing.tsx
│   │   │   └── SharedDocument.tsx
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── types/
│   │   ├── lib/
│   │   └── styles/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── users.ts
│   │   │   ├── documents.ts
│   │   │   ├── branches.ts
│   │   │   ├── chapters.ts
│   │   │   ├── notes.ts
│   │   │   ├── characters.ts
│   │   │   ├── timeline.ts
│   │   │   ├── relations.ts
│   │   │   ├── lore.ts
│   │   │   ├── races.ts
│   │   │   ├── glossary.ts
│   │   │   ├── worldmap.ts
│   │   │   ├── structure.ts
│   │   │   ├── subplots.ts
│   │   │   ├── tags.ts
│   │   │   ├── stats.ts
│   │   │   ├── export.ts
│   │   │   ├── sharing.ts
│   │   │   ├── payments.ts
│   │   │   ├── subscriptions.ts
│   │   │   └── ai.ts
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   ├── auth.ts
│   │   │   ├── stripe.ts
│   │   │   ├── ai-client.ts
│   │   │   ├── git-service.ts
│   │   │   └── rag-service.ts
│   │   ├── types/
│   │   └── index.ts
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── mobile/                      # App React Native/Expo
│   ├── src/
│   │   ├── screens/
│   │   ├── components/
│   │   ├── navigation/
│   │   ├── stores/
│   │   ├── services/
│   │   └── types/
│   ├── app.json
│   └── package.json
│
├── docs/
├── tasks/
├── package.json
└── pnpm-workspace.yaml
```

---

## Code Style

### Convenciones generales
- **Nombres:** camelCase para variables/functions, PascalCase para componentes/types, UPPER_SNAKE para constantes
- **Archivos:** kebab-case para archivos, PascalCase para componentes
- **Imports:** React → librerías externas → componentes → hooks → utils → tipos
- **No `any`** sin justificación documentada
- **No comentarios** salvo que se pidan explícitamente

### Ejemplo componente

```tsx
import { useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

import { useDocumentStore } from '@/stores/document-store';
import { updateDocument } from '@/services/documents';
import type { Document } from '@/types/document';

interface DocumentEditorProps {
  documentId: string;
  initialContent: Document['content'];
}

export function DocumentEditor({ documentId, initialContent }: DocumentEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const setCurrentDocument = useDocumentStore((s) => s.setCurrentDocument);

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
    onUpdate: ({ editor }) => {
      // Auto-save debounce
    },
  });

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setIsSaving(true);
    try {
      await updateDocument(documentId, { content: editor.getJSON() });
    } finally {
      setIsSaving(false);
    }
  }, [editor, documentId]);

  return (
    <div className="flex flex-col h-full">
      <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
    </div>
  );
}
```

### Ejemplo endpoint

```ts
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const updateDocumentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.record(z.unknown()).optional(),
});

const documentsRoutes: FastifyPluginAsync = async (app) => {
  app.patch('/:id', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateDocumentSchema.parse(request.body);
    const document = await prisma.document.update({
      where: { id, userId: request.user.id },
      data: body,
    });
    return document;
  });
};

export default documentsRoutes;
```

---

## Testing Strategy

### Framework
- **Frontend:** Vitest + React Testing Library + jsdom
- **Backend:** Vitest + Supertest
- **E2E:** Playwright (futuro)

### Niveles
| Nivel | Qué cubrir | Herramienta |
|-------|-----------|-------------|
| Unit | Utilidades, validaciones, hooks, stores | Vitest |
| Integration | Componentes con stores, endpoints API | Vitest + RTL / Supertest |
| E2E | Flows completos (futuro) | Playwright |

### Cobertura
- **MVP:** 70% en lógica de negocio (services, stores)
- **Prioridad:** auth, CRUD documentos, IA, pagos

---

## Boundaries

### Always
- Ejecutar `pnpm typecheck` antes de commits
- Ejecutar `pnpm lint` antes de commits
- Validar inputs con Zod en backend
- TypeScript estricto (no `any`)
- Manejar errores explícitamente
- Proteger endpoints con autenticación
- Verificar permisos por rol y suscripción
- Nunca exponer API keys de IA al frontend

### Ask First
- Cambios en schema Prisma
- Agregar dependencias npm
- Cambiar estructura API REST
- Modificar configuración de build
- Alterar estrategia de autenticación
- Cambiar precios de suscripciones

### Never
- Commitear secrets o API keys
- Desactivar TypeScript strict mode
- Eliminar tests sin aprobación
- Usar `any` sin justificación
- Permitir que la IA escriba la historia por el usuario
- Exponer endpoints de IA sin autenticación
- Editar archivos generados (prisma client, build output)

---

## Sistema de Roles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **Superadmin** | Dueño de la plataforma | Acceso total, funciones ocultas (copiar/pegar), ver todas las cuentas |
| **Escritor** | Usuario creador | Crea/gestiona historias, personajes, universo |
| **Lector/Beta Reader** | Accede por link | Lee documento, deja comentarios (sin cuenta = "Anónimo") |
| **Colaborador** | Co-escritor | Edita historias de otro usuario asignado |

---

## Sistema de Suscripciones

### GRATIS — $0

| Función | Límite |
|---------|--------|
| Escritura básica (docs, capítulos, subpáginas) | Sin límite |
| Notas básicas | ✅ |
| Personajes | 5 por historia |
| Modo directo + guiado | ✅ |
| Exportar PDF/Markdown | ✅ |
| Ramas/versionado | 1 rama extra |
| Línea del tiempo | Sencilla (solo eventos) |
| Mapa de relaciones | 3 personajes máximo |
| Lore, razas, glosario, mapa | 1 entrada de lore |
| Subtramas | ❌ |
| Estadísticas | Básicas (palabras, tiempo) |
| Exportar HTML/AO3 | ❌ |
| Compartir Beta Reader | Sin límite |
| Modo IA | ❌ |

### PRO — ~$8/mo

Todo lo gratis sin límites + desbloquea:

| Función | |
|---------|--|
| Personajes | Sin límite |
| Ramas/versionado | Sin límite |
| Línea del tiempo avanzada | Con personajes |
| Mapa de relaciones | Sin límite |
| Evolución de personajes | ✅ |
| Lore, razas, glosario, mapa | Sin límite |
| Subtramas | ✅ |
| Estadísticas GitHub-style | ✅ |
| Exportar HTML/AO3 + templates | ✅ |
| Modo IA | ❌ |

### PREMIUM CHAT — ~$5-8/mo

Pro + modo IA chat:

| Incluye | Tokens/mo | Pay-as-you-go |
|---------|-----------|---------------|
| Chat companion (conoce historia, sugiere avances) | ~100K tokens (~200 msgs) | $2/50K tokens extra |

### PREMIUM CHARACTERS — ~$10-14/mo

Pro + chat + Character.AI:

| Incluye | Tokens/mo | Pay-as-you-go |
|---------|-----------|---------------|
| Chat + hablar con personajes en rol | ~200K tokens (~400 msgs) | $2/50K tokens extra |

### PREMIUM FULL — ~$18-25/mo

Pro + todos los modos IA:

| Incluye | Tokens/mo | Pay-as-you-go |
|---------|-----------|---------------|
| Chat + Character.AI + Sugerencias (tiempo real) | ~400K tokens (~800 msgs) | $2/50K tokens extra |

---

## Modos de IA

### Modo Chat
- Companion conversacional, tono informal y amigable
- Conoce toda la historia en tiempo real (RAG)
- Guarda contexto: personajes, timeline, lore, universo
- Detecta estilo de escritura del usuario (muletillas, narración)
- Sugiere avances cuando hay bloqueo
- **BLOQUEO:** Nunca escribe la historia. Si piden "continúa la escena" sin dirección → se niega. Si dan dirección → sugiere en chat, no permite copiar.

### Modo Character.AI
- Chat tipo rol con personajes creados por el usuario
- Basado en ficha del personaje + contexto de la historia
- Select de hasta qué capítulo tiene conocimiento el personaje
- Tiempo real según progreso de la historia

### Modo Sugerencias
- Lee la historia en tiempo real
- Marca inconsistencias en rojo (edades, hechos, relaciones)
- Detecta agujeros de guión
- Sugiere autocompletado para personajes si ya se escribió
- Funciona con fichas de personajes, timeline, lore

---

## Funcionalidades Principales

### 1. Documentos y Capítulos
- Documento = copia de Google Docs (editor TipTap)
- Capítulo = nivel superior dentro del documento
- Subpáginas = hijos del capítulo (cap 2.1, 2.2...)
- Modal inicial: nombre de historia + descripción (opcional)
- Descripción sugerida por IA si hay contenido (solo sugerencia, usuario copia manualmente)

### 2. Notas
- Apartado fijo o colapsable dentro del documento
- Postits que se pueden crear/leer/editar
- Alcance: global (todas las ramas/subpáginas), por rama, o por subpágina
- Colapsables para no ocupar más de una página

### 3. Versionado Git
- Rama principal ("main")
- Crear ramas desde cualquier rama (main → Universo 1 → Universo 1.1)
- Fusiones entre ramas
- Historial de cambios por rama
- Implementado con `simple-git` en backend

### 4. Modo de Creación de Historia

#### Modo Directo
- Crear documento → escribir directamente
- Modal: nombre + descripción (opcional)

#### Modo Guiado
Preguntas AO3:
- Rating (General, Teen, Mature, Explicit)
- Tipo (Romance, Ciencia Ficción, Drama, etc.)
- ¿Es fanfic? → Si es sí: preguntar fandom, crear carpeta
- Categorías de pareja (F/F, M/M, Multi, Other)
- Ships (con opción de carpeta por ship)
- Personajes (autocompletado IA si hay contenido: detecta canon vs OC)
- Etiquetas (sistema AO3 + sugerencia IA)
- Tipo de narrador

Preguntas de estructura:
- Duración estimada (capítulos, palabras)
- ¿Modo guiado?

Si guiado:
- ¿Tipo de final? (feliz/malo)
- ¿Vida de protagonistas al final?
- ¿Evolución del personaje principal?
- ¿Estado mental/físico al inicio?
- ¿Mayores problemas a enfrentar?

Estructura en 4 partes:
- **Inicio:** Primeras escenas, presentación personajes, dinámicas, estado actual
- **Desarrollo:** Incidente detonador, cómo afecta personajes, escenas importantes sugeridas
- **Climax:** Momento cúspide, giro de trama, mayor peligro, cambio de mentalidad
- **Final:** ¿Qué aprendieron? ¿Qué cambió?
- **Datos extra**

### 5. Universo

#### Personajes
Formulario completo:
- Imagen (subir o pegar del portapapeles)
- Nombre
- Apodos (etiquetas)
- Edad, Género (select + custom), Altura
- Orientación sexual (select + custom)
- Estado civil, Especie
- Lugar/Fecha de nacimiento
- Rol en historia (Principal, Secundario, Extra) + especificación
- Motivaciones, Debilidades, Conflicto interno
- Personalidad (IA autocompletado si hay historia)
- Virtudes, Defectos (IA autocompletado)
- Trabajo/Estudios (IA autocompletado)
- Hijos (select numérico + select de personajes para árbol genealógico)
- Forma de vestir, Habilidades, Salud, Hobbies (IA autocompletado)
- Datos extra

Sub-apartados:
- Árboles genealógicos
- Mapa de alturas
- Filtros por cada select del formulario + alturas

#### Evolución de Personaje
- Crear "evolución" = copia del personaje con cambios
- Mantiene características primordiales
- Editable: nombre, apariencia, personalidad, etc.
- Apartado: qué evolucionó y por qué
- Solo disponible después de primera aparición (timeline)
- En mapa de relaciones: interactúa con evoluciones

#### Línea del Tiempo
- Eventos con fecha/momento
- Si se completó modo guiado → carga automáticamente
- Personajes involucrados por evento
- IA autocompletado si hay historia escrita

#### Mapa de Relaciones (React Flow)
- Nodos = personajes
- Conexiones = tipo de relación (romance, amigos, enemigos, familia)
- Interactúa con evoluciones
- Filtros por tipo de relación

#### Lore
- Nombre + descripción
- Select tipo (Magia, Facciones, Religión, etc.)
- Límites del lore
- IA: rellenar con PDF escaneado (OCR)

#### Bestias/Criaturas
- Nombre, especie (select + custom), tipo de peligro, descripción

#### Razas/Pueblos
- Nombre, clasificación (select + custom)
- Descripción general, características físicas (IA autocompletado)
- ¿Tiene magia? → Si sí: descripción (IA autocompletado)
- Esperanza de vida (número), idioma
- Cultura, religión, origen, territorio (IA autocompletado)

#### Glosario
- Palabra, pronunciación, significado

#### Mapa Mundial (React Flow)
- Nodos = ubicaciones
- Conexiones = rutas entre ubicaciones
- Visual drag & drop

### 6. Estructura (Trello/Asana)
- Tablero con columnas: Inicio, Desarrollo, Climax, Conclusión (customizable)
- Tarjetas: capítulos, personajes, documentos
- Drag & drop entre columnas
- Vista por carpeta o por documento

### 7. Subtramas
- Historias paralelas a la trama principal
- Comparten universo principal
- IA sugerencia: ¿se entrelaza con historia principal? ¿Es complementaria? ¿Residual?

### 8. Estadísticas
- Palabras escritas (total, por día, por carpeta)
- Horas dedicadas (con frases motivacionales)
- Días consecutivos (racha)
- Promedio diario
- Lista tipo GitHub (contribuciones por día)
- Por escrito, por carpeta, por cuenta

### 9. Exportación
- PDF
- Markdown
- HTML (con CSS simple)
- "Usar como HTML (AO3)": editor visual para formatos
  - Subir audios, videos de YouTube
  - Plantillas o creación de visuales
  - IA ayuda a crear templates HTML/CSS
- Exportar directamente a cuenta AO3

### 10. Compartir / Beta Reader
- Link compartible del documento
- Con o sin cuenta para ver
- Comentarios en la historia
- Sin cuenta → "Anónimo comentó:..."
- Sin límite de links para todos los tiers

### 11. Etiquetas (AO3 Style)
- Sistema de etiquetas similar a AO3
- IA sugiere etiquetas basado en contenido
- Filtros por etiquetas

### 12. Pasarela de Pago
- Stripe integration
- Planes: Gratis, Pro, Premium Chat, Premium Characters, Premium Full
- Pay-as-you-go para tokens extra
- Gestión de suscripción (upgrade, downgrade, cancelar)

---

## Success Criteria

### MVP (Fase 0-5)
- [ ] Usuario puede registrarse y login
- [ ] Usuario tiene rol asignado (Escritor por defecto)
- [ ] Usuario puede crear/editar/eliminar proyectos con carpetas
- [ ] Usuario puede crear documento con modal (nombre + descripción)
- [ ] Editor TipTap funcional (bold, italic, headings, lists, imágenes)
- [ ] Capítulos y subpáginas dentro del documento
- [ ] Notas básicas (crear, leer, editar, colapsar)
- [ ] Guardado automático
- [ ] Modo oscuro/claro
- [ ] App carga en < 2s en 4G

### Fase 6-8 (Features Core)
- [ ] Versionado Git (ramas, fusiones)
- [ ] Modo directo y modo guiado de creación
- [ ] Personajes con formulario completo
- [ ] Línea del tiempo básica
- [ ] Mapa de relaciones (React Flow)
- [ ] Lore, razas, glosario
- [ ] Exportación PDF/Markdown

### Fase 9-11 (IA + Avanzado)
- [ ] Modo IA Chat funcional
- [ ] Modo Character.AI funcional
- [ ] Modo Sugerencias (detección de inconsistencias)
- [ ] Etiquetas AO3 con sugerencia IA
- [ ] Evolución de personajes
- [ ] Mapa mundial (React Flow)
- [ ] Subtramas
- [ ] Estadísticas GitHub-style
- [ ] Exportación HTML/AO3

### Fase 12-13 (Pagos + Móvil)
- [ ] Pasarela de pago Stripe funcional
- [ ] 5 tiers de suscripción funcionando
- [ ] Pay-as-you-go para tokens
- [ ] Límites por tier respetados
- [ ] App móvil básica funcional (React Native/Expo)

### Fase 14 (Polish)
- [ ] Responsive design (320px+)
- [ ] Loading states + error handling
- [ ] Performance optimization (LCP < 2.5s)
- [ ] No errores TypeScript en build
- [ ] No errores lint en build

---

## Respuestas a Preguntas Clave

### 1. Independencia de la App Móvil
**Decisión:** La app móvil NO debe depender más que del Backend o de las API para funcionar. Prioridad máxima en independencia.
- La app móvil se comunica EXCLUSIVAMENTE con nuestro backend via REST API
- Sin dependencias directas a servicios externos desde el móvil
- Toda lógica de negocio, autenticación, y procesamiento de IA pasa por el backend
- La app móvil es un "cliente tonto" que solo renderiza y envía/recibe datos

### 2. Integración AO3
**Decisión:** Dos opciones para el usuario (el usuario decide):
- **Opción A:** Login a cuenta AO3 + web scraping SIN mantener datos (el backend hace scraping, no almacena credenciales de AO3)
- **Opción B:** Copiar y pegar manualmente (el usuario exporta HTML y lo pega en AO3)
- Implementación: Backend ofrece endpoint de scraping con Puppeteer/Playwright, pero las credenciales de AO3 NUNCA se almacenan

### 3. Escala de Usuarios
**Decisión:** ~100 usuarios iniciales
- Esto simplifica la infraestructura: no necesitamos auto-scaling complejo
- Railway/Render con plan básico es suficiente
- Supabase plan gratuito o pro básico
- Conexiones a DB: pool de 10-20 conexiones es suficiente

### 4. Modo Character.AI
**Decisión:** Solo texto (sin voz/text-to-speech)
- Interfaz de chat de texto simple
- Sin dependencias de TTS/STT
- Más barato de implementar y mantener
- Mejor rendimiento en móvil

### 5. OCR para Lore
**Decisión:** Soporte para PDFs escaneados (imágenes) + PDFs de texto
- Usar proyectos OCR de código abierto (no gastar en APIs externas)
- Opciones candidatas:
  - **Tesseract.js** (JavaScript nativo, funciona en backend Node.js)
  - **PaddleOCR** (Python, mejor precisión, necesita microservicio)
  - **EasyOCR** (Python, buena precisión multilingüe)
- Recomendación: Tesseract.js para el backend (sin dependencia Python), con pre-procesamiento de imágenes para mejorar precisión

---

## Assumptions (Actualizadas)

1. Backend y frontend se comunican via REST API + WebSocket para tiempo real
2. Supabase solo para PostgreSQL y Storage, no para Auth (usamos BetterAuth)
3. Llamadas a IA van por el backend (proteger API keys)
4. Editor TipTap con extensiones custom
5. Sin colaboración en tiempo real entre usuarios (solo un usuario edita a la vez)
6. Deploy: Vercel (frontend) + Railway (backend) + Expo EAS (móvil)
7. Monorepo con pnpm workspaces
8. DeepSeek/MiMo como proveedor de IA (muy bajo costo)
9. El sistema de versionado es por documento, no por proyecto completo
10. Las notas se almacenan como JSON separado del contenido del documento
11. **App móvil es independiente:** solo depende del backend, sin servicios externos directos
12. **AO3 scraping es opcional:** el usuario puede copiar/pegar o usar scraping
13. **OCR con código abierto:** Tesseract.js en backend, sin costos de API
14. **Character.AI solo texto:** sin voz para MVP
15. **Escala pequeña:** ~100 usuarios, infraestructura básica suficiente

# Plan: Fix Eliminación de Documentos + Loader en Quick Create

## Overview
Tres problemas de la Fase 2:
1. **No existen botones de eliminar** en `DocumentsPage` (proyectos) ni `FolderPage` (documentos). Los únicos deletes están en el sidebar del editor, ocultos con hover.
2. **Backend/Store fallan silenciosamente** — cascade rota en Prisma, errores capturados pero nunca mostrados, estado stale al eliminar.
3. **"Crear Documento rápido"** no desactiva el botón ni muestra loader, generando duplicados.

## Architecture Decisions
- Usar i18n existente en vez de strings hardcodeados
- Confirmación nativa (`confirm()`) es suficiente por ahora — no crear componente modal custom
- Loader inline en `QuickAction` con prop `isLoading` + `disabled`
- Botones de eliminar visibles (no `opacity-0`) en las páginas principales

---

## Task 1: Fix Prisma cascade en Folder → Document

**Descripción:** La relación `Document.folder` no tiene `onDelete: Cascade`. Eliminar una carpeta con documentos lanza error de Prisma.

**Cambios:**
- `backend/prisma/schema.prisma`: Agregar `onDelete: Cascade` a `folder Folder?`
- Migración: `pnpm prisma migrate dev --name fix-folder-cascade`

**Acceptance criteria:**
- [ ] Eliminar carpeta con documentos no lanza error de Prisma
- [ ] Documentos dentro de la carpeta se eliminan en cascada

**Verificación:**
- [ ] `pnpm prisma migrate dev` sin errores
- [ ] Test manual: crear carpeta con doc, eliminar carpeta, verificar

**Archivos:** `backend/prisma/schema.prisma`
**Tamaño:** XS

---

## Task 2: Fix `deleteProject` — limpiar estado completo

**Descripción:** `deleteProject` solo limpia `currentProject` pero deja `documentTree` y `currentDocument` stale.

**Cambios:**
- `frontend/src/stores/document-store.ts`: Limpiar `documentTree`, `currentDocument` y `currentProject` al eliminar el proyecto activo.

**Acceptance criteria:**
- [ ] Al eliminar proyecto actual → `documentTree` vacío, `currentDocument` null
- [ ] Al eliminar otro proyecto → no afecta al actual

**Archivos:** `frontend/src/stores/document-store.ts`
**Tamaño:** XS

---

## Task 3: Agregar botón de eliminar en `DocumentsPage`

**Descripción:** `DocumentsPage.tsx` muestra proyectos como cards pero NO tiene botón de eliminar. Agregar botón Trash2 visible en cada card de proyecto.

**Cambios:**
- `frontend/src/pages/DocumentsPage.tsx`:
  - Importar `deleteProject` del store
  - Importar `Trash2` de lucide-react
  - Agregar botón de eliminar en cada card de proyecto (visible, no hover-only)
  - `confirm()` antes de eliminar
  - Navegar a `/app/documents` si se elimina el proyecto activo

**Acceptance criteria:**
- [ ] Cada card de proyecto tiene un botón de eliminar visible
- [ ] Click → confirm → elimina el proyecto
- [ ] La lista se actualiza después de eliminar

**Archivos:** `frontend/src/pages/DocumentsPage.tsx`
**Tamaño:** S

---

## Task 4: Agregar botón de eliminar en `FolderPage`

**Descripción:** `FolderPage.tsx` muestra documentos dentro de un proyecto pero NO tiene botón de eliminar. Agregar botón Trash2 visible en cada item de documento.

**Cambios:**
- `frontend/src/pages/FolderPage.tsx`:
  - Importar `deleteDocument` del store
  - Importar `Trash2` de lucide-react
  - Agregar botón de eliminar en cada item de documento (visible, no hover-only)
  - `confirm()` antes de eliminar
  - Recargar el árbol después de eliminar

**Acceptance criteria:**
- [ ] Cada documento tiene un botón de eliminar visible
- [ ] Click → confirm → elimina el documento
- [ ] La lista se actualiza después de eliminar

**Archivos:** `frontend/src/pages/FolderPage.tsx`
**Tamaño:** S

---

## Task 5: Mostrar errores de eliminación al usuario

**Descripción:** Los errores se capturan en el store pero nunca se muestran. Agregar feedback visual donde se usa delete.

**Cambios:**
- `frontend/src/pages/DocumentsPage.tsx`: Mostrar `error` del store
- `frontend/src/pages/FolderPage.tsx`: Mostrar `error` del store
- `frontend/src/components/sidebar/ProjectTree.tsx`: Mostrar `error` del store
- `frontend/src/components/sidebar/Sidebar.tsx`: Mostrar `error` del store

**Acceptance criteria:**
- [ ] Si la eliminación falla, el usuario ve un mensaje de error
- [ ] El error desaparece al hacer la siguiente acción

**Archivos:** 4 componentes
**Tamaño:** S

---

## Task 6: i18n en textos de eliminación

**Descripción:** Textos hardcodeados en español en confirmaciones y botones de eliminar.

**Cambios:**
- `frontend/src/pages/DocumentsPage.tsx`: Usar `t()` para confirm y titles
- `frontend/src/pages/FolderPage.tsx`: Usar `t()` para confirm y titles
- `frontend/src/components/sidebar/ProjectTree.tsx`: Usar `t()` para confirm y title
- `frontend/src/components/sidebar/Sidebar.tsx`: Usar `t()` para confirm
- `frontend/src/components/editor/ChapterTree.tsx`: Usar `t()` para title
- Agregar keys a `es.json` y `en.json`

**Acceptance criteria:**
- [ ] Todos los textos de eliminación usan i18n
- [ ] Cambiar idioma cambia los textos

**Archivos:** 5 componentes + 2 JSONs
**Tamaño:** M

---

## Task 7: Agregar `isLoading` prop a `QuickAction`

**Descripción:** `QuickAction` no tiene estado de loading.

**Cambios:**
- `frontend/src/components/ui/QuickAction.tsx`:
  - Agregar prop `isLoading?: boolean`
  - Desactivar botón + spinner cuando loading

**Acceptance criteria:**
- [ ] `isLoading=true` → botón desactivado con spinner
- [ ] Sin `isLoading` → comportamiento original

**Archivos:** `frontend/src/components/ui/QuickAction.tsx`
**Tamaño:** XS

---

## Task 8: Conectar loader en `DashboardHome` + i18n

**Descripción:** `handleQuickDocument` no desactiva el botón. Strings hardcodeados.

**Cambios:**
- `frontend/src/pages/DashboardHome.tsx`:
  - Pasar `isLoading` del store al `QuickAction`
  - Usar `t('dashboard.quickDoc')` y `t('dashboard.quickDocDesc')`

**Acceptance criteria:**
- [ ] Click → botón desactivado con spinner
- [ ] No se crean duplicados con clicks múltiples
- [ ] Textos usan i18n

**Archivos:** `frontend/src/pages/DashboardHome.tsx`
**Tamaño:** XS

---

## Checkpoint: Después de Tasks 1-8

- [ ] Botón de eliminar visible en DocumentsPage (proyectos)
- [ ] Botón de eliminar visible en FolderPage (documentos)
- [ ] Botón de eliminar funciona en sidebar (ProjectTree + ChapterTree)
- [ ] Eliminar proyecto funciona end-to-end
- [ ] Eliminar documento funciona end-to-end
- [ ] Eliminar carpeta con documentos funciona (cascade)
- [ ] Errores de eliminación se muestran al usuario
- [ ] "Documento Rápido" muestra loader y no permite duplicados
- [ ] Todos los textos usan i18n
- [ ] `npx tsc --noEmit` sin errores
- [ ] `npx vite build` sin errores

---

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migración Prisma cascade puede requerir recrear relación | Medio | `--create-only` para revisar SQL |
| `confirm()` nativo bloqueado en iframes | Bajo | Solo desarrollo |

## Archivos a modificar: ~10
## Tamaño estimado: M (implementación en ~1-2 horas)

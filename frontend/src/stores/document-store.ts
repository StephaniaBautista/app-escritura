import { create } from 'zustand'
import type { Document, DocumentNode, Project, CreateProjectInput, Note, DocumentVersion } from '@/types/document'
import { projectsApi, documentsApi, notesApi, versionsApi } from '@/services/documents'
import { useToastStore } from './toast-store'
import { useActivityStore } from './activity-store'
import i18n from '@/i18n'

interface DocumentState {
  projects: Project[]
  currentProject: Project | null
  documentTree: DocumentNode[]
  currentDocument: Document | null
  isLoading: boolean
  error: string | null

  notes: Note[]
  projectNotes: Note[]
  notesLoading: boolean
  versions: DocumentVersion[]
  versionsLoading: boolean

  loadProjects: () => Promise<void>
  selectProject: (projectId: string) => Promise<void>
  createProject: (name: string, description?: string) => Promise<Project>
  updateProject: (id: string, data: Partial<CreateProjectInput>) => Promise<void>
  deleteProject: (id: string) => Promise<void>

  loadDocumentTree: (projectId: string) => Promise<void>
  loadDocument: (id: string) => Promise<void>
  createDocument: (data: { title: string; type?: 'document' | 'chapter' | 'subpage'; projectId: string; parentId?: string }) => Promise<Document>
  updateDocument: (id: string, data: { title?: string; content?: Record<string, unknown> }) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  duplicateDocument: (id: string) => Promise<Document>

  quickCreateDocument: () => Promise<Document>

  clearCurrentDocument: () => void

  loadNotes: (rootDocumentId: string, currentDocumentId?: string) => Promise<void>
  loadProjectNotes: (projectId: string) => Promise<void>
  createNote: (documentId: string, data: { title: string; content?: string }) => Promise<Note>
  createProjectNote: (projectId: string, data: { title: string; content?: string }) => Promise<Note>
  updateNote: (id: string, data: { title?: string; content?: string; isHidden?: boolean }) => Promise<void>
  deleteNote: (id: string) => Promise<void>

  loadVersions: (documentId: string) => Promise<void>
  createVersion: (documentId: string) => Promise<void>
  getVersion: (id: string) => Promise<DocumentVersion | null>
  restoreVersion: (id: string) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export const useDocumentStore = create<DocumentState>()((set, get) => ({
  projects: [],
  currentProject: null,
  documentTree: [],
  currentDocument: null,
  isLoading: false,
  error: null,

  notes: [],
  projectNotes: [],
  notesLoading: false,
  versions: [],
  versionsLoading: false,

  loadProjects: async () => {
    set({ isLoading: true, error: null })
    try {
      const projects = await projectsApi.list()
      set({ projects, isLoading: false })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
    }
  },

  selectProject: async (projectId: string) => {
    set({ isLoading: true, error: null })
    const cached = get().projects.find((p) => p.id === projectId)
    if (cached) {
      set({ currentProject: cached, documentTree: [] })
    }
    try {
      const page = await projectsApi.getById(projectId)
      set({ currentProject: page, documentTree: page.tree ?? [], isLoading: false })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
    }
  },

  createProject: async (name: string, description?: string) => {
    set({ isLoading: true, error: null })
    try {
      const project = await projectsApi.create({ name, description })
      set((state) => ({ projects: [project, ...state.projects], isLoading: false }))
      return project
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
      throw error
    }
  },

  updateProject: async (id: string, data) => {
    try {
      const updated = await projectsApi.update(id, data)
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, ...updated } : p)),
        currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...updated } : state.currentProject,
      }))
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
    }
  },

  deleteProject: async (id: string) => {
    try {
      await projectsApi.delete(id)
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject,
        documentTree: state.currentProject?.id === id ? [] : state.documentTree,
        currentDocument: state.currentProject?.id === id ? null : state.currentDocument,
      }))
      useToastStore.getState().success('Proyecto eliminado')
      useActivityStore.getState().removeByFolder(id)
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
    }
  },

  loadDocumentTree: async (projectId: string) => {
    try {
      const tree = await documentsApi.getTree(projectId)
      set({ documentTree: tree })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
    }
  },

  loadDocument: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const doc = await documentsApi.getById(id)
      set({ currentDocument: doc, isLoading: false })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
    }
  },

  createDocument: async (data) => {
    try {
      const doc = await documentsApi.create(data)
      if (data.type === 'document' || !data.type) {
        await documentsApi.create({
          title: i18n.t('editorApp.defaultTabName'),
          type: 'chapter',
          projectId: data.projectId,
          parentId: doc.id,
        })
      }
      await get().loadDocumentTree(data.projectId)
      return doc
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      throw error
    }
  },

  updateDocument: async (id: string, data) => {
    try {
      const updated = await documentsApi.update(id, data)
      if (get().currentDocument?.id === id) {
        set({ currentDocument: { ...get().currentDocument!, ...updated } })
      }
      if (data.title) {
        set((state) => ({
          documentTree: state.documentTree.map((d) => (d.id === id ? { ...d, title: data.title! } : d)),
        }))
      }
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
    }
  },

  duplicateDocument: async (id: string) => {
    try {
      const doc = await documentsApi.duplicate(id)
      const projectId = get().currentProject?.id
      if (projectId) {
        await get().loadDocumentTree(projectId)
      }
      useToastStore.getState().success(i18n.t('editorApp.duplicated'))
      return doc
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
      throw error
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await documentsApi.delete(id)
      const projectId = get().currentProject?.id
      if (projectId) {
        await get().loadDocumentTree(projectId)
      }
      if (get().currentDocument?.id === id) {
        set({ currentDocument: null })
      }
      useToastStore.getState().success('Documento eliminado')
      useActivityStore.getState().removeByDocument(id)
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
    }
  },


  quickCreateDocument: async () => {
    set({ isLoading: true, error: null })
    try {
      let projects = get().projects
      if (projects.length === 0) {
        projects = await projectsApi.list()
      }

      let targetProject = projects.find((p) => p.name === 'Documentos rápidos')
      if (!targetProject) {
        targetProject = await projectsApi.create({ name: 'Documentos rápidos' })
        set((state) => ({ projects: [targetProject!, ...state.projects] }))
      }

      const now = new Date()
      const title = `Documento ${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      const doc = await documentsApi.create({
        title,
        type: 'document',
        projectId: targetProject.id,
      })

      await documentsApi.create({
        title: i18n.t('editorApp.defaultTabName'),
        type: 'chapter',
        projectId: targetProject.id,
        parentId: doc.id,
      })

      set({ isLoading: false })
      return doc
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
      throw error
    }
  },

  clearCurrentDocument: () => set({ currentDocument: null }),

  loadNotes: async (rootDocumentId: string, currentDocumentId?: string) => {
    try {
      const needsSubtab = currentDocumentId && currentDocumentId !== rootDocumentId
      const [rootNotes, subtabNotes] = await Promise.all([
        notesApi.list(rootDocumentId),
        needsSubtab ? notesApi.list(currentDocumentId) : Promise.resolve([]),
      ])
      const merged = needsSubtab
        ? [...rootNotes, ...subtabNotes.filter((n) => n.documentId !== rootDocumentId)]
        : rootNotes
      set({ notes: merged, notesLoading: false })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), notesLoading: false })
    }
  },

  loadProjectNotes: async (projectId: string) => {
    set({ notesLoading: true, error: null })
    try {
      const projectNotes = await notesApi.listByProject(projectId)
      set({ projectNotes, notesLoading: false })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), notesLoading: false })
    }
  },

  createNote: async (documentId: string, data) => {
    try {
      const note = await notesApi.create(documentId, data)
      set((state) => ({ notes: [note, ...state.notes] }))
      return note
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
      throw error
    }
  },

  createProjectNote: async (projectId: string, data) => {
    try {
      const note = await notesApi.createForProject(projectId, data)
      set((state) => ({ projectNotes: [note, ...state.projectNotes] }))
      return note
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
      throw error
    }
  },

  updateNote: async (id: string, data) => {
    try {
      const updated = await notesApi.update(id, data)
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? { ...n, ...updated } : n)),
        projectNotes: state.projectNotes.map((n) => (n.id === id ? { ...n, ...updated } : n)),
      }))
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
    }
  },

  deleteNote: async (id: string) => {
    try {
      await notesApi.delete(id)
      set((state) => ({ notes: state.notes.filter((n) => n.id !== id) }))
      useToastStore.getState().success(i18n.t('notes.deleted'))
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
    }
  },

  loadVersions: async (documentId: string) => {
    set({ versionsLoading: true, error: null })
    try {
      const versions = await versionsApi.list(documentId)
      set({ versions, versionsLoading: false })
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), versionsLoading: false })
    }
  },

  createVersion: async (documentId: string) => {
    try {
      await versionsApi.create(documentId)
      await get().loadVersions(documentId)
      useToastStore.getState().success(i18n.t('versions.created'))
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
    }
  },

  getVersion: async (id: string) => {
    try {
      return await versionsApi.get(id)
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
      return null
    }
  },

  restoreVersion: async (id: string) => {
    try {
      const doc = await versionsApi.restore(id)
      if (get().currentDocument?.id === doc.id) {
        set({ currentDocument: { ...get().currentDocument!, ...doc } })
      }
      useToastStore.getState().success(i18n.t('versions.restored'))
    } catch (error: unknown) {
      const message = getErrorMessage(error)
      set({ error: message })
      useToastStore.getState().error(message)
    }
  },
}))

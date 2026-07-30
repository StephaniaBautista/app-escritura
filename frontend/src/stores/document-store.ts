import { create } from 'zustand'
import type { Document, DocumentNode, Project, CreateProjectInput } from '@/types/document'
import { projectsApi, documentsApi } from '@/services/documents'

interface DocumentState {
  projects: Project[]
  currentProject: Project | null
  documentTree: DocumentNode[]
  currentDocument: Document | null
  isLoading: boolean
  error: string | null

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

  quickCreateDocument: () => Promise<Document>

  clearCurrentDocument: () => void
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
    try {
      const [project, tree] = await Promise.all([
        projectsApi.getById(projectId),
        documentsApi.getTree(projectId),
      ])
      set({ currentProject: project, documentTree: tree, isLoading: false })
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
      }))
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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
    } catch (error: unknown) {
      set({ error: getErrorMessage(error) })
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

      set({ isLoading: false })
      return doc
    } catch (error: unknown) {
      set({ error: getErrorMessage(error), isLoading: false })
      throw error
    }
  },

  clearCurrentDocument: () => set({ currentDocument: null }),
}))

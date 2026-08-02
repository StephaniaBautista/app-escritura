import { create } from 'zustand'
import { branchesApi } from '@/services/branches'
import type { Branch, BranchGraphData, CreateBranchInput, MergeResult } from '@/types/branch'

interface BranchState {
  branches: Branch[]
  activeBranch: Branch | null
  graphData: BranchGraphData | null
  loading: boolean
  error: string | null

  loadBranches: (documentId: string) => Promise<void>
  createBranch: (documentId: string, data: CreateBranchInput) => Promise<Branch>
  switchBranch: (branchId: string) => Promise<void>
  renameBranch: (branchId: string, name: string) => Promise<void>
  deleteBranch: (branchId: string) => Promise<void>
  mergeBranch: (sourceBranchId: string, targetBranchId: string, resolution?: { content: unknown }) => Promise<MergeResult>
  loadGraph: (documentId: string) => Promise<void>
  setActiveBranch: (branch: Branch | null) => void
  clear: () => void
}

export const useBranchStore = create<BranchState>()((set, get) => ({
  branches: [],
  activeBranch: null,
  graphData: null,
  loading: false,
  error: null,

  loadBranches: async (documentId: string) => {
    set({ loading: true, error: null })
    try {
      const branches = await branchesApi.list(documentId)
      const { activeBranch } = get()
      const newActive = activeBranch
        ? branches.find((b) => b.id === activeBranch.id) ?? branches.find((b) => b.isMain) ?? branches[0] ?? null
        : branches.find((b) => b.isMain) ?? branches[0] ?? null

      set({ branches, activeBranch: newActive, loading: false })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar ramas'
      set({ error: message, loading: false })
    }
  },

  createBranch: async (documentId: string, data: CreateBranchInput) => {
    set({ loading: true, error: null })
    try {
      const branch = await branchesApi.create(documentId, data)
      set((s) => ({
        branches: [...s.branches, branch],
        loading: false,
      }))
      return branch
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al crear rama'
      set({ error: message, loading: false })
      throw error
    }
  },

  switchBranch: async (branchId: string) => {
    const { branches } = get()
    const branch = branches.find((b) => b.id === branchId)
    if (branch) {
      set({ activeBranch: branch })
    }
  },

  renameBranch: async (branchId: string, name: string) => {
    set({ loading: true, error: null })
    try {
      const updated = await branchesApi.rename(branchId, name)
      set((s) => ({
        branches: s.branches.map((b) => (b.id === branchId ? updated : b)),
        activeBranch: s.activeBranch?.id === branchId ? updated : s.activeBranch,
        loading: false,
      }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al renombrar rama'
      set({ error: message, loading: false })
      throw error
    }
  },

  deleteBranch: async (branchId: string) => {
    set({ loading: true, error: null })
    try {
      await branchesApi.delete(branchId)
      set((s) => {
        const remaining = s.branches.filter((b) => b.id !== branchId)
        const newActive = s.activeBranch?.id === branchId
          ? remaining.find((b) => b.isMain) ?? remaining[0] ?? null
          : s.activeBranch
        return { branches: remaining, activeBranch: newActive, loading: false }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al eliminar rama'
      set({ error: message, loading: false })
      throw error
    }
  },

  loadGraph: async (documentId: string) => {
    try {
      const graphData = await branchesApi.getGraph(documentId)
      set({ graphData })
    } catch (error: unknown) {
      console.error('[branch-store] Error loading graph:', error)
    }
  },

  mergeBranch: async (sourceBranchId: string, targetBranchId: string, resolution?: { content: unknown }) => {
    set({ loading: true, error: null })
    try {
      const result = await branchesApi.merge(sourceBranchId, {
        targetBranchId,
        ...(resolution ? { resolution } : {}),
      })
      set({ loading: false })
      return result
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al fusionar ramas'
      set({ error: message, loading: false })
      throw error
    }
  },

  setActiveBranch: (branch: Branch | null) => set({ activeBranch: branch }),

  clear: () => set({ branches: [], activeBranch: null, graphData: null, error: null }),
}))

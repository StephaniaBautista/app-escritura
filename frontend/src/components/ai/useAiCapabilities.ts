import { useEffect } from 'react'
import { useAiStore } from '@/stores/ai-store'

export function useAiCapabilities(projectId: string) {
  const state = useAiStore()
  const loadCapabilities = state.loadCapabilities
  useEffect(() => { void loadCapabilities(projectId) }, [projectId, state.projectId, loadCapabilities])
  return {
    capabilities: state.projectId === projectId ? state.capabilities : null,
    loading: state.projectId !== projectId || state.capabilityLoading,
    error: state.projectId === projectId ? state.capabilityError : null,
    retry: () => state.loadCapabilities(projectId),
  }
}

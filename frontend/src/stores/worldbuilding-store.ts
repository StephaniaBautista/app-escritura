import { create } from 'zustand'
import type {
  LoreEntry, LoreEntryInput,
  Race, RaceInput,
  GlossaryEntry, GlossaryEntryInput,
  Creature, CreatureInput,
  Location, LocationInput,
  WorldRoute, WorldRouteInput,
} from '@/types/worldbuilding'
import { worldbuildingApi } from '@/services/worldbuilding'
import { useToastStore } from './toast-store'

interface WorldbuildingState {
  lore: LoreEntry[]
  races: Race[]
  glossary: GlossaryEntry[]
  creatures: Creature[]
  locations: Location[]
  routes: WorldRoute[]
  isLoading: boolean

  loadLore: (projectId: string) => Promise<void>
  createLore: (projectId: string, data: LoreEntryInput) => Promise<LoreEntry | null>
  updateLore: (id: string, data: LoreEntryInput) => Promise<LoreEntry | null>
  removeLore: (id: string) => Promise<void>

  loadRaces: (projectId: string) => Promise<void>
  createRace: (projectId: string, data: RaceInput) => Promise<Race | null>
  updateRace: (id: string, data: RaceInput) => Promise<Race | null>
  removeRace: (id: string) => Promise<void>

  loadGlossary: (projectId: string) => Promise<void>
  createGlossary: (projectId: string, data: GlossaryEntryInput) => Promise<GlossaryEntry | null>
  updateGlossary: (id: string, data: GlossaryEntryInput) => Promise<GlossaryEntry | null>
  removeGlossary: (id: string) => Promise<void>

  loadCreatures: (projectId: string) => Promise<void>
  createCreature: (projectId: string, data: CreatureInput) => Promise<Creature | null>
  updateCreature: (id: string, data: CreatureInput) => Promise<Creature | null>
  removeCreature: (id: string) => Promise<void>

  loadLocations: (projectId: string) => Promise<void>
  createLocation: (projectId: string, data: LocationInput) => Promise<Location | null>
  updateLocation: (id: string, data: LocationInput) => Promise<Location | null>
  removeLocation: (id: string) => Promise<void>

  loadRoutes: (projectId: string) => Promise<void>
  createRoute: (projectId: string, data: WorldRouteInput) => Promise<WorldRoute | null>
  removeRoute: (id: string) => Promise<void>
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error desconocido'
}

export const useWorldbuildingStore = create<WorldbuildingState>()((set, get) => ({
  lore: [],
  races: [],
  glossary: [],
  creatures: [],
  locations: [],
  routes: [],
  isLoading: false,

  async loadLore(projectId) {
    set({ lore: await worldbuildingApi.listLore(projectId) })
  },
  async createLore(projectId, data) {
    try {
      const entry = await worldbuildingApi.createLore(projectId, data)
      set({ lore: [...get().lore, entry] })
      return entry
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async updateLore(id, data) {
    try {
      const entry = await worldbuildingApi.updateLore(id, data)
      set({ lore: get().lore.map((e) => (e.id === id ? entry : e)) })
      return entry
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async removeLore(id) {
    try {
      await worldbuildingApi.deleteLore(id)
      set({ lore: get().lore.filter((e) => e.id !== id) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async loadRaces(projectId) {
    set({ races: await worldbuildingApi.listRaces(projectId) })
  },
  async createRace(projectId, data) {
    try {
      const race = await worldbuildingApi.createRace(projectId, data)
      set({ races: [...get().races, race] })
      return race
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async updateRace(id, data) {
    try {
      const race = await worldbuildingApi.updateRace(id, data)
      set({ races: get().races.map((r) => (r.id === id ? race : r)) })
      return race
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async removeRace(id) {
    try {
      await worldbuildingApi.deleteRace(id)
      set({ races: get().races.filter((r) => r.id !== id) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async loadGlossary(projectId) {
    set({ glossary: await worldbuildingApi.listGlossary(projectId) })
  },
  async createGlossary(projectId, data) {
    try {
      const entry = await worldbuildingApi.createGlossary(projectId, data)
      set({ glossary: [...get().glossary, entry] })
      return entry
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async updateGlossary(id, data) {
    try {
      const entry = await worldbuildingApi.updateGlossary(id, data)
      set({ glossary: get().glossary.map((e) => (e.id === id ? entry : e)) })
      return entry
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async removeGlossary(id) {
    try {
      await worldbuildingApi.deleteGlossary(id)
      set({ glossary: get().glossary.filter((e) => e.id !== id) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async loadCreatures(projectId) {
    set({ creatures: await worldbuildingApi.listCreatures(projectId) })
  },
  async createCreature(projectId, data) {
    try {
      const creature = await worldbuildingApi.createCreature(projectId, data)
      set({ creatures: [...get().creatures, creature] })
      return creature
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async updateCreature(id, data) {
    try {
      const creature = await worldbuildingApi.updateCreature(id, data)
      set({ creatures: get().creatures.map((c) => (c.id === id ? creature : c)) })
      return creature
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async removeCreature(id) {
    try {
      await worldbuildingApi.deleteCreature(id)
      set({ creatures: get().creatures.filter((c) => c.id !== id) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async loadLocations(projectId) {
    set({ locations: await worldbuildingApi.listLocations(projectId) })
  },
  async createLocation(projectId, data) {
    try {
      const location = await worldbuildingApi.createLocation(projectId, data)
      set({ locations: [...get().locations, location] })
      return location
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async updateLocation(id, data) {
    try {
      const location = await worldbuildingApi.updateLocation(id, data)
      set({ locations: get().locations.map((l) => (l.id === id ? location : l)) })
      return location
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async removeLocation(id) {
    try {
      await worldbuildingApi.deleteLocation(id)
      set({
        locations: get().locations.filter((l) => l.id !== id),
        routes: get().routes.filter((r) => r.locationAId !== id && r.locationBId !== id),
      })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },

  async loadRoutes(projectId) {
    set({ routes: await worldbuildingApi.listRoutes(projectId) })
  },
  async createRoute(projectId, data) {
    try {
      const route = await worldbuildingApi.createRoute(projectId, data)
      set({ routes: [...get().routes, route] })
      return route
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
      return null
    }
  },
  async removeRoute(id) {
    try {
      await worldbuildingApi.deleteRoute(id)
      set({ routes: get().routes.filter((r) => r.id !== id) })
    } catch (err: unknown) {
      useToastStore.getState().error(getErrorMessage(err))
    }
  },
}))

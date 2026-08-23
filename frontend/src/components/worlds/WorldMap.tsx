import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import type { Connection, Edge, Node, NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Map as MapIcon, Plus } from 'lucide-react'
import { useWorldbuildingStore } from '@/stores/worldbuilding-store'
import { useToastStore } from '@/stores/toast-store'
import { InputDialog } from '@/components/ui/InputDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

type WorldNode = Node<{ label: string }>

export function WorldMap({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const { locations, routes, loadLocations, loadRoutes, createLocation, updateLocation, removeLocation, createRoute, removeRoute } = useWorldbuildingStore()
  const [showNew, setShowNew] = useState(false)
  const [deletingEdge, setDeletingEdge] = useState<Edge | null>(null)

  useEffect(() => {
    loadLocations(projectId)
    loadRoutes(projectId)
  }, [projectId, loadLocations, loadRoutes])

  const [nodes, setNodes, onNodesChange] = useNodesState<WorldNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const nodesFromLocations = useMemo<WorldNode[]>(() =>
    locations.map((loc) => ({
      id: loc.id,
      position: { x: loc.position?.x ?? 0, y: loc.position?.y ?? 0 },
      data: { label: loc.name },
      style: {
        background: 'var(--color-paper)',
        border: '1px solid var(--color-accent-violet)',
        color: 'var(--color-ink)',
        borderRadius: '12px',
        padding: '8px 14px',
        fontSize: '13px',
        fontWeight: 600,
      },
    })),
  [locations])

  useEffect(() => {
    setNodes(nodesFromLocations)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations])

  const edgesFromRoutes = useMemo<Edge[]>(() =>
    routes.map((route) => ({
      id: `route-${route.id}`,
      source: route.locationAId,
      target: route.locationBId,
      type: 'smoothstep',
      label: route.label ?? '',
      style: { stroke: 'var(--color-accent-violet)', strokeWidth: 2 },
      labelStyle: { fill: 'var(--color-ink-faint)', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: 'var(--color-paper)', fillOpacity: 0.9 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-accent-violet)' },
    })),
  [routes])

  useEffect(() => {
    setEdges(edgesFromRoutes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes])

  const persistPosition = useCallback(
    (id: string, position: { x: number; y: number }) => {
      void updateLocation(id, { position })
    },
    [updateLocation],
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange<WorldNode>[]) => {
      onNodesChange(changes)
      const dragEnd = changes.filter((c) => c.type === 'position' && !c.dragging)
      if (dragEnd.length > 0) {
        for (const change of dragEnd) {
          if (change.type === 'position' && change.position) {
            persistPosition(change.id, change.position)
          }
        }
      }
    },
    [onNodesChange, nodes, persistPosition],
  )

  const handleConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target || connection.source === connection.target) return
      const route = await createRoute(projectId, { locationAId: connection.source, locationBId: connection.target })
      if (route) toast.success(t('worldApp.routeCreated'))
    },
    [projectId, createRoute, toast, t],
  )

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      for (const node of deleted) {
        void removeLocation(node.id)
      }
    },
    [removeLocation],
  )

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      if (deleted.length > 0) setDeletingEdge(deleted[0])
    },
    [],
  )

  const confirmEdgeDelete = async () => {
    if (!deletingEdge) return
    const id = deletingEdge.id.replace('route-', '')
    await removeRoute(id)
    setDeletingEdge(null)
  }

  const handleCreate = async (name: string) => {
    const index = locations.length
    const position = { x: 80 + (index % 5) * 220, y: 80 + Math.floor(index / 5) * 160 }
    const location = await createLocation(projectId, { name, position })
    if (location) toast.success(t('worldApp.locationCreated'))
    setShowNew(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm" style={{ color: 'var(--color-ink-faint)' }}>
          {t('worldApp.mapSubtitle')} · {locations.length}
        </p>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90"
          style={{ background: 'var(--color-accent)' }}
        >
          <Plus className="w-4 h-4" />
          {t('worldApp.newLocation')}
        </button>
      </div>

      {locations.length === 0 ? (
        <div className="notebook-paper p-10 text-center">
          <MapIcon className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-accent-violet)' }} />
          <p className="font-display text-lg" style={{ color: 'var(--color-ink-light)' }}>{t('worldApp.mapEmpty')}</p>
        </div>
      ) : (
        <div
          className="h-[480px] overflow-hidden rounded-2xl border"
          style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodesDelete={handleNodesDelete}
            onEdgesDelete={handleEdgesDelete}
            fitView
            minZoom={0.2}
            maxZoom={2}
            deleteKeyCode={['Backspace', 'Delete']}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={24} size={1} color="var(--color-paper-lines)" />
            <Controls />
            <MiniMap pannable zoomable nodeColor="var(--color-accent-violet-light)" maskColor="rgba(0,0,0,0.05)" />
          </ReactFlow>
        </div>
      )}

      <InputDialog
        isOpen={showNew}
        title={t('worldApp.newLocation')}
        placeholder={t('worldApp.locationPlaceholder')}
        confirmLabel={t('common.save')}
        onSubmit={handleCreate}
        onCancel={() => setShowNew(false)}
      />

      <ConfirmDialog
        isOpen={deletingEdge !== null}
        title={t('worldApp.deleteRouteTitle')}
        message={t('worldApp.confirmDeleteRoute')}
        confirmLabel={t('common.delete')}
        onConfirm={confirmEdgeDelete}
        onCancel={() => setDeletingEdge(null)}
      />
    </div>
  )
}

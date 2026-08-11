import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  useNodesState,
  useEdgesState,
} from '@xyflow/react'
import type { Connection, Edge, Node, NodeChange } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { ArrowLeft, RefreshCw, StickyNote, Trash2 } from 'lucide-react'
import type { Character } from '@/types/character'
import type { CharacterRelationship, RelationshipType } from '@/types/relationship'
import type { Diagram } from '@/types/diagram'
import { useRelationshipsStore } from '@/stores/relationships-store'
import { useDiagramsStore } from '@/stores/diagrams-store'
import { useToastStore } from '@/stores/toast-store'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { CharacterNode, type CharacterNodeType } from './CharacterNode'
import { NoteNode, type NoteNodeData, type NoteNodeType } from './NoteNode'
import { RelationFilters } from './RelationFilters'
import { CreateRelationshipDialog } from './CreateRelationshipDialog'

type CanvasNode = CharacterNodeType | NoteNodeType

const EDGE_COLORS: Record<RelationshipType, string> = {
  romance: '#ec4899',
  friendship: '#22c55e',
  enemity: '#ef4444',
  family: '#8b5cf6',
  custom: '#f59e0b',
}

const nodeTypes = {
  character: CharacterNode,
  note: NoteNode,
}

interface DiagramCanvasProps {
  diagram: Diagram
  characters: Character[]
  relations: CharacterRelationship[]
  onBack: () => void
  onDelete: () => void
}

interface PendingConnection {
  source: string
  target: string
}

export function DiagramCanvas({ diagram, characters, relations, onBack, onDelete }: DiagramCanvasProps) {
  const { t } = useTranslation()
  const toast = useToastStore()
  const relationshipsStore = useRelationshipsStore()
  const [filter, setFilter] = useState<RelationshipType | 'all'>('all')
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null)
  const [edgesToDelete, setEdgesToDelete] = useState<Edge[]>([])
  const [saving, setSaving] = useState(false)

  const charById = useMemo(() => new Map(characters.map((c) => [c.id, c])), [characters])
  const layoutNodes = diagram.layout.nodes ?? []
  const layoutNotes = diagram.layout.notes ?? []
  const isCustom = diagram.type === 'custom'

  const [nodes, setNodes, onNodesChange] = useNodesState<CanvasNode>([])

  const handleNoteTextChange = useCallback((id: string, text: string) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? ({ ...n, data: { ...n.data, text } as NoteNodeData } as NoteNodeType) : n,
      ),
    )
  }, [setNodes])

  const initialNodes = useMemo<CanvasNode[]>(() => {
    const characterNodes: CharacterNodeType[] = layoutNodes
      .filter((n) => charById.has(n.id))
      .map((n) => ({
        id: n.id,
        type: 'character',
        position: n.position,
        data: { character: charById.get(n.id) as Character },
      }))
    const noteNodes: NoteNodeType[] = layoutNotes.map((n) => ({
      id: n.id,
      type: 'note',
      position: n.position,
      data: { text: n.text, onTextChange: handleNoteTextChange },
    }))
    return [...characterNodes, ...noteNodes]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutNodes, layoutNotes, charById, isCustom])

  useEffect(() => {
    setNodes(initialNodes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram.id])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const visibleEdges = useMemo(() => {
    if (diagram.type === 'familyTree') {
      const familyEdges: Edge[] = []
      for (const c of characters) {
        for (const parentId of c.parentIds) {
          if (!charById.has(parentId)) continue
          familyEdges.push({
            id: `family-${parentId}-${c.id}`,
            source: parentId,
            target: c.id,
            type: 'smoothstep',
            style: { stroke: 'var(--color-ink-faint)', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-ink-faint)' },
          })
        }
      }
      return familyEdges
    }
    const canvasIds = new Set(nodes.map((n) => n.id))
    return relations
      .filter((rel) => filter === 'all' || rel.type === filter)
      .filter((rel) => canvasIds.has(rel.characterAId) && canvasIds.has(rel.characterBId))
      .map((rel) => ({
        id: `rel-${rel.id}`,
        source: rel.characterAId,
        target: rel.characterBId,
        type: 'smoothstep',
        animated: rel.type === 'romance',
        label: (rel.type === 'custom' || rel.type === 'family') && rel.label ? rel.label : t(`diagramApp.type_${rel.type}`),
        style: { stroke: EDGE_COLORS[rel.type], strokeWidth: 2 },
        labelStyle: { fill: EDGE_COLORS[rel.type], fontSize: 10, fontWeight: 600 },
        labelBgStyle: { fill: 'var(--color-paper)', fillOpacity: 0.9 },
        markerEnd: { type: MarkerType.ArrowClosed, color: EDGE_COLORS[rel.type] },
      }))
  }, [nodes, relations, filter, diagram.type, characters, charById, t])

  useEffect(() => {
    setEdges(visibleEdges)
  }, [visibleEdges, setEdges])

  const persistLayout = useCallback(
    async (nodeList: Diagram['layout']['nodes'], noteList: Diagram['layout']['notes']) => {
      setSaving(true)
      const updated = await useDiagramsStore
        .getState()
        .saveLayout(diagram.id, { nodes: nodeList, notes: noteList })
      setSaving(false)
      if (updated) toast.success(t('diagramApp.layoutSaved'))
    },
    [diagram.id, t, toast],
  )

  const layoutFromNodes = useCallback(
    (list: CanvasNode[]) => {
      const nodeList = list
        .filter((n) => n.type === 'character')
        .map((n) => ({ id: n.id, position: n.position }))
      const noteList = list
        .filter((n) => n.type === 'note')
        .map((n) => ({ id: n.id, position: n.position, text: (n.data as NoteNodeData).text }))
      void persistLayout(nodeList, noteList)
    },
    [persistLayout],
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      onNodesChange(changes)
      const hasDragEnd = changes.some((c) => c.type === 'position' && !c.dragging)
      if (hasDragEnd) {
        layoutFromNodes(applyNodeChanges(changes, nodes))
      }
    },
    [onNodesChange, nodes, layoutFromNodes],
  )

  const handleConnect = useCallback((connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    setPendingConnection({ source: connection.source, target: connection.target })
  }, [])

  const handleCreateRelation = async (data: { type: RelationshipType; label: string | null; description: string | null }) => {
    if (!pendingConnection) return
    const rel = await relationshipsStore.create(diagram.projectId, {
      characterAId: pendingConnection.source,
      characterBId: pendingConnection.target,
      type: data.type,
      label: data.label,
      description: data.description,
    })
    setPendingConnection(null)
    if (rel) toast.success(t('diagramApp.relationshipCreated'))
  }

  const addNodes = useCallback(
    (next: CanvasNode[]) => {
      setNodes(next)
      layoutFromNodes(next)
    },
    [setNodes, layoutFromNodes],
  )

  const handleAddCharacter = (id: string) => {
    if (nodes.some((n) => n.id === id)) return
    const position = {
      x: 60 + (nodes.length % 5) * 260,
      y: 60 + Math.floor(nodes.length / 5) * 200,
    }
    addNodes([
      ...nodes,
      { id, type: 'character', position, data: { character: charById.get(id) as Character } },
    ])
  }

  const handleAddNote = () => {
    const id = `note-${Date.now()}`
    const position = {
      x: 60 + (nodes.length % 5) * 260,
      y: 140 + Math.floor(nodes.length / 5) * 200,
    }
    addNodes([
      ...nodes,
      { id, type: 'note', position, data: { text: '', onTextChange: handleNoteTextChange } },
    ])
  }

  const handleNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((d) => d.id))
      layoutFromNodes(nodes.filter((n) => !deletedIds.has(n.id)))
    },
    [nodes, layoutFromNodes],
  )

  const handleEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      const relEdges = deleted.filter((e) => e.id.startsWith('rel-'))
      if (relEdges.length > 0) setEdgesToDelete(relEdges)
    },
    [],
  )

  const confirmEdgeDelete = async () => {
    for (const edge of edgesToDelete) {
      const rel = relations.find((r) => `rel-${r.id}` === edge.id)
      if (rel) await relationshipsStore.remove(rel.id)
    }
    setEdgesToDelete([])
  }

  const availableCharacters = characters.filter((c) => !nodes.some((n) => n.id === c.id))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label={t('diagramApp.back')}
            className="rounded-lg p-2 hover:opacity-70"
            style={{ color: 'var(--color-ink-light)' }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="font-display text-xl sm:text-2xl font-bold truncate" style={{ color: 'var(--color-ink)' }}>
            {diagram.name}
          </h2>
          <span
            className="rounded-full border px-2 py-0.5 text-[11px] font-semibold"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-faint)' }}
          >
            {diagram.type === 'familyTree'
              ? t('diagramApp.family')
              : diagram.type === 'relationships'
                ? t('diagramApp.relationships')
                : t('diagramApp.custom')}
          </span>
          {saving && (
            <span className="text-[11px]" style={{ color: 'var(--color-ink-faint)' }}>
              {t('common.saving')}...
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:opacity-80"
          style={{ color: 'var(--color-danger, #dc2626)' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('common.delete')}
        </button>
      </div>

      {isCustom && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--color-ink-faint)' }}>
            {t('diagramApp.addCharacter')}:
          </span>
          {availableCharacters.length === 0 ? (
            <span className="text-xs" style={{ color: 'var(--color-ink-faint)' }}>
              {t('diagramApp.noCharacters')}
            </span>
          ) : (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleAddCharacter(e.target.value)
              }}
              className="rounded-lg border px-2 py-1 text-xs"
              style={{ background: 'var(--color-background)', borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink)' }}
              aria-label={t('diagramApp.addCharacter')}
            >
              <option value="">—</option>
              {availableCharacters.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleAddNote}
            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium hover:opacity-80"
            style={{ borderColor: 'var(--color-paper-lines)', color: 'var(--color-ink-light)' }}
          >
            <StickyNote className="h-3.5 w-3.5" />
            {t('diagramApp.addNote')}
          </button>
        </div>
      )}

      {diagram.type !== 'familyTree' && relations.length > 0 && (
        <RelationFilters active={filter} onChange={setFilter} />
      )}

      {diagram.type === 'familyTree' && (
        <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--color-ink-faint)' }}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t('diagramApp.connectHint')}
        </p>
      )}

      <div
        className="h-[560px] overflow-hidden rounded-2xl border"
        style={{ borderColor: 'var(--color-paper-lines)', background: 'var(--color-background)' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={isCustom ? handleConnect : undefined}
          onNodesDelete={handleNodesDelete}
          onEdgesDelete={handleEdgesDelete}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          deleteKeyCode={['Backspace', 'Delete']}
          nodesConnectable={isCustom}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={24} size={1} color="var(--color-paper-lines)" />
          <Controls />
          <MiniMap
            pannable
            zoomable
            nodeColor="var(--color-accent-violet-light)"
            maskColor="rgba(0,0,0,0.05)"
          />
        </ReactFlow>
      </div>

      {pendingConnection && (
        <CreateRelationshipDialog
          sourceName={charById.get(pendingConnection.source)?.name ?? ''}
          targetName={charById.get(pendingConnection.target)?.name ?? ''}
          onCancel={() => setPendingConnection(null)}
          onSave={handleCreateRelation}
        />
      )}

      <ConfirmDialog
        isOpen={edgesToDelete.length > 0}
        title={t('diagramApp.deleteRelationship')}
        message={t('diagramApp.relationshipDeleted')}
        confirmLabel={t('common.delete')}
        onConfirm={confirmEdgeDelete}
        onCancel={() => {
          setEdgesToDelete([])
          setEdges(visibleEdges)
        }}
      />
    </div>
  )
}

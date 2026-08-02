import { useRef, useEffect, useState, useCallback } from 'react'
import { useBranchStore } from '@/stores/branch-store'
import type { GraphNode } from '@/types/branch'

const NODE_RADIUS = 8
const NODE_SPACING_Y = 40
const BRANCH_SPACING_X = 30
const PADDING = 20

interface LayoutNode extends GraphNode {
  x: number
  y: number
  color: string
}

export function BranchGraph({ documentId }: { documentId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { graphData, loadGraph } = useBranchStore()
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [layoutNodes, setLayoutNodes] = useState<LayoutNode[]>([])

  useEffect(() => {
    loadGraph(documentId)
  }, [documentId, loadGraph])

  const calculateLayout = useCallback(() => {
    if (!graphData || graphData.nodes.length === 0) {
      setLayoutNodes([])
      return
    }

    const { nodes, branches } = graphData
    const branchColorMap = new Map(branches.map((b) => [b.id, b.color]))

    const sorted = [...nodes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const branchXMap = new Map<string, number>()
    branches.forEach((b, i) => {
      branchXMap.set(b.id, PADDING + i * BRANCH_SPACING_X + NODE_RADIUS)
    })

    const laid: LayoutNode[] = sorted.map((node, i) => ({
      ...node,
      x: branchXMap.get(node.branchId) ?? PADDING + NODE_RADIUS,
      y: PADDING + i * NODE_SPACING_Y + NODE_RADIUS,
      color: branchColorMap.get(node.branchId) ?? '#6b7280',
    }))

    setLayoutNodes(laid)
  }, [graphData])

  useEffect(() => {
    calculateLayout()
  }, [calculateLayout])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !graphData || layoutNodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]))

    const maxX = Math.max(...layoutNodes.map((n) => n.x)) + PADDING * 2
    const maxY = Math.max(...layoutNodes.map((n) => n.y)) + PADDING * 2

    const dpr = window.devicePixelRatio || 1
    canvas.width = maxX * dpr
    canvas.height = maxY * dpr
    canvas.style.width = `${maxX}px`
    canvas.style.height = `${maxY}px`
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, maxX, maxY)

    for (const edge of graphData.edges) {
      const from = nodeMap.get(edge.from)
      const to = nodeMap.get(edge.to)
      if (!from || !to) continue

      ctx.beginPath()
      ctx.strokeStyle = to.color
      ctx.lineWidth = 2
      ctx.globalAlpha = 0.6

      if (from.x === to.x) {
        ctx.moveTo(from.x, from.y)
        ctx.lineTo(to.x, to.y)
      } else {
        const midY = (from.y + to.y) / 2
        ctx.moveTo(from.x, from.y)
        ctx.bezierCurveTo(from.x, midY, to.x, midY, to.x, to.y)
      }
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    for (const node of layoutNodes) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, NODE_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = node.color
      ctx.fill()

      if (hoveredNode === node.id) {
        ctx.strokeStyle = 'var(--color-ink)'
        ctx.lineWidth = 2
        ctx.stroke()
      }

      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-ink-light').trim() || '#6b7280'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(
        `v${node.version} · ${node.title.slice(0, 20)}`,
        node.x + NODE_RADIUS + 6,
        node.y + 4
      )
    }
  }, [graphData, layoutNodes, hoveredNode])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const found = layoutNodes.find((n) => {
      const dx = n.x - x
      const dy = n.y - y
      return Math.sqrt(dx * dx + dy * dy) < NODE_RADIUS + 4
    })

    setHoveredNode(found?.id ?? null)
    canvas.style.cursor = found ? 'pointer' : 'default'
  }

  if (!graphData || layoutNodes.length === 0) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
        No hay versiones para mostrar
      </div>
    )
  }

  return (
    <div className="overflow-auto p-2">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        style={{ display: 'block' }}
      />
      <div className="flex gap-3 mt-3 flex-wrap">
        {graphData.branches.map((b) => (
          <div key={b.id} className="flex items-center gap-1.5 text-xs">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ background: b.color }}
            />
            <span style={{ color: 'var(--color-ink-light)' }}>{b.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

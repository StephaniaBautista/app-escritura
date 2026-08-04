/* Hallmark · component: git-graph · genre: editorial · theme: paper/ink (existing tokens)
 * states: default · hover · focus-visible · active · empty · loading
 * contrast: pass (ink/accent/teal/violet on paper, token-driven dark mode)
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { GitBranch } from 'lucide-react'
import { useBranchStore } from '@/stores/branch-store'
import type { GraphNode } from '@/types/branch'

const NODE_R = 7
const HEAD_R = 10
const ROW_H = 54
const COL_W = 124
const PAD_X = 18
const PAD_TOP = 50
const PAD_BOTTOM = 20

const BRANCH_COLOR_TOKENS = [
  '--color-ink',
  '--color-accent',
  '--color-accent-teal',
  '--color-accent-violet',
  '--color-graph-2',
  '--color-graph-3',
  '--color-postit-pink-border',
  '--color-postit-blue-border',
]

interface LayoutNode extends GraphNode {
  x: number
  y: number
  color: string
  isHead: boolean
}

interface BranchMeta {
  id: string
  name: string
  color: string
  x: number
  count: number
}

function readToken(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function BranchGraph({ documentId }: { documentId: string }) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { graphData, loadGraph } = useBranchStore()
  const [layout, setLayout] = useState<LayoutNode[]>([])
  const [branches, setBranches] = useState<BranchMeta[]>([])
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [themeVersion, setThemeVersion] = useState(0)

  useEffect(() => {
    loadGraph(documentId)
  }, [documentId, loadGraph])

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => setThemeVersion((v) => v + 1))
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const calculateLayout = useCallback(() => {
    if (!graphData || graphData.nodes.length === 0) {
      setLayout([])
      setBranches([])
      return
    }

    const sortedBranches = [...graphData.branches].sort((a, b) => {
      if (a.name === 'main') return -1
      if (b.name === 'main') return 1
      return a.name.localeCompare(b.name)
    })

    const colors = sortedBranches.map((_, i) =>
      readToken(BRANCH_COLOR_TOKENS[i % BRANCH_COLOR_TOKENS.length], '#6b5d4a'),
    )
    const colorByBranch = new Map(sortedBranches.map((b, i) => [b.id, colors[i]]))
    const xByBranch = new Map(sortedBranches.map((b, i) => [b.id, PAD_X + i * COL_W + COL_W / 2]))

    const headByBranch = new Map<string, { id: string; version: number }>()
    for (const n of graphData.nodes) {
      const current = headByBranch.get(n.branchId)
      if (!current || n.version > current.version) {
        headByBranch.set(n.branchId, { id: n.id, version: n.version })
      }
    }

    const countByBranch = new Map<string, number>()
    for (const n of graphData.nodes) {
      countByBranch.set(n.branchId, (countByBranch.get(n.branchId) ?? 0) + 1)
    }

    const sorted = [...graphData.nodes].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )
    const laid = sorted.map((n, i) => ({
      ...n,
      x: xByBranch.get(n.branchId) ?? PAD_X + COL_W / 2,
      y: PAD_TOP + i * ROW_H + NODE_R,
      color: colorByBranch.get(n.branchId) ?? '#6b5d4a',
      isHead: headByBranch.get(n.branchId)?.id === n.id,
    }))

    setLayout(laid)
    setBranches(
      sortedBranches.map((b, i) => ({
        id: b.id,
        name: b.name,
        color: colors[i],
        x: xByBranch.get(b.id) ?? PAD_X + COL_W / 2,
        count: countByBranch.get(b.id) ?? 0,
      })),
    )
    setCanvasSize({
      width: Math.max(PAD_X * 2 + sortedBranches.length * COL_W, 260),
      height: PAD_TOP + laid.length * ROW_H + PAD_BOTTOM,
    })
  }, [graphData])

  useEffect(() => {
    calculateLayout()
  }, [calculateLayout, themeVersion])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || layout.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    const paperLines = readToken('--color-paper-lines', '#d4c5a9')
    const ink = readToken('--color-ink', '#2c2416')
    const inkLight = readToken('--color-ink-light', '#6b5d4a')
    const paper = readToken('--color-paper', '#fffef9')
    const displayFont = readToken('--font-display', 'Caveat, cursive')
    const monoFont = readToken('--font-mono', 'Space Grotesk, monospace')

    const nodeMap = new Map(layout.map((n) => [n.id, n]))

    branches.forEach((b, i) => {
      if (i % 2 === 1) {
        ctx.fillStyle = paperLines
        ctx.globalAlpha = 0.14
        ctx.fillRect(PAD_X + i * COL_W, 0, COL_W, canvasSize.height)
        ctx.globalAlpha = 1
      }

      const branchNodes = layout.filter((n) => n.branchId === b.id)
      if (branchNodes.length === 0) return
      const maxY = Math.max(...branchNodes.map((n) => n.y))
      ctx.save()
      ctx.strokeStyle = b.color
      ctx.globalAlpha = 0.26
      ctx.lineWidth = 1
      ctx.setLineDash([1, 5])
      ctx.beginPath()
      ctx.moveTo(b.x, PAD_TOP)
      ctx.lineTo(b.x, maxY + HEAD_R + 8)
      ctx.stroke()
      ctx.restore()
    })

    branches.forEach((b) => {
      ctx.font = `600 18px ${displayFont}`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      const textW = ctx.measureText(b.name).width
      const groupW = textW + 20
      const gx = b.x - groupW / 2

      ctx.beginPath()
      ctx.arc(gx + 7, 16, 4, 0, Math.PI * 2)
      ctx.fillStyle = b.color
      ctx.fill()

      ctx.fillStyle = ink
      ctx.fillText(b.name, gx + 16, 16)

      ctx.font = `500 10px ${monoFont}`
      ctx.fillStyle = inkLight
      ctx.fillText(String(b.count), gx + 16 + textW + 6, 16)
    })

    if (graphData) {
      for (const edge of graphData.edges) {
        const from = nodeMap.get(edge.from)
        const to = nodeMap.get(edge.to)
        if (!from || !to) continue

        ctx.save()
        ctx.strokeStyle = to.color
        ctx.globalAlpha = 0.5
        ctx.lineWidth = 1.5
        ctx.setLineDash([])
        ctx.beginPath()
        if (from.x === to.x) {
          ctx.moveTo(from.x, from.y + NODE_R)
          ctx.lineTo(to.x, to.y - NODE_R)
        } else {
          const midY = (from.y + to.y) / 2
          ctx.moveTo(from.x, from.y + NODE_R)
          ctx.bezierCurveTo(from.x, midY, to.x, midY, to.x, to.y - NODE_R)
        }
        ctx.stroke()
        ctx.restore()
      }
    }

    for (const n of layout) {
      const hovered = hoveredId === n.id
      const r = n.isHead ? HEAD_R : NODE_R
      const drawR = r + (hovered ? 2 : 0)

      if (n.isHead || hovered) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, drawR + 3, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.globalAlpha = n.isHead ? 0.18 : 0.12
        ctx.fill()
        ctx.globalAlpha = 1
      }

      ctx.beginPath()
      ctx.arc(n.x, n.y, drawR, 0, Math.PI * 2)
      ctx.fillStyle = n.color
      ctx.fill()

      if (n.isHead) {
        ctx.beginPath()
        ctx.arc(n.x, n.y, drawR - 3, 0, Math.PI * 2)
        ctx.fillStyle = paper
        ctx.fill()
        ctx.beginPath()
        ctx.arc(n.x, n.y, drawR - 3, 0, Math.PI * 2)
        ctx.strokeStyle = n.color
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      ctx.font = `500 11px ${monoFont}`
      ctx.fillStyle = inkLight
      ctx.textAlign = 'left'
      ctx.textBaseline = 'middle'
      ctx.fillText(`v${n.version}`, n.x + drawR + 8, n.y)
    }
  }, [layout, branches, canvasSize, hoveredId, graphData, themeVersion])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const found = layout.find((n) => {
        const dx = n.x - x
        const dy = n.y - y
        return Math.sqrt(dx * dx + dy * dy) < (n.isHead ? HEAD_R : NODE_R) + 4
      })

      setHoveredId(found?.id ?? null)
      canvas.style.cursor = found ? 'pointer' : 'default'
    },
    [layout],
  )

  const handleMouseLeave = useCallback(() => setHoveredId(null), [])

  const hoveredNode = hoveredId ? layout.find((n) => n.id === hoveredId) ?? null : null

  if (!graphData) {
    return (
      <div className="p-4 text-center text-sm" style={{ color: 'var(--color-muted)' }}>
        {t('common.loading')}
      </div>
    )
  }

  if (layout.length === 0) {
    return (
      <div className="notebook-paper p-6 text-center">
        <GitBranch className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-ink-faint)' }} />
        <p className="font-display text-lg font-semibold" style={{ color: 'var(--color-ink-light)' }}>
          {t('versions.empty')}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--color-ink-faint)' }}>
          {t('versions.emptyDesc')}
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-auto" style={{ maxHeight: '100%' }}>
      <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          tabIndex={0}
          aria-label={t('branches.graphAria')}
          className="graph-canvas"
          style={{ display: 'block' }}
        />
        {hoveredNode && (
          <div
            className="pointer-events-none absolute z-10"
            style={{
              left: Math.max(8, Math.min(hoveredNode.x + 14, canvasSize.width - 180)),
              top: Math.max(hoveredNode.y - 12, 0),
            }}
          >
            <div className="notebook-paper px-3 py-2 text-sm" style={{ maxWidth: '11rem' }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
                  style={{ background: hoveredNode.color }}
                />
                <span className="font-medium truncate" style={{ color: 'var(--color-ink)' }}>
                  {branches.find((b) => b.id === hoveredNode.branchId)?.name}
                </span>
                {hoveredNode.isHead && (
                  <span
                    className="text-[10px] uppercase tracking-wider flex-shrink-0"
                    style={{ color: 'var(--color-accent)' }}
                  >
                    {t('branches.head')}
                  </span>
                )}
              </div>
              <p className="truncate" style={{ color: 'var(--color-ink-light)' }}>
                {hoveredNode.title}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-ink-faint)' }}>
                {t('versions.versionNum', { version: hoveredNode.version })} ·{' '}
                {new Date(hoveredNode.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

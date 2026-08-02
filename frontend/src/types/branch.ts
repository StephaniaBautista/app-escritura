export interface Branch {
  id: string
  documentId: string
  name: string
  sourceVersionId: string | null
  userId: string
  createdAt: string
  isMain: boolean
}

export interface CreateBranchInput {
  name: string
  sourceVersionId?: string
}

export interface GraphNode {
  id: string
  version: number
  branchId: string
  branchName: string
  title: string
  createdAt: string
  parentIds: string[]
}

export interface GraphEdge {
  from: string
  to: string
}

export interface BranchGraphData {
  nodes: GraphNode[]
  edges: GraphEdge[]
  branches: { id: string; name: string; color: string }[]
}

export interface MergeConflict {
  index: number
  kind: 'modified' | 'added'
  base: unknown | null
  ours: unknown | null
  theirs: unknown | null
}

export interface MergeResult {
  merged: boolean
  version?: import('./document').DocumentVersion | null
  conflicts?: MergeConflict[]
  mergedContent?: { type: string; content: (unknown | null)[] }
}

export interface MergeInput {
  targetBranchId: string
  resolution?: { content: unknown }
}

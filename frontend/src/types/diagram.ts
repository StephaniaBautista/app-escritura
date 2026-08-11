export const DIAGRAM_TYPES = ['familyTree', 'relationships', 'custom'] as const
export type DiagramType = typeof DIAGRAM_TYPES[number]

export interface DiagramLayoutNode {
  id: string
  position: { x: number; y: number }
}

export interface DiagramLayoutNote {
  id: string
  position: { x: number; y: number }
  text: string
}

export interface DiagramLayout {
  nodes: DiagramLayoutNode[]
  notes: DiagramLayoutNote[]
}

export interface Diagram {
  id: string
  projectId: string
  name: string
  type: DiagramType
  data: Record<string, unknown>
  layout: DiagramLayout
  createdAt: string
  updatedAt: string
}

export interface DiagramInput {
  name?: string
  type?: DiagramType
  layout?: Partial<DiagramLayout>
}

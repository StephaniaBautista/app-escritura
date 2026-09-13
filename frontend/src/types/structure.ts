export type CardType = 'scene' | 'chapter' | 'character' | 'document' | 'note'

export type SubplotStatus = 'active' | 'resolved' | 'dropped'

export interface StructureCard {
  id: string
  columnId: string
  title: string
  description: string | null
  cardType: CardType
  referenceId: string | null
  color: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface StructureColumn {
  id: string
  boardId: string
  name: string
  color: string | null
  order: number
  cards?: StructureCard[]
  createdAt: string
  updatedAt: string
}

export interface StructureBoard {
  id: string
  projectId: string
  name: string
  order: number
  columns?: StructureColumn[]
  createdAt: string
  updatedAt: string
}

export interface BoardInput {
  name?: string
  order?: number
}

export interface ColumnInput {
  name?: string
  color?: string | null
  order?: number
}

export interface CardInput {
  title?: string
  description?: string | null
  cardType?: CardType
  referenceId?: string | null
  color?: string | null
  order?: number
}

export interface Subplot {
  id: string
  projectId: string
  title: string
  description: string | null
  status: SubplotStatus
  color: string | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface SubplotInput {
  title?: string
  description?: string | null
  status?: SubplotStatus
  color?: string | null
  order?: number
}

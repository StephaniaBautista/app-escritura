export interface DocumentNode {
  id: string
  title: string
  type: 'document' | 'chapter' | 'subpage'
  parentId: string | null
  order: number
  updatedAt: string
}

export interface Document extends DocumentNode {
  content: Record<string, unknown>
  projectId: string
  folderId: string | null
  userId: string
  createdAt: string
  children?: Document[]
  parent?: { id: string; title: string; type: string } | null
}

export interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  _count?: { documents: number; folders: number }
  tree?: DocumentNode[]
}

export interface CreateProjectInput {
  name: string
  description?: string
}

export interface CreateDocumentInput {
  title: string
  content?: Record<string, unknown>
  type?: 'document' | 'chapter' | 'subpage'
  projectId: string
  folderId?: string
  parentId?: string
  order?: number
}

export interface UpdateDocumentInput {
  title?: string
  content?: Record<string, unknown>
  folderId?: string | null
  parentId?: string | null
  order?: number
}

export interface Note {
  id: string
  title: string
  content: string
  documentId: string | null
  projectId: string | null
  isHidden: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface DocumentVersion {
  id: string
  documentId: string
  title: string
  content: Record<string, unknown>
  version: number
  userId: string
  createdAt: string
}

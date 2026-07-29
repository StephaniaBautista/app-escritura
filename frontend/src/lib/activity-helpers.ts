import { FileText, Folder, Edit3, Clock } from 'lucide-react'

export function getActivityIcon(type: string) {
  switch (type) {
    case 'folder_created': return Folder
    case 'document_created': return FileText
    case 'document_edited': return Edit3
    default: return Clock
  }
}

export function getActivityLabel(type: string) {
  switch (type) {
    case 'folder_created': return 'Carpeta creada'
    case 'document_created': return 'Documento creado'
    case 'document_edited': return 'Documento editado'
    default: return 'Actividad'
  }
}

export function getActivityLink(activity: { type: string; folderId?: string; documentId?: string }) {
  if (activity.type === 'folder_created' && activity.folderId) {
    return `/app/documents/${activity.folderId}`
  }
  if (activity.documentId && activity.folderId) {
    return `/app/editor/${activity.folderId}/${activity.documentId}`
  }
  return '/app/documents'
}

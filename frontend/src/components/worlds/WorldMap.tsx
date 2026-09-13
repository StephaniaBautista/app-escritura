import { MapWorkspace } from './map/MapWorkspace'

export function WorldMap({ projectId }: { projectId: string }) {
  return <MapWorkspace projectId={projectId} />
}

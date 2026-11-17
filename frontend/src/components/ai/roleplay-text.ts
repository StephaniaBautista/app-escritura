export interface RoleplaySegment {
  text: string
  beat: boolean
}

const BEAT = /(\*[^*\n]+\*)/g

export function roleplaySegments(content: string): RoleplaySegment[] {
  return content
    .split(BEAT)
    .filter((part) => part.length > 0)
    .map((part) => part.length > 2 && part.startsWith('*') && part.endsWith('*')
      ? { text: part.slice(1, -1), beat: true }
      : { text: part, beat: false })
}

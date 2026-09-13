export interface PlacedItem {
  x: number
  w: number
}

export function stackRows(items: PlacedItem[]): number[] {
  const order = items.map((_, i) => i).sort((a, b) => items[a].x - items[b].x)
  const rowEnds: number[] = []
  const rows = new Array<number>(items.length).fill(0)
  for (const i of order) {
    const { x, w } = items[i]
    let row = rowEnds.findIndex((end) => end <= x)
    if (row === -1) {
      row = rowEnds.length
      rowEnds.push(x + w)
    } else {
      rowEnds[row] = x + w
    }
    rows[i] = row
  }
  return rows
}

export function labelWidthPercent(text: string, minPercent = 8, maxPercent = 40): number {
  const estimated = 4 + text.length * 1.1
  return Math.min(maxPercent, Math.max(minPercent, estimated))
}

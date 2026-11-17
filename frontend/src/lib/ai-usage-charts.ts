export interface ChartDatum {
  label: string
  value: number
}

export interface PieSlice {
  label: string
  value: number
  percent: number
  d: string
}

export function mergeByLabel(rows: ChartDatum[]): ChartDatum[] {
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(row.label, (totals.get(row.label) ?? 0) + row.value)
  return [...totals.entries()]
    .map(([label, value]) => ({ label, value }))
    .filter((row) => row.value > 0)
    .sort((left, right) => right.value - left.value)
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

export function pieSlices(rows: ChartDatum[], cx = 60, cy = 60, radius = 48): PieSlice[] {
  const items = mergeByLabel(rows)
  const total = items.reduce((sum, row) => sum + row.value, 0)
  if (total <= 0) return []
  if (items.length === 1) {
    const row = items[0]
    if (!row) return []
    return [{
      label: row.label,
      value: row.value,
      percent: 1,
      d: `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy + radius} A ${radius} ${radius} 0 1 1 ${cx} ${cy - radius} Z`,
    }]
  }
  let angle = -Math.PI / 2
  return items.map((row) => {
    const sweep = (row.value / total) * Math.PI * 2
    const start = angle
    const end = angle + sweep
    angle = end
    const from = polar(cx, cy, radius, start)
    const to = polar(cx, cy, radius, end)
    const large = sweep > Math.PI ? 1 : 0
    return {
      label: row.label,
      value: row.value,
      percent: row.value / total,
      d: `M ${cx} ${cy} L ${from.x.toFixed(2)} ${from.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${to.x.toFixed(2)} ${to.y.toFixed(2)} Z`,
    }
  })
}

export function barRects(rows: ChartDatum[], width = 320, height = 140, pad = 8) {
  const items = mergeByLabel(rows).slice(0, 8)
  const max = Math.max(...items.map((row) => row.value), 0) || 1
  const innerWidth = width - pad * 2
  const innerHeight = height - pad * 2
  const gap = 6
  const barWidth = items.length ? Math.max(8, (innerWidth - gap * Math.max(items.length - 1, 0)) / items.length) : 0
  return items.map((row, index) => {
    const barHeight = (row.value / max) * innerHeight
    return {
      label: row.label,
      value: row.value,
      x: pad + index * (barWidth + gap),
      y: pad + innerHeight - barHeight,
      width: barWidth,
      height: barHeight,
    }
  })
}

export function heatLevel(value: number, max: number) {
  if (value <= 0 || max <= 0) return 0
  const ratio = value / max
  if (ratio < 0.25) return 1
  if (ratio < 0.5) return 2
  if (ratio < 0.75) return 3
  return 4
}

export function stackSegments(input: number, output: number, width = 320, height = 28) {
  const total = input + output
  if (total <= 0) return { inputWidth: 0, outputWidth: 0, height }
  return {
    inputWidth: (input / total) * width,
    outputWidth: (output / total) * width,
    height,
  }
}

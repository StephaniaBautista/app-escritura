export function chartPolyline(values: number[], width: number, height: number, pad = 8): string {
  if (!values.length) return ''
  const max = Math.max(...values, 0)
  const span = max || 1
  const innerWidth = width - pad * 2
  const innerHeight = height - pad * 2
  return values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : pad + (index / (values.length - 1)) * innerWidth
    const y = pad + innerHeight - (value / span) * innerHeight
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
}

export function chartAreaPath(values: number[], width: number, height: number, pad = 8): string {
  const line = chartPolyline(values, width, height, pad)
  if (!line) return ''
  const points = line.split(' ')
  const first = points[0]
  const last = points[points.length - 1]
  if (!first || !last) return ''
  const firstX = first.split(',')[0]
  const lastX = last.split(',')[0]
  const baseline = (height - pad).toFixed(2)
  return `M ${firstX} ${baseline} L ${points.map((point) => point).join(' L ')} L ${lastX} ${baseline} Z`
}

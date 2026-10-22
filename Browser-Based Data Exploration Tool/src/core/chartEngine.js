export function getHistogramData(table, indices, colName, binCount = 25) {
  const colIndex = table.columns.findIndex(c => c.name === colName)
  if (colIndex === -1) return { bins: [], min: 0, max: 0, total: 0 }

  const col = table.columns[colIndex]
  const count = indices ? indices.length : table.rowCount
  if (count === 0) return { bins: [], min: 0, max: 0, total: 0 }

  let min = Infinity
  let max = -Infinity
  for (let i = 0; i < count; i++) {
    const r = indices ? indices[i] : i
    if (col.nulls[r] === 1) continue
    const v = col.data[r]
    if (v < min) min = v
    if (v > max) max = v
  }

  if (min === Infinity || min === max) {
    min = min === Infinity ? 0 : min - 1
    max = max === -Infinity ? 10 : max + 1
  }

  const step = (max - min) / binCount
  const counts = new Int32Array(binCount)

  for (let i = 0; i < count; i++) {
    const r = indices ? indices[i] : i
    if (col.nulls[r] === 1) continue
    const v = col.data[r]
    let b = Math.floor((v - min) / step)
    if (b >= binCount) b = binCount - 1
    if (b < 0) b = 0
    counts[b]++
  }

  const bins = []
  for (let b = 0; b < binCount; b++) {
    const x0 = min + b * step
    const x1 = x0 + step
    bins.push({
      binIndex: b,
      x0: Number(x0.toFixed(2)),
      x1: Number(x1.toFixed(2)),
      count: counts[b],
      label: `${x0.toFixed(1)} - ${x1.toFixed(1)}`,
    })
  }

  return { bins, min, max, total: count }
}

export function getBarData(table, indices, xColName, yColName, agg = 'sum', limit = 20) {
  const xIdx = table.columns.findIndex(c => c.name === xColName)
  const yIdx = yColName ? table.columns.findIndex(c => c.name === yColName) : -1
  if (xIdx === -1) return { items: [], maxVal: 0 }

  const xCol = table.columns[xIdx]
  const yCol = yIdx !== -1 ? table.columns[yIdx] : null
  const count = indices ? indices.length : table.rowCount

  const groupMap = new Map()

  for (let i = 0; i < count; i++) {
    const r = indices ? indices[i] : i
    if (xCol.nulls[r] === 1) continue

    const key = String(table.getValue(xIdx, r) ?? '(Blank)')
    let stat = groupMap.get(key)
    if (!stat) {
      stat = { sum: 0, count: 0, min: Infinity, max: -Infinity }
      groupMap.set(key, stat)
    }

    stat.count++
    if (yCol && yCol.nulls[r] === 0) {
      const v = Number(yCol.data[r])
      if (!Number.isNaN(v)) {
        stat.sum += v
        if (v < stat.min) stat.min = v
        if (v > stat.max) stat.max = v
      }
    }
  }

  const items = []
  let maxVal = 0

  for (const [category, stat] of groupMap.entries()) {
    let val = stat.count
    if (yCol) {
      if (agg === 'sum') val = Number(stat.sum.toFixed(2))
      else if (agg === 'avg') val = stat.count > 0 ? Number((stat.sum / stat.count).toFixed(2)) : 0
      else if (agg === 'min') val = stat.min === Infinity ? 0 : stat.min
      else if (agg === 'max') val = stat.max === -Infinity ? 0 : stat.max
    }
    if (val > maxVal) maxVal = val
    items.push({ category, value: val, count: stat.count })
  }

  items.sort((a, b) => b.value - a.value)
  const finalItems = items.slice(0, limit)

  return { items: finalItems, maxVal }
}

export function getLineData(table, indices, xColName, yColName, agg = 'avg', maxPoints = 200) {
  const xIdx = table.columns.findIndex(c => c.name === xColName)
  const yIdx = table.columns.findIndex(c => c.name === yColName)
  if (xIdx === -1 || yIdx === -1) return { points: [], minX: 0, maxX: 0, minY: 0, maxY: 0 }

  const xCol = table.columns[xIdx]
  const yCol = table.columns[yIdx]
  const count = indices ? indices.length : table.rowCount

  const bucketMap = new Map()
  let minX = Infinity
  let maxX = -Infinity

  for (let i = 0; i < count; i++) {
    const r = indices ? indices[i] : i
    if (xCol.nulls[r] === 1 || yCol.nulls[r] === 1) continue

    const xVal = xCol.data[r]
    const yVal = yCol.data[r]
    if (xVal < minX) minX = xVal
    if (xVal > maxX) maxX = xVal

    let bStat = bucketMap.get(xVal)
    if (!bStat) {
      bStat = { sum: 0, count: 0, min: Infinity, max: -Infinity }
      bucketMap.set(xVal, bStat)
    }
    bStat.count++
    bStat.sum += yVal
    if (yVal < bStat.min) bStat.min = yVal
    if (yVal > bStat.max) bStat.max = yVal
  }

  if (minX === Infinity) return { points: [], minX: 0, maxX: 0, minY: 0, maxY: 0 }

  const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => a - b)
  const points = []
  let minY = Infinity
  let maxY = -Infinity

  const step = Math.max(1, Math.floor(sortedKeys.length / maxPoints))
  for (let i = 0; i < sortedKeys.length; i += step) {
    const x = sortedKeys[i]
    const stat = bucketMap.get(x)
    let y = stat.count
    if (agg === 'sum') y = stat.sum
    else if (agg === 'avg') y = stat.count > 0 ? stat.sum / stat.count : 0
    else if (agg === 'min') y = stat.min
    else if (agg === 'max') y = stat.max

    if (y < minY) minY = y
    if (y > maxY) maxY = y

    let label = String(x)
    if (xCol.type === 'date') {
      label = new Date(x).toISOString().slice(0, 10)
    }

    points.push({ x, y: Number(y.toFixed(2)), label })
  }

  return { points, minX, maxX, minY, maxY }
}

export function getScatterData(table, indices, xColName, yColName, maxRenderPoints = 20000) {
  const xIdx = table.columns.findIndex(c => c.name === xColName)
  const yIdx = table.columns.findIndex(c => c.name === yColName)
  if (xIdx === -1 || yIdx === -1) return { points: [], minX: 0, maxX: 0, minY: 0, maxY: 0, total: 0 }

  const xCol = table.columns[xIdx]
  const yCol = table.columns[yIdx]
  const count = indices ? indices.length : table.rowCount

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (let i = 0; i < count; i++) {
    const r = indices ? indices[i] : i
    if (xCol.nulls[r] === 1 || yCol.nulls[r] === 1) continue
    const x = xCol.data[r]
    const y = yCol.data[r]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }

  if (minX === Infinity) {
    return { points: [], minX: 0, maxX: 0, minY: 0, maxY: 0, total: 0 }
  }

  const samplingStep = Math.max(1, Math.floor(count / maxRenderPoints))
  const points = []

  const gridRes = 80
  const xSpan = maxX - minX || 1
  const ySpan = maxY - minY || 1
  const grid = new Map()

  for (let i = 0; i < count; i++) {
    const r = indices ? indices[i] : i
    if (xCol.nulls[r] === 1 || yCol.nulls[r] === 1) continue
    const x = xCol.data[r]
    const y = yCol.data[r]

    const gx = Math.min(gridRes - 1, Math.max(0, Math.floor(((x - minX) / xSpan) * gridRes)))
    const gy = Math.min(gridRes - 1, Math.max(0, Math.floor(((y - minY) / ySpan) * gridRes)))
    const cellKey = (gx << 16) | gy

    let cell = grid.get(cellKey)
    if (!cell) {
      cell = { count: 0, xSum: 0, ySum: 0, rowIndex: r }
      grid.set(cellKey, cell)
    }
    cell.count++
    cell.xSum += x
    cell.ySum += y
  }

  let maxDensity = 1
  for (const cell of grid.values()) {
    if (cell.count > maxDensity) maxDensity = cell.count
  }

  for (const cell of grid.values()) {
    const avgX = cell.xSum / cell.count
    const avgY = cell.ySum / cell.count
    points.push({
      x: avgX,
      y: avgY,
      density: cell.count / maxDensity,
      count: cell.count,
      rowIndex: cell.rowIndex,
    })
  }

  return {
    points,
    minX,
    maxX,
    minY,
    maxY,
    total: count,
    sampledCount: points.length,
  }
}

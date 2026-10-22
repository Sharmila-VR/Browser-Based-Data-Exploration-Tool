export function computeMedian(arr) {
  if (!arr || arr.length === 0) return 0
  arr.sort((a, b) => a - b)
  const mid = Math.floor(arr.length / 2)
  if (arr.length % 2 === 0) {
    return (arr[mid - 1] + arr[mid]) / 2
  }
  return arr[mid]
}

export function aggregateData(table, indices, groupColumns = [], metrics = []) {
  const activeCount = indices ? indices.length : table.rowCount
  if (activeCount === 0) {
    return { rows: [], grandTotals: {} }
  }

  const groupColIndices = groupColumns.map(name => {
    const idx = table.columns.findIndex(c => c.name === name)
    return { name, index: idx, col: idx !== -1 ? table.columns[idx] : null }
  }).filter(g => g.col !== null)

  const metricConfigs = metrics.map(m => {
    const idx = table.columns.findIndex(c => c.name === m.column)
    const key = `${m.column}_${m.agg}`
    return {
      key,
      column: m.column,
      agg: m.agg,
      colIndex: idx,
      col: idx !== -1 ? table.columns[idx] : null,
    }
  }).filter(m => m.col !== null)

  const groups = new Map()
  const grandStats = {}

  for (let m = 0; m < metricConfigs.length; m++) {
    const cfg = metricConfigs[m]
    grandStats[cfg.key] = {
      sum: 0,
      count: 0,
      min: Infinity,
      max: -Infinity,
      values: cfg.agg === 'median' ? [] : null,
      distinct: cfg.agg === 'distinct' ? new Set() : null,
    }
  }

  for (let i = 0; i < activeCount; i++) {
    const r = indices ? indices[i] : i

    let groupKey = ''
    const keyObj = {}
    for (let g = 0; g < groupColIndices.length; g++) {
      const gCol = groupColIndices[g]
      const val = table.getValue(gCol.index, r)
      const strVal = val === null || val === undefined ? '(Blank)' : String(val)
      keyObj[gCol.name] = strVal
      groupKey += (g > 0 ? '|||' : '') + strVal
    }

    if (groupColIndices.length === 0) {
      groupKey = '__ALL__'
    }

    let grp = groups.get(groupKey)
    if (!grp) {
      grp = {
        keys: keyObj,
        count: 0,
        metricStats: {},
      }
      for (let m = 0; m < metricConfigs.length; m++) {
        const cfg = metricConfigs[m]
        grp.metricStats[cfg.key] = {
          sum: 0,
          count: 0,
          min: Infinity,
          max: -Infinity,
          values: cfg.agg === 'median' ? [] : null,
          distinct: cfg.agg === 'distinct' ? new Set() : null,
        }
      }
      groups.set(groupKey, grp)
    }

    grp.count++

    for (let m = 0; m < metricConfigs.length; m++) {
      const cfg = metricConfigs[m]
      if (cfg.col.nulls[r] === 1) continue

      const val = table.getValue(cfg.colIndex, r)
      const numVal = Number(val)
      const grpStat = grp.metricStats[cfg.key]
      const gStat = grandStats[cfg.key]

      if (cfg.agg === 'count') {
        grpStat.count++
        gStat.count++
      } else if (cfg.agg === 'distinct') {
        grpStat.distinct.add(val)
        gStat.distinct.add(val)
      } else if (!Number.isNaN(numVal)) {
        grpStat.count++
        grpStat.sum += numVal
        if (numVal < grpStat.min) grpStat.min = numVal
        if (numVal > grpStat.max) grpStat.max = numVal

        gStat.count++
        gStat.sum += numVal
        if (numVal < gStat.min) gStat.min = numVal
        if (numVal > gStat.max) gStat.max = numVal

        if (cfg.agg === 'median') {
          grpStat.values.push(numVal)
          gStat.values.push(numVal)
        }
      }
    }
  }

  const resultRows = []
  for (const [_, grp] of groups.entries()) {
    const row = { ...grp.keys, _count: grp.count }
    for (let m = 0; m < metricConfigs.length; m++) {
      const cfg = metricConfigs[m]
      const stat = grp.metricStats[cfg.key]

      if (cfg.agg === 'sum') {
        row[cfg.key] = Number(stat.sum.toFixed(2))
      } else if (cfg.agg === 'avg') {
        row[cfg.key] = stat.count > 0 ? Number((stat.sum / stat.count).toFixed(2)) : 0
      } else if (cfg.agg === 'min') {
        row[cfg.key] = stat.min === Infinity ? 0 : stat.min
      } else if (cfg.agg === 'max') {
        row[cfg.key] = stat.max === -Infinity ? 0 : stat.max
      } else if (cfg.agg === 'count') {
        row[cfg.key] = stat.count
      } else if (cfg.agg === 'distinct') {
        row[cfg.key] = stat.distinct.size
      } else if (cfg.agg === 'median') {
        row[cfg.key] = Number(computeMedian(stat.values).toFixed(2))
      }
    }
    resultRows.push(row)
  }

  const grandTotals = {}
  for (let m = 0; m < metricConfigs.length; m++) {
    const cfg = metricConfigs[m]
    const gStat = grandStats[cfg.key]
    if (cfg.agg === 'sum') {
      grandTotals[cfg.key] = Number(gStat.sum.toFixed(2))
    } else if (cfg.agg === 'avg') {
      grandTotals[cfg.key] = gStat.count > 0 ? Number((gStat.sum / gStat.count).toFixed(2)) : 0
    } else if (cfg.agg === 'min') {
      grandTotals[cfg.key] = gStat.min === Infinity ? 0 : gStat.min
    } else if (cfg.agg === 'max') {
      grandTotals[cfg.key] = gStat.max === -Infinity ? 0 : gStat.max
    } else if (cfg.agg === 'count') {
      grandTotals[cfg.key] = gStat.count
    } else if (cfg.agg === 'distinct') {
      grandTotals[cfg.key] = gStat.distinct.size
    } else if (cfg.agg === 'median') {
      grandTotals[cfg.key] = Number(computeMedian(gStat.values).toFixed(2))
    }
  }

  return {
    rows: resultRows,
    grandTotals,
  }
}

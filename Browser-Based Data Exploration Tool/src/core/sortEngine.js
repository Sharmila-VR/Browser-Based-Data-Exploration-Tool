export function sortIndices(indices, table, sortConfig = []) {
  if (!indices || indices.length <= 1 || !sortConfig || sortConfig.length === 0) {
    return indices
  }

  const result = new Uint32Array(indices)
  const preparedCriteria = []

  for (let s = 0; s < sortConfig.length; s++) {
    const { column, direction = 'asc' } = sortConfig[s]
    const colIndex = table.columns.findIndex(c => c.name === column)
    if (colIndex === -1) continue

    const col = table.columns[colIndex]
    const dirFactor = direction === 'desc' ? -1 : 1

    if (col.type === 'string' && col.isDictionary) {
      const dict = col.dictionary
      const dictRanks = new Int32Array(dict.length)
      const sortedDictIndices = Array.from({ length: dict.length }, (_, i) => i)
      sortedDictIndices.sort((i1, i2) => dict[i1].localeCompare(dict[i2]))
      for (let r = 0; r < sortedDictIndices.length; r++) {
        dictRanks[sortedDictIndices[r]] = r
      }
      preparedCriteria.push({
        type: 'dict',
        data: col.data,
        nulls: col.nulls,
        ranks: dictRanks,
        dir: dirFactor,
      })
    } else if (col.type === 'number' || col.type === 'date') {
      preparedCriteria.push({
        type: 'number',
        data: col.data,
        nulls: col.nulls,
        dir: dirFactor,
      })
    } else if (col.type === 'boolean') {
      preparedCriteria.push({
        type: 'boolean',
        data: col.data,
        nulls: col.nulls,
        dir: dirFactor,
      })
    } else {
      preparedCriteria.push({
        type: 'string',
        data: col.data,
        nulls: col.nulls,
        dir: dirFactor,
      })
    }
  }

  if (preparedCriteria.length === 0) {
    return result
  }

  const numCriteria = preparedCriteria.length

  result.sort((a, b) => {
    for (let c = 0; c < numCriteria; c++) {
      const crit = preparedCriteria[c]
      const nullA = crit.nulls[a]
      const nullB = crit.nulls[b]

      if (nullA !== nullB) {
        return nullA ? 1 : -1
      }
      if (nullA === 1) {
        continue
      }

      let diff = 0
      if (crit.type === 'number' || crit.type === 'boolean') {
        diff = crit.data[a] - crit.data[b]
      } else if (crit.type === 'dict') {
        diff = crit.ranks[crit.data[a]] - crit.ranks[crit.data[b]]
      } else {
        const strA = crit.data[a] || ''
        const strB = crit.data[b] || ''
        if (strA < strB) diff = -1
        else if (strA > strB) diff = 1
        else diff = 0
      }

      if (diff !== 0) {
        return diff * crit.dir
      }
    }
    return a - b
  })

  return result
}

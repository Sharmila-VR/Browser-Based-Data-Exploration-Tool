export function applyFilters(table, filters = {}) {
  const rowCount = table.rowCount
  if (rowCount === 0) return new Uint32Array(0)

  const filterEntries = Object.entries(filters).filter(([_, f]) => {
    if (!f) return false
    if (f.min !== undefined && f.min !== '' && (!Number.isNaN(Number(f.min)) || !Number.isNaN(Date.parse(f.min)))) return true
    if (f.max !== undefined && f.max !== '' && (!Number.isNaN(Number(f.max)) || !Number.isNaN(Date.parse(f.max)))) return true
    if (f.text !== undefined && f.text.trim() !== '') return true
    if (f.regex !== undefined && f.regex.trim() !== '') return true
    if (f.values && f.values.length > 0) return true
    if (f.bool !== undefined && f.bool !== 'all') return true
    return false
  })

  if (filterEntries.length === 0) {
    const indices = new Uint32Array(rowCount)
    for (let i = 0; i < rowCount; i++) {
      indices[i] = i
    }
    return indices
  }

  const compiledFilters = filterEntries.map(([colName, f]) => {
    const colIndex = table.columns.findIndex(c => c.name === colName)
    if (colIndex === -1) return null
    const col = table.columns[colIndex]

    let min = -Infinity
    let max = Infinity
    if (f.min !== undefined && f.min !== '') {
      min = col.type === 'date' ? Date.parse(f.min) : Number(f.min)
      if (Number.isNaN(min)) min = -Infinity
    }
    if (f.max !== undefined && f.max !== '') {
      max = col.type === 'date' ? Date.parse(f.max) : Number(f.max)
      if (Number.isNaN(max)) max = Infinity
    }

    let regexObj = null
    if (f.regex) {
      try {
        regexObj = new RegExp(f.regex, 'i')
      } catch (e) {
        regexObj = null
      }
    }

    let valueSet = null
    let dictIdSet = null
    if (f.values && f.values.length > 0) {
      valueSet = new Set(f.values.map(String))
      if (col.isDictionary) {
        dictIdSet = new Set()
        for (let i = 0; i < f.values.length; i++) {
          const id = col.dictMap.get(String(f.values[i]))
          if (id !== undefined) dictIdSet.add(id)
        }
      }
    }

    let textLower = f.text ? f.text.toLowerCase().trim() : null
    let textMode = f.textMode || 'contains'

    let boolVal = null
    if (f.bool === 'true' || f.bool === true) boolVal = 1
    if (f.bool === 'false' || f.bool === false) boolVal = 0

    return {
      colIndex,
      type: col.type,
      isDictionary: col.isDictionary,
      dictionary: col.dictionary,
      data: col.data,
      nulls: col.nulls,
      min,
      max,
      regexObj,
      valueSet,
      dictIdSet,
      textLower,
      textMode,
      boolVal,
    }
  }).filter(Boolean)

  const numFilters = compiledFilters.length
  let matchCount = 0
  const tempIndices = new Uint32Array(rowCount)

  for (let r = 0; r < rowCount; r++) {
    let passed = true
    for (let f = 0; f < numFilters; f++) {
      const filter = compiledFilters[f]
      const isNull = filter.nulls[r] === 1

      if (isNull) {
        passed = false
        break
      }

      if (filter.type === 'number' || filter.type === 'date') {
        const val = filter.data[r]
        if (val < filter.min || val > filter.max) {
          passed = false
          break
        }
      } else if (filter.type === 'boolean') {
        if (filter.boolVal !== null && filter.data[r] !== filter.boolVal) {
          passed = false
          break
        }
      } else if (filter.type === 'string') {
        if (filter.dictIdSet) {
          const id = filter.data[r]
          if (!filter.dictIdSet.has(id)) {
            passed = false
            break
          }
        } else if (filter.valueSet) {
          const str = filter.isDictionary ? filter.dictionary[filter.data[r]] : filter.data[r]
          if (!filter.valueSet.has(str)) {
            passed = false
            break
          }
        }

        if (filter.regexObj) {
          const str = filter.isDictionary ? filter.dictionary[filter.data[r]] : filter.data[r]
          if (!filter.regexObj.test(str)) {
            passed = false
            break
          }
        }

        if (filter.textLower) {
          const rawStr = filter.isDictionary ? filter.dictionary[filter.data[r]] : filter.data[r]
          const str = (rawStr || '').toLowerCase()
          if (filter.textMode === 'startsWith') {
            if (!str.startsWith(filter.textLower)) {
              passed = false
              break
            }
          } else if (filter.textMode === 'equals') {
            if (str !== filter.textLower) {
              passed = false
              break
            }
          } else {
            if (!str.includes(filter.textLower)) {
              passed = false
              break
            }
          }
        }
      }
    }

    if (passed) {
      tempIndices[matchCount++] = r
    }
  }

  return tempIndices.subarray(0, matchCount)
}

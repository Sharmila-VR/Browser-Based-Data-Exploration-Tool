export class ColumnarTable {
  constructor(columns, initialCapacity = 10000) {
    this.columns = columns.map(col => ({
      name: col.name,
      type: col.type,
      isDictionary: !!col.isDictionary,
      cardinality: col.cardinality || 0,
      dictionary: col.isDictionary ? [] : null,
      dictMap: col.isDictionary ? new Map() : null,
      data: null,
      nulls: null,
      min: Infinity,
      max: -Infinity,
    }))
    this.rowCount = 0
    this.capacity = 0
    this.allocate(initialCapacity)
  }

  allocate(capacity) {
    const newCap = Math.max(capacity, 16)
    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c]
      const oldData = col.data
      const oldNulls = col.nulls

      let newData = null
      let newNulls = new Uint8Array(newCap)

      if (col.type === 'number' || col.type === 'date') {
        newData = new Float64Array(newCap)
      } else if (col.type === 'boolean') {
        newData = new Uint8Array(newCap)
      } else if (col.type === 'string') {
        if (col.isDictionary) {
          newData = new Uint16Array(newCap)
        } else {
          newData = new Array(newCap)
        }
      }

      if (oldData && this.rowCount > 0) {
        if (Array.isArray(newData)) {
          for (let r = 0; r < this.rowCount; r++) {
            newData[r] = oldData[r]
          }
        } else {
          newData.set(oldData.subarray(0, this.rowCount))
        }
        newNulls.set(oldNulls.subarray(0, this.rowCount))
      }

      col.data = newData
      col.nulls = newNulls
    }
    this.capacity = newCap
  }

  ensureCapacity(minCapacity) {
    if (minCapacity > this.capacity) {
      let nextCap = Math.max(minCapacity, Math.floor(this.capacity * 1.5))
      this.allocate(nextCap)
    }
  }

  appendRow(values) {
    if (this.rowCount >= this.capacity) {
      this.ensureCapacity(Math.max(this.rowCount + 1, this.capacity * 2))
    }

    const r = this.rowCount
    const numCols = this.columns.length

    for (let c = 0; c < numCols; c++) {
      const col = this.columns[c]
      const val = values[c]

      if (val === null || val === undefined || val === '') {
        col.nulls[r] = 1
        continue
      }

      if (col.type === 'number') {
        const num = typeof val === 'number' ? val : Number(val)
        if (Number.isNaN(num)) {
          col.nulls[r] = 1
        } else {
          col.data[r] = num
          if (num < col.min) col.min = num
          if (num > col.max) col.max = num
        }
      } else if (col.type === 'date') {
        let timestamp = 0
        if (typeof val === 'number') {
          timestamp = val
        } else {
          timestamp = Date.parse(val)
        }
        if (Number.isNaN(timestamp)) {
          col.nulls[r] = 1
        } else {
          col.data[r] = timestamp
          if (timestamp < col.min) col.min = timestamp
          if (timestamp > col.max) col.max = timestamp
        }
      } else if (col.type === 'boolean') {
        let b = 0
        if (typeof val === 'boolean') {
          b = val ? 1 : 0
        } else {
          const s = String(val).toLowerCase().trim()
          b = (s === 'true' || s === '1' || s === 'yes') ? 1 : 0
        }
        col.data[r] = b
      } else if (col.type === 'string') {
        const str = typeof val === 'string' ? val : String(val)
        if (col.isDictionary) {
          let id = col.dictMap.get(str)
          if (id === undefined) {
            id = col.dictionary.length
            col.dictionary.push(str)
            col.dictMap.set(str, id)
          }
          col.data[r] = id
        } else {
          col.data[r] = str
        }
      }
    }

    this.rowCount++
  }

  trimToSize() {
    if (this.capacity === this.rowCount) return

    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c]
      if (Array.isArray(col.data)) {
        col.data = col.data.slice(0, this.rowCount)
      } else {
        col.data = col.data.slice(0, this.rowCount)
      }
      col.nulls = col.nulls.slice(0, this.rowCount)
      col.cardinality = col.isDictionary ? col.dictionary.length : 0
    }
    this.capacity = this.rowCount
  }

  getValue(colIndex, rowIndex) {
    const col = this.columns[colIndex]
    if (!col || rowIndex >= this.rowCount) return null
    if (col.nulls[rowIndex] === 1) return null

    if (col.type === 'string' && col.isDictionary) {
      const id = col.data[rowIndex]
      return col.dictionary[id] || ''
    }

    if (col.type === 'boolean') {
      return col.data[rowIndex] === 1
    }

    return col.data[rowIndex]
  }

  getFormattedValue(colIndex, rowIndex) {
    const val = this.getValue(colIndex, rowIndex)
    if (val === null || val === undefined) return ''

    const col = this.columns[colIndex]
    if (col.type === 'date') {
      const d = new Date(val)
      return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
    }
    if (col.type === 'number') {
      return Number.isInteger(val) ? String(val) : val.toFixed(2)
    }
    return String(val)
  }

  getRaw(colIndex, rowIndex) {
    const col = this.columns[colIndex]
    if (!col || rowIndex >= this.rowCount) return 0
    return col.data[rowIndex]
  }

  isNull(colIndex, rowIndex) {
    const col = this.columns[colIndex]
    return !col || col.nulls[rowIndex] === 1
  }

  getRow(rowIndex) {
    const row = {}
    for (let c = 0; c < this.columns.length; c++) {
      row[this.columns[c].name] = this.getValue(c, rowIndex)
    }
    return row
  }

  getColumnStats(colIndex, activeIndices = null) {
    const col = this.columns[colIndex]
    if (!col) return null

    const total = activeIndices ? activeIndices.length : this.rowCount
    let validCount = 0
    let nullCount = 0
    let sum = 0
    let min = Infinity
    let max = -Infinity
    const distinctSet = new Set()

    const count = total
    for (let i = 0; i < count; i++) {
      const r = activeIndices ? activeIndices[i] : i
      if (col.nulls[r] === 1) {
        nullCount++
        continue
      }
      validCount++

      if (col.type === 'number' || col.type === 'date') {
        const val = col.data[r]
        sum += val
        if (val < min) min = val
        if (val > max) max = val
      } else if (col.type === 'string') {
        if (col.isDictionary) {
          distinctSet.add(col.data[r])
        } else {
          distinctSet.add(col.data[r])
        }
      } else if (col.type === 'boolean') {
        distinctSet.add(col.data[r])
      }
    }

    if (min === Infinity) min = 0
    if (max === -Infinity) max = 0
    const avg = validCount > 0 && (col.type === 'number' || col.type === 'date') ? sum / validCount : 0
    const distinctCount = col.isDictionary ? col.dictionary.length : distinctSet.size

    return {
      name: col.name,
      type: col.type,
      rowCount: total,
      validCount,
      nullCount,
      min,
      max,
      sum,
      avg,
      distinctCount,
    }
  }

  getMemoryEstimate() {
    let bytes = 0
    for (let c = 0; c < this.columns.length; c++) {
      const col = this.columns[c]
      if (col.data && col.data.byteLength) {
        bytes += col.data.byteLength
      } else if (Array.isArray(col.data)) {
        bytes += col.data.length * 8
      }
      if (col.nulls && col.nulls.byteLength) {
        bytes += col.nulls.byteLength
      }
      if (col.dictionary) {
        for (let d = 0; d < col.dictionary.length; d++) {
          bytes += col.dictionary[d].length * 2
        }
      }
    }
    return bytes
  }
}

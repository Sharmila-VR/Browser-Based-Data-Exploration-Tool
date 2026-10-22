export function parseCSVLine(line, delimiter = ',') {
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += char
    }
  }
  result.push(current)
  return result
}

export function parseCSVChunk(text, previousRemainder = '', delimiter = ',') {
  const fullText = previousRemainder + text
  const rows = []
  let currentField = ''
  let currentRow = []
  let inQuotes = false

  let i = 0
  const len = fullText.length
  let lastProcessedIndex = 0

  while (i < len) {
    const char = fullText[i]

    if (char === '"') {
      if (inQuotes && i + 1 < len && fullText[i + 1] === '"') {
        currentField += '"'
        i += 2
        continue
      } else {
        inQuotes = !inQuotes
        i++
        continue
      }
    }

    if (!inQuotes) {
      if (char === delimiter) {
        currentRow.push(currentField)
        currentField = ''
        i++
        continue
      }
      if (char === '\r') {
        if (i + 1 < len && fullText[i + 1] === '\n') {
          i++
        }
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i++
        lastProcessedIndex = i
        continue
      }
      if (char === '\n') {
        currentRow.push(currentField)
        rows.push(currentRow)
        currentRow = []
        currentField = ''
        i++
        lastProcessedIndex = i
        continue
      }
    }

    currentField += char
    i++
  }

  const remainder = fullText.slice(lastProcessedIndex)
  return { rows, remainder }
}

export function detectColumnType(values) {
  let numberCount = 0
  let dateCount = 0
  let boolCount = 0
  let nonEmptyCount = 0
  const uniqueStrings = new Set()

  const boolMap = {
    true: true,
    false: true,
    1: true,
    0: true,
    yes: true,
    no: true,
  }

  for (let i = 0; i < values.length; i++) {
    const raw = values[i]
    if (raw === null || raw === undefined) continue
    const val = typeof raw === 'string' ? raw.trim() : String(raw)
    if (val === '') continue

    nonEmptyCount++
    uniqueStrings.add(val)

    const lower = val.toLowerCase()
    if (boolMap[lower]) {
      boolCount++
    }

    const num = Number(val)
    if (!Number.isNaN(num) && val !== '') {
      numberCount++
    }

    if (val.length >= 8 && (val.includes('-') || val.includes('/') || val.includes('T'))) {
      const parsedDate = Date.parse(val)
      if (!Number.isNaN(parsedDate)) {
        dateCount++
      }
    }
  }

  if (nonEmptyCount === 0) {
    return { type: 'string', isDictionary: true, cardinality: 0 }
  }

  if (boolCount === nonEmptyCount) {
    return { type: 'boolean', isDictionary: false, cardinality: 2 }
  }

  if (numberCount === nonEmptyCount) {
    return { type: 'number', isDictionary: false, cardinality: uniqueStrings.size }
  }

  if (dateCount / nonEmptyCount >= 0.9) {
    return { type: 'date', isDictionary: false, cardinality: uniqueStrings.size }
  }

  const cardinality = uniqueStrings.size
  const isDictionary = cardinality <= 65535 && cardinality / Math.max(1, nonEmptyCount) < 0.7

  return {
    type: 'string',
    isDictionary,
    cardinality,
  }
}

export function detectSchema(headers, sampleRows) {
  const columns = []
  const columnCount = headers.length

  for (let c = 0; c < columnCount; c++) {
    const colName = headers[c] || `Column_${c + 1}`
    const sampleValues = []
    for (let r = 0; r < sampleRows.length; r++) {
      if (sampleRows[r] && sampleRows[r].length > c) {
        sampleValues.push(sampleRows[r][c])
      }
    }
    const detected = detectColumnType(sampleValues)
    columns.push({
      name: colName,
      type: detected.type,
      isDictionary: detected.isDictionary,
      cardinality: detected.cardinality,
    })
  }

  return columns
}

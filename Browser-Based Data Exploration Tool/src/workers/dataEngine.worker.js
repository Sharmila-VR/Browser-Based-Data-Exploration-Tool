import { parseCSVChunk, detectSchema } from '../core/csvParser.js'
import { ColumnarTable } from '../core/columnarStorage.js'
import { applyFilters } from '../core/filterEngine.js'
import { sortIndices } from '../core/sortEngine.js'
import { aggregateData } from '../core/aggregationEngine.js'
import { getHistogramData, getBarData, getLineData, getScatterData } from '../core/chartEngine.js'

let table = null
let activeIndices = null
let currentFilters = {}
let currentSort = []

function postProgress(percent, rowsLoaded, totalRows, statusText = '') {
  self.postMessage({
    type: 'PROGRESS',
    payload: { percent, rowsLoaded, totalRows, statusText }
  })
}

function generateBenchmark(rowCount = 2000000) {
  const startTime = performance.now()
  postProgress(5, 0, rowCount, 'Initializing columnar memory...')

  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East']
  const categories = ['Computers', 'Smartphones', 'Audio', 'Home Appliances', 'Wearables', 'Gaming', 'Accessories']
  const customerTypes = ['Individual', 'Small Business', 'Enterprise', 'Government']
  const channels = ['Online Store', 'Retail Store', 'Direct Sales', 'Partner Referral']

  const schema = [
    { name: 'order_id', type: 'number', isDictionary: false },
    { name: 'order_date', type: 'date', isDictionary: false },
    { name: 'region', type: 'string', isDictionary: true },
    { name: 'category', type: 'string', isDictionary: true },
    { name: 'customer_type', type: 'string', isDictionary: true },
    { name: 'sales', type: 'number', isDictionary: false },
    { name: 'quantity', type: 'number', isDictionary: false },
    { name: 'discount', type: 'number', isDictionary: false },
    { name: 'profit', type: 'number', isDictionary: false },
    { name: 'is_priority', type: 'boolean', isDictionary: false },
  ]

  table = new ColumnarTable(schema, rowCount)

  const startDate = Date.parse('2023-01-01')
  const dateRange = 365 * 2 * 86400000
  const batchSize = 100000
  let generated = 0

  while (generated < rowCount) {
    const end = Math.min(generated + batchSize, rowCount)
    for (let i = generated; i < end; i++) {
      const orderId = 1000000 + i
      const orderDate = startDate + Math.floor(Math.random() * dateRange)
      const region = regions[Math.floor(Math.random() * regions.length)]
      const category = categories[Math.floor(Math.random() * categories.length)]
      const customerType = customerTypes[Math.floor(Math.random() * customerTypes.length)]
      const quantity = 1 + Math.floor(Math.random() * 12)
      const basePrice = 20 + Math.floor(Math.random() * 800)
      const sales = Number((basePrice * quantity).toFixed(2))
      const discount = Math.random() > 0.6 ? Number((Math.random() * 0.35).toFixed(2)) : 0
      const margin = 0.05 + Math.random() * 0.45 - (discount * 0.8)
      const profit = Number((sales * margin).toFixed(2))
      const isPriority = Math.random() > 0.8

      table.appendRow([
        orderId,
        orderDate,
        region,
        category,
        customerType,
        sales,
        quantity,
        discount,
        profit,
        isPriority,
      ])
    }

    generated = end
    const pct = Math.floor((generated / rowCount) * 85)
    postProgress(pct, generated, rowCount, `Generated ${generated.toLocaleString()} / ${rowCount.toLocaleString()} records`)
  }

  table.trimToSize()
  postProgress(95, rowCount, rowCount, 'Finalizing index structures...')

  activeIndices = new Uint32Array(rowCount)
  for (let i = 0; i < rowCount; i++) {
    activeIndices[i] = i
  }

  currentFilters = {}
  currentSort = []

  const stats = table.columns.map((_, idx) => table.getColumnStats(idx))
  const memoryBytes = table.getMemoryEstimate()
  const durationMs = Math.round(performance.now() - startTime)

  postProgress(100, rowCount, rowCount, 'Dataset ready')

  self.postMessage({
    type: 'DATASET_READY',
    payload: {
      rowCount,
      columns: table.columns.map(c => ({
        name: c.name,
        type: c.type,
        isDictionary: c.isDictionary,
        cardinality: c.cardinality || (c.dictionary ? c.dictionary.length : 0),
        dictionary: c.dictionary ? c.dictionary.slice(0, 100) : null,
      })),
      stats,
      memoryBytes,
      durationMs,
    }
  })
}

async function parseCSVFile(file) {
  const startTime = performance.now()
  postProgress(5, 0, 0, 'Reading file header...')

  const stream = file.stream ? file.stream() : new Response(file).body
  const reader = stream.getReader()
  const decoder = new TextDecoder('utf-8')

  let remainder = ''
  let headers = null
  let sampleRows = []
  const initialSampleSize = 2000
  let isSchemaDetected = false

  let estimatedTotalBytes = file.size || 0
  let processedBytes = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    processedBytes += value.byteLength
    const chunkText = decoder.decode(value, { stream: true })
    const { rows, remainder: newRemainder } = parseCSVChunk(chunkText, remainder)
    remainder = newRemainder

    if (!headers && rows.length > 0) {
      headers = rows[0].map(h => h.trim().replace(/^"/, '').replace(/"$/, ''))
      rows.shift()
    }

    if (!isSchemaDetected) {
      for (let r = 0; r < rows.length; r++) {
        sampleRows.push(rows[r])
        if (sampleRows.length >= initialSampleSize) {
          break
        }
      }

      if (sampleRows.length >= initialSampleSize || rows.length < initialSampleSize) {
        const schema = detectSchema(headers, sampleRows)
        const estimatedRows = estimatedTotalBytes > 0
          ? Math.max(50000, Math.floor(estimatedTotalBytes / 80))
          : 500000
        table = new ColumnarTable(schema, estimatedRows)
        isSchemaDetected = true

        for (let r = 0; r < sampleRows.length; r++) {
          table.appendRow(sampleRows[r])
        }
      }
    } else {
      for (let r = 0; r < rows.length; r++) {
        table.appendRow(rows[r])
      }
    }

    const pct = estimatedTotalBytes > 0 ? Math.min(90, Math.floor((processedBytes / estimatedTotalBytes) * 90)) : 50
    postProgress(pct, table ? table.rowCount : 0, 0, `Parsed ${(processedBytes / (1024 * 1024)).toFixed(1)} MB`)
  }

  if (remainder.trim()) {
    const finalRow = remainder.split(',').map(s => s.trim())
    if (table && finalRow.length === table.columns.length) {
      table.appendRow(finalRow)
    }
  }

  table.trimToSize()
  const rowCount = table.rowCount

  activeIndices = new Uint32Array(rowCount)
  for (let i = 0; i < rowCount; i++) {
    activeIndices[i] = i
  }

  currentFilters = {}
  currentSort = []

  const stats = table.columns.map((_, idx) => table.getColumnStats(idx))
  const memoryBytes = table.getMemoryEstimate()
  const durationMs = Math.round(performance.now() - startTime)

  postProgress(100, rowCount, rowCount, 'File parsing complete')

  self.postMessage({
    type: 'DATASET_READY',
    payload: {
      rowCount,
      columns: table.columns.map(c => ({
        name: c.name,
        type: c.type,
        isDictionary: c.isDictionary,
        cardinality: c.cardinality || (c.dictionary ? c.dictionary.length : 0),
        dictionary: c.dictionary ? c.dictionary.slice(0, 100) : null,
      })),
      stats,
      memoryBytes,
      durationMs,
    }
  })
}

function handleFilterAndSort(filters, sortConfig) {
  const start = performance.now()
  currentFilters = filters || {}
  currentSort = sortConfig || []

  const filtered = applyFilters(table, currentFilters)
  activeIndices = sortIndices(filtered, table, currentSort)

  const latencyMs = Math.round(performance.now() - start)

  self.postMessage({
    type: 'FILTER_SORT_COMPLETE',
    payload: {
      filteredCount: activeIndices.length,
      latencyMs,
    }
  })
}

function handleGetRowsPage(offset = 0, limit = 50) {
  if (!table || !activeIndices) {
    self.postMessage({ type: 'ROWS_PAGE_DATA', payload: { rows: [], offset: 0, totalCount: 0 } })
    return
  }

  const totalCount = activeIndices.length
  const safeOffset = Math.max(0, Math.min(offset, totalCount))
  const safeLimit = Math.max(1, Math.min(limit, 200))
  const end = Math.min(safeOffset + safeLimit, totalCount)

  const rows = []
  for (let i = safeOffset; i < end; i++) {
    const r = activeIndices[i]
    rows.push({
      _rowIndex: r,
      ...table.getRow(r),
    })
  }

  self.postMessage({
    type: 'ROWS_PAGE_DATA',
    payload: {
      rows,
      offset: safeOffset,
      limit: safeLimit,
      totalCount,
    }
  })
}

function handleGetChartData(chartConfig) {
  const start = performance.now()
  const { chartType, xCol, yCol, agg, binCount } = chartConfig

  let data = null
  if (chartType === 'histogram') {
    data = getHistogramData(table, activeIndices, xCol, binCount || 24)
  } else if (chartType === 'bar') {
    data = getBarData(table, activeIndices, xCol, yCol, agg || 'sum', 25)
  } else if (chartType === 'line') {
    data = getLineData(table, activeIndices, xCol, yCol, agg || 'avg', 200)
  } else if (chartType === 'scatter') {
    data = getScatterData(table, activeIndices, xCol, yCol, 25000)
  }

  const latencyMs = Math.round(performance.now() - start)
  self.postMessage({
    type: 'CHART_DATA_READY',
    payload: {
      chartType,
      data,
      latencyMs,
    }
  })
}

function handleGetAggregation(groupColumns, metrics) {
  const start = performance.now()
  const result = aggregateData(table, activeIndices, groupColumns, metrics)
  const latencyMs = Math.round(performance.now() - start)

  self.postMessage({
    type: 'AGGREGATION_DATA_READY',
    payload: {
      ...result,
      latencyMs,
    }
  })
}

function handleExportCSV() {
  if (!table || !activeIndices || activeIndices.length === 0) {
    self.postMessage({ type: 'EXPORT_CSV_READY', payload: { csvText: '' } })
    return
  }

  const headers = table.columns.map(c => c.name)
  const lines = [headers.join(',')]
  const count = activeIndices.length

  for (let i = 0; i < count; i++) {
    const r = activeIndices[i]
    const rowValues = []
    for (let c = 0; c < table.columns.length; c++) {
      const val = table.getValue(c, r)
      if (val === null || val === undefined) {
        rowValues.push('')
      } else {
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          rowValues.push(`"${str.replace(/"/g, '""')}"`)
        } else {
          rowValues.push(str)
        }
      }
    }
    lines.push(rowValues.join(','))
  }

  const csvText = lines.join('\n')
  self.postMessage({
    type: 'EXPORT_CSV_READY',
    payload: { csvText }
  })
}

function handleGetDistinctValues(colName) {
  if (!table) return
  const colIndex = table.columns.findIndex(c => c.name === colName)
  if (colIndex === -1) return

  const col = table.columns[colIndex]
  let values = []

  if (col.isDictionary) {
    values = col.dictionary.slice(0, 100)
  } else {
    const set = new Set()
    const count = Math.min(table.rowCount, 10000)
    for (let i = 0; i < count; i++) {
      if (col.nulls[i] === 0) {
        set.add(table.getValue(colIndex, i))
        if (set.size >= 100) break
      }
    }
    values = Array.from(set)
  }

  self.postMessage({
    type: 'DISTINCT_VALUES_READY',
    payload: { colName, values }
  })
}

self.onmessage = function (e) {
  const { type, payload } = e.data
  switch (type) {
    case 'GENERATE_BENCHMARK':
      generateBenchmark(payload.rowCount)
      break
    case 'LOAD_CSV_FILE':
      parseCSVFile(payload.file)
      break
    case 'FILTER_AND_SORT':
      handleFilterAndSort(payload.filters, payload.sortConfig)
      break
    case 'GET_ROWS_PAGE':
      handleGetRowsPage(payload.offset, payload.limit)
      break
    case 'GET_CHART_DATA':
      handleGetChartData(payload.chartConfig)
      break
    case 'GET_AGGREGATION':
      handleGetAggregation(payload.groupColumns, payload.metrics)
      break
    case 'EXPORT_CSV':
      handleExportCSV()
      break
    case 'GET_DISTINCT_VALUES':
      handleGetDistinctValues(payload.colName)
      break
    default:
      break
  }
}

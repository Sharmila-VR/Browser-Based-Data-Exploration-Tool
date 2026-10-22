class WorkerClient {
  constructor() {
    this.worker = null
    this.progressListeners = new Set()
    this.datasetReadyListeners = new Set()
    this.pendingResolvers = new Map()
    this.reqId = 0
  }

  init() {
    if (this.worker) return
    this.worker = new Worker(new URL('./dataEngine.worker.js', import.meta.url), {
      type: 'module',
    })

    this.worker.onmessage = (e) => {
      const { type, payload } = e.data

      if (type === 'PROGRESS') {
        for (const cb of this.progressListeners) {
          cb(payload)
        }
        return
      }

      if (type === 'DATASET_READY') {
        for (const cb of this.datasetReadyListeners) {
          cb(payload)
        }
      }

      const resolver = this.pendingResolvers.get(type)
      if (resolver) {
        resolver(payload)
        this.pendingResolvers.delete(type)
      }
    }
  }

  onProgress(cb) {
    this.progressListeners.add(cb)
    return () => this.progressListeners.delete(cb)
  }

  onDatasetReady(cb) {
    this.datasetReadyListeners.add(cb)
    return () => this.datasetReadyListeners.delete(cb)
  }

  generateBenchmark(rowCount = 500000) {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('DATASET_READY', resolve)
      this.worker.postMessage({
        type: 'GENERATE_BENCHMARK',
        payload: { rowCount },
      })
    })
  }

  loadCSVFile(file) {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('DATASET_READY', resolve)
      this.worker.postMessage({
        type: 'LOAD_CSV_FILE',
        payload: { file },
      })
    })
  }

  filterAndSort(filters, sortConfig) {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('FILTER_SORT_COMPLETE', resolve)
      this.worker.postMessage({
        type: 'FILTER_AND_SORT',
        payload: { filters, sortConfig },
      })
    })
  }

  getRowsPage(offset = 0, limit = 50) {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('ROWS_PAGE_DATA', resolve)
      this.worker.postMessage({
        type: 'GET_ROWS_PAGE',
        payload: { offset, limit },
      })
    })
  }

  getChartData(chartConfig) {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('CHART_DATA_READY', resolve)
      this.worker.postMessage({
        type: 'GET_CHART_DATA',
        payload: { chartConfig },
      })
    })
  }

  getAggregation(groupColumns, metrics) {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('AGGREGATION_DATA_READY', resolve)
      this.worker.postMessage({
        type: 'GET_AGGREGATION',
        payload: { groupColumns, metrics },
      })
    })
  }

  exportCSV() {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('EXPORT_CSV_READY', resolve)
      this.worker.postMessage({
        type: 'EXPORT_CSV',
      })
    })
  }

  getDistinctValues(colName) {
    this.init()
    return new Promise((resolve) => {
      this.pendingResolvers.set('DISTINCT_VALUES_READY', resolve)
      this.worker.postMessage({
        type: 'GET_DISTINCT_VALUES',
        payload: { colName },
      })
    })
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate()
      this.worker = null
    }
  }
}

export const workerClient = new WorkerClient()

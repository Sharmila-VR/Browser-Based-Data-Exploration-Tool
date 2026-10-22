import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  status: 'idle',
  loadingProgress: {
    percent: 0,
    rowsLoaded: 0,
    totalRows: 0,
    statusText: '',
  },
  rowCount: 0,
  filteredCount: 0,
  columns: [],
  stats: [],
  memoryBytes: 0,
  durationMs: 0,
  filterSortLatencyMs: 0,
  error: null,
}

const datasetSlice = createSlice({
  name: 'dataset',
  initialState,
  reducers: {
    startLoading(state) {
      state.status = 'loading'
      state.loadingProgress = { percent: 0, rowsLoaded: 0, totalRows: 0, statusText: 'Initializing...' }
      state.error = null
    },
    setLoadingProgress(state, action) {
      state.loadingProgress = action.payload
    },
    setDatasetReady(state, action) {
      state.status = 'ready'
      state.rowCount = action.payload.rowCount
      state.filteredCount = action.payload.rowCount
      state.columns = action.payload.columns
      state.stats = action.payload.stats
      state.memoryBytes = action.payload.memoryBytes
      state.durationMs = action.payload.durationMs
      state.loadingProgress = { percent: 100, rowsLoaded: action.payload.rowCount, totalRows: action.payload.rowCount, statusText: 'Ready' }
    },
    setFilterSortResult(state, action) {
      state.filteredCount = action.payload.filteredCount
      state.filterSortLatencyMs = action.payload.latencyMs
    },
    setError(state, action) {
      state.status = 'error'
      state.error = action.payload
    },
  },
})

export const {
  startLoading,
  setLoadingProgress,
  setDatasetReady,
  setFilterSortResult,
  setError,
} = datasetSlice.actions

export default datasetSlice.reducer

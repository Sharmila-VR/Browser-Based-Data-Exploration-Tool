import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  groupColumns: [],
  metrics: [],
  pivotData: null,
  latencyMs: 0,
}

const pivotSlice = createSlice({
  name: 'pivot',
  initialState,
  reducers: {
    setPivotConfig(state, action) {
      if (action.payload.groupColumns !== undefined) {
        state.groupColumns = action.payload.groupColumns
      }
      if (action.payload.metrics !== undefined) {
        state.metrics = action.payload.metrics
      }
    },
    addGroupColumn(state, action) {
      if (!state.groupColumns.includes(action.payload)) {
        state.groupColumns.push(action.payload)
      }
    },
    removeGroupColumn(state, action) {
      state.groupColumns = state.groupColumns.filter(c => c !== action.payload)
    },
    addMetric(state, action) {
      state.metrics.push(action.payload)
    },
    removeMetric(state, action) {
      state.metrics.splice(action.payload, 1)
    },
    setPivotData(state, action) {
      state.pivotData = action.payload
      state.latencyMs = action.payload.latencyMs
    },
  },
})

export const {
  setPivotConfig,
  addGroupColumn,
  removeGroupColumn,
  addMetric,
  removeMetric,
  setPivotData,
} = pivotSlice.actions

export default pivotSlice.reducer

import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  chartType: 'bar',
  xCol: '',
  yCol: '',
  agg: 'sum',
  chartData: null,
  latencyMs: 0,
  brushFilter: null,
  showAccessibleTable: false,
  palette: 'okabe-ito',
  zoom: 1,
  pan: { x: 0, y: 0 },
}

const chartSlice = createSlice({
  name: 'chart',
  initialState,
  reducers: {
    setChartConfig(state, action) {
      const { chartType, xCol, yCol, agg } = action.payload
      if (chartType !== undefined) state.chartType = chartType
      if (xCol !== undefined) state.xCol = xCol
      if (yCol !== undefined) state.yCol = yCol
      if (agg !== undefined) state.agg = agg
      state.zoom = 1
      state.pan = { x: 0, y: 0 }
    },
    setChartData(state, action) {
      state.chartData = action.payload.data
      state.latencyMs = action.payload.latencyMs
    },
    setBrushFilter(state, action) {
      state.brushFilter = action.payload
    },
    clearBrushFilter(state) {
      state.brushFilter = null
    },
    toggleAccessibleTable(state) {
      state.showAccessibleTable = !state.showAccessibleTable
    },
    setPalette(state, action) {
      state.palette = action.payload
    },
    setZoomPan(state, action) {
      state.zoom = action.payload.zoom
      state.pan = action.payload.pan
    },
    resetZoomPan(state) {
      state.zoom = 1
      state.pan = { x: 0, y: 0 }
    },
  },
})

export const {
  setChartConfig,
  setChartData,
  setBrushFilter,
  clearBrushFilter,
  toggleAccessibleTable,
  setPalette,
  setZoomPan,
  resetZoomPan,
} = chartSlice.actions

export default chartSlice.reducer

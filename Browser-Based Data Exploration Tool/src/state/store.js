import { configureStore } from '@reduxjs/toolkit'
import datasetReducer from './datasetSlice.js'
import gridReducer from './gridSlice.js'
import chartReducer from './chartSlice.js'
import pivotReducer from './pivotSlice.js'
import uiReducer from './uiSlice.js'

export const store = configureStore({
  reducer: {
    dataset: datasetReducer,
    grid: gridReducer,
    chart: chartReducer,
    pivot: pivotReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
})

import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  activeTab: 'grid',
  benchmarkSize: 500000,
  toastMessage: null,
  benchmarkModalOpen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setActiveTab(state, action) {
      state.activeTab = action.payload
    },
    setBenchmarkSize(state, action) {
      state.benchmarkSize = action.payload
    },
    showToast(state, action) {
      state.toastMessage = action.payload
    },
    clearToast(state) {
      state.toastMessage = null
    },
    setBenchmarkModalOpen(state, action) {
      state.benchmarkModalOpen = action.payload
    },
  },
})

export const {
  setActiveTab,
  setBenchmarkSize,
  showToast,
  clearToast,
  setBenchmarkModalOpen,
} = uiSlice.actions

export default uiSlice.reducer

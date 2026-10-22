import { createSlice } from '@reduxjs/toolkit'

const initialState = {
  rows: [],
  offset: 0,
  limit: 60,
  totalCount: 0,
  columnWidths: {},
  columnOrder: [],
  pinnedColumns: [],
  sortConfig: [],
  filters: {},
  activeCell: { rowIndex: 0, colIndex: 0 },
  activeFilterColumn: null,
}

const gridSlice = createSlice({
  name: 'grid',
  initialState,
  reducers: {
    setGridColumns(state, action) {
      const cols = action.payload
      state.columnOrder = cols.map(c => c.name)
      const widths = {}
      for (const col of cols) {
        if (col.type === 'number') widths[col.name] = 120
        else if (col.type === 'date') widths[col.name] = 130
        else if (col.type === 'boolean') widths[col.name] = 110
        else widths[col.name] = 160
      }
      state.columnWidths = widths
      state.pinnedColumns = []
    },
    setRowsPage(state, action) {
      state.rows = action.payload.rows
      state.offset = action.payload.offset
      state.limit = action.payload.limit
      state.totalCount = action.payload.totalCount
    },
    toggleSort(state, action) {
      const { column, multi } = action.payload
      const existingIdx = state.sortConfig.findIndex(s => s.column === column)

      if (multi) {
        if (existingIdx !== -1) {
          const current = state.sortConfig[existingIdx]
          if (current.direction === 'asc') {
            state.sortConfig[existingIdx].direction = 'desc'
          } else {
            state.sortConfig.splice(existingIdx, 1)
          }
        } else {
          state.sortConfig.push({ column, direction: 'asc' })
        }
      } else {
        if (existingIdx !== -1) {
          const current = state.sortConfig[existingIdx]
          if (current.direction === 'asc') {
            state.sortConfig = [{ column, direction: 'desc' }]
          } else {
            state.sortConfig = []
          }
        } else {
          state.sortConfig = [{ column, direction: 'asc' }]
        }
      }
    },
    setSortConfig(state, action) {
      state.sortConfig = action.payload
    },
    setColumnFilter(state, action) {
      const { column, filter } = action.payload
      if (!filter) {
        delete state.filters[column]
      } else {
        state.filters[column] = filter
      }
    },
    clearAllFilters(state) {
      state.filters = {}
    },
    setAllFilters(state, action) {
      state.filters = action.payload || {}
    },
    resizeColumn(state, action) {
      const { column, width } = action.payload
      state.columnWidths[column] = Math.max(70, Math.min(500, width))
    },
    reorderColumns(state, action) {
      state.columnOrder = action.payload
    },
    togglePinColumn(state, action) {
      const colName = action.payload
      const idx = state.pinnedColumns.indexOf(colName)
      if (idx !== -1) {
        state.pinnedColumns.splice(idx, 1)
      } else {
        state.pinnedColumns.push(colName)
      }
    },
    setActiveCell(state, action) {
      state.activeCell = action.payload
    },
    setActiveFilterColumn(state, action) {
      state.activeFilterColumn = action.payload
    },
  },
})

export const {
  setGridColumns,
  setRowsPage,
  toggleSort,
  setSortConfig,
  setColumnFilter,
  clearAllFilters,
  setAllFilters,
  resizeColumn,
  reorderColumns,
  togglePinColumn,
  setActiveCell,
  setActiveFilterColumn,
} = gridSlice.actions

export default gridSlice.reducer

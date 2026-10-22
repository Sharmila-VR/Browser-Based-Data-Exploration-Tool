import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import SpeedIcon from '@mui/icons-material/Speed'
import MemoryIcon from '@mui/icons-material/Memory'
import FilterListIcon from '@mui/icons-material/FilterList'
import { clearAllFilters } from '../state/gridSlice.js'
import { setFilterSortResult } from '../state/datasetSlice.js'
import { workerClient } from '../workers/workerClient.js'

export default function StatusBar() {
  const dispatch = useDispatch()
  const { rowCount, filteredCount, filterSortLatencyMs, memoryBytes } = useSelector(state => state.dataset)
  const filters = useSelector(state => state.grid.filters)
  const sortConfig = useSelector(state => state.grid.sortConfig)

  const activeFilterCount = Object.keys(filters).length

  const handleClearFilters = () => {
    dispatch(clearAllFilters())
    workerClient.filterAndSort({}, sortConfig).then(res => {
      if (res) {
        dispatch(setFilterSortResult(res))
        workerClient.getRowsPage(0, 60)
      }
    })
  }

  const formatMemory = (bytes) => {
    if (!bytes) return '0 MB'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  return (
    <footer className="app-statusbar">
      <div className="statusbar-left">
        <span className="status-item">
          <span className="status-dot online" />
          <span>Worker Engine Ready</span>
        </span>

        <span className="status-sep">|</span>

        <span className="status-item">
          <strong>{rowCount > 0 ? rowCount.toLocaleString() : '0'}</strong>
          <span className="status-label">total rows</span>
        </span>

        {filteredCount !== rowCount && (
          <>
            <span className="status-sep">|</span>
            <span className="status-item highlight">
              <strong>{filteredCount.toLocaleString()}</strong>
              <span className="status-label">matching filters</span>
            </span>
          </>
        )}

        {activeFilterCount > 0 && (
          <>
            <span className="status-sep">|</span>
            <span className="status-item">
              <FilterListIcon fontSize="inherit" />
              <span>{activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}</span>
              <button type="button" className="status-link-btn" onClick={handleClearFilters}>
                Clear
              </button>
            </span>
          </>
        )}
      </div>

      <div className="statusbar-right">
        <span className="status-item" title="Engine execution latency">
          <SpeedIcon fontSize="inherit" />
          <span>{filterSortLatencyMs} ms</span>
        </span>

        <span className="status-sep">|</span>

        <span className="status-item" title="Memory consumed by columnar typed arrays">
          <MemoryIcon fontSize="inherit" />
          <span>{formatMemory(memoryBytes)}</span>
        </span>

        <span className="status-sep">|</span>

        <span className="status-item muted">
          <span>Client-Side ArrayBuffers</span>
        </span>
      </div>
    </footer>
  )
}

import React, { useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import CloseIcon from '@mui/icons-material/Close'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'

import { setColumnFilter, setActiveFilterColumn } from '../../state/gridSlice.js'
import { workerClient } from '../../workers/workerClient.js'

export default function GridFilterPopup({ column, anchorRect, onClose, onApply }) {
  const dispatch = useDispatch()
  const existingFilter = useSelector(state => state.grid.filters[column.name]) || {}

  const [minVal, setMinVal] = useState(existingFilter.min !== undefined ? existingFilter.min : '')
  const [maxVal, setMaxVal] = useState(existingFilter.max !== undefined ? existingFilter.max : '')
  const [textVal, setTextVal] = useState(existingFilter.text || '')
  const [textMode, setTextMode] = useState(existingFilter.textMode || 'contains')
  const [regexVal, setRegexVal] = useState(existingFilter.regex || '')
  const [boolVal, setBoolVal] = useState(existingFilter.bool !== undefined ? existingFilter.bool : 'all')

  const [distinctValues, setDistinctValues] = useState([])
  const [selectedValues, setSelectedValues] = useState(
    existingFilter.values ? new Set(existingFilter.values) : new Set()
  )
  const [distinctSearch, setDistinctSearch] = useState('')

  useEffect(() => {
    if (column.type === 'string') {
      workerClient.getDistinctValues(column.name).then(res => {
        if (res && res.values) {
          setDistinctValues(res.values)
          if (!existingFilter.values) {
            setSelectedValues(new Set(res.values))
          }
        }
      })
    }
  }, [column.name, column.type])

  const handleApply = () => {
    let filter = null

    if (column.type === 'number' || column.type === 'date') {
      if (minVal !== '' || maxVal !== '') {
        filter = { min: minVal, max: maxVal }
      }
    } else if (column.type === 'boolean') {
      if (boolVal !== 'all') {
        filter = { bool: boolVal }
      }
    } else if (column.type === 'string') {
      const f = {}
      if (textVal.trim()) {
        f.text = textVal.trim()
        f.textMode = textMode
      }
      if (regexVal.trim()) {
        f.regex = regexVal.trim()
      }
      if (distinctValues.length > 0 && selectedValues.size < distinctValues.length) {
        f.values = Array.from(selectedValues)
      }
      if (f.text || f.regex || f.values) {
        filter = f
      }
    }

    dispatch(setColumnFilter({ column: column.name, filter }))
    dispatch(setActiveFilterColumn(null))
    if (onApply) onApply()
  }

  const handleClear = () => {
    dispatch(setColumnFilter({ column: column.name, filter: null }))
    dispatch(setActiveFilterColumn(null))
    if (onApply) onApply()
  }

  const toggleSelectValue = (val) => {
    const next = new Set(selectedValues)
    if (next.has(val)) next.delete(val)
    else next.add(val)
    setSelectedValues(next)
  }

  const selectAll = () => {
    setSelectedValues(new Set(distinctValues))
  }

  const deselectAll = () => {
    setSelectedValues(new Set())
  }

  const filteredDistinct = distinctValues.filter(v =>
    String(v).toLowerCase().includes(distinctSearch.toLowerCase())
  )

  const style = anchorRect ? {
    position: 'fixed',
    top: `${anchorRect.bottom + 6}px`,
    left: `${Math.min(anchorRect.left, window.innerWidth - 320)}px`,
    zIndex: 1000,
  } : {}

  return (
    <div className="filter-popup" style={style}>
      <div className="filter-popup-header">
        <span className="filter-popup-title">Filter: {column.name}</span>
        <button type="button" className="icon-btn-sm" onClick={onClose} aria-label="Close filter">
          <CloseIcon fontSize="inherit" />
        </button>
      </div>

      <div className="filter-popup-body">
        {(column.type === 'number' || column.type === 'date') && (
          <div className="filter-form-group">
            <label className="filter-label">Range Bounds</label>
            <div className="filter-range-inputs">
              <input
                type={column.type === 'date' ? 'date' : 'number'}
                className="filter-input"
                placeholder="Min"
                value={minVal}
                onChange={e => setMinVal(e.target.value)}
              />
              <span className="range-sep">to</span>
              <input
                type={column.type === 'date' ? 'date' : 'number'}
                className="filter-input"
                placeholder="Max"
                value={maxVal}
                onChange={e => setMaxVal(e.target.value)}
              />
            </div>
          </div>
        )}

        {column.type === 'boolean' && (
          <div className="filter-form-group">
            <label className="filter-label">Boolean Value</label>
            <div className="filter-btn-group">
              <button
                type="button"
                className={`filter-toggle-btn ${boolVal === 'all' ? 'active' : ''}`}
                onClick={() => setBoolVal('all')}
              >
                All
              </button>
              <button
                type="button"
                className={`filter-toggle-btn ${boolVal === 'true' ? 'active' : ''}`}
                onClick={() => setBoolVal('true')}
              >
                True
              </button>
              <button
                type="button"
                className={`filter-toggle-btn ${boolVal === 'false' ? 'active' : ''}`}
                onClick={() => setBoolVal('false')}
              >
                False
              </button>
            </div>
          </div>
        )}

        {column.type === 'string' && (
          <>
            <div className="filter-form-group">
              <label className="filter-label">Text Search</label>
              <div className="filter-text-row">
                <select
                  className="filter-select"
                  value={textMode}
                  onChange={e => setTextMode(e.target.value)}
                >
                  <option value="contains">Contains</option>
                  <option value="startsWith">Starts With</option>
                  <option value="equals">Exact</option>
                </select>
                <input
                  type="text"
                  className="filter-input"
                  placeholder="Query..."
                  value={textVal}
                  onChange={e => setTextVal(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-form-group">
              <label className="filter-label">Regex Pattern</label>
              <input
                type="text"
                className="filter-input font-mono"
                placeholder="e.g. ^(North|South)"
                value={regexVal}
                onChange={e => setRegexVal(e.target.value)}
              />
            </div>

            {distinctValues.length > 0 && (
              <div className="filter-form-group">
                <div className="distinct-header">
                  <label className="filter-label">Categories ({selectedValues.size}/{distinctValues.length})</label>
                  <div className="distinct-links">
                    <button type="button" className="btn-link" onClick={selectAll}>All</button>
                    <button type="button" className="btn-link" onClick={deselectAll}>None</button>
                  </div>
                </div>
                <input
                  type="text"
                  className="filter-input search-sm"
                  placeholder="Filter list..."
                  value={distinctSearch}
                  onChange={e => setDistinctSearch(e.target.value)}
                />
                <div className="distinct-list">
                  {filteredDistinct.map(val => (
                    <label key={val} className="distinct-item">
                      <input
                        type="checkbox"
                        checked={selectedValues.has(val)}
                        onChange={() => toggleSelectValue(val)}
                      />
                      <span className="distinct-text">{String(val)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="filter-popup-footer">
        <button type="button" className="btn-secondary" onClick={handleClear}>
          <DeleteIcon fontSize="inherit" />
          <span>Clear</span>
        </button>
        <button type="button" className="btn-primary" onClick={handleApply}>
          <CheckIcon fontSize="inherit" />
          <span>Apply</span>
        </button>
      </div>
    </div>
  )
}

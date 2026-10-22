import React, { useState, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import FilterListIcon from '@mui/icons-material/FilterList'
import PushPinIcon from '@mui/icons-material/PushPin'

import { toggleSort, resizeColumn, togglePinColumn, setActiveFilterColumn } from '../../state/gridSlice.js'
import GridFilterPopup from './GridFilterPopup.jsx'

export default function GridHeader({ columns, onFilterChange }) {
  const dispatch = useDispatch()
  const sortConfig = useSelector(state => state.grid.sortConfig)
  const filters = useSelector(state => state.grid.filters)
  const columnWidths = useSelector(state => state.grid.columnWidths)
  const pinnedColumns = useSelector(state => state.grid.pinnedColumns)
  const activeFilterCol = useSelector(state => state.grid.activeFilterColumn)

  const [resizingCol, setResizingCol] = useState(null)
  const [filterAnchor, setFilterAnchor] = useState(null)

  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleSortClick = (colName, e) => {
    dispatch(toggleSort({ column: colName, multi: e.shiftKey }))
    if (onFilterChange) onFilterChange()
  }

  const handleResizeStart = (colName, e) => {
    e.stopPropagation()
    setResizingCol(colName)
    startXRef.current = e.clientX
    startWidthRef.current = columnWidths[colName] || 120

    const onMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startXRef.current
      const newWidth = Math.max(70, startWidthRef.current + diff)
      dispatch(resizeColumn({ column: colName, width: newWidth }))
    }

    const onMouseUp = () => {
      setResizingCol(null)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }

  const handleFilterClick = (colName, e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setFilterAnchor(rect)
    dispatch(setActiveFilterColumn(activeFilterCol === colName ? null : colName))
  }

  const activeColumnObj = columns.find(c => c.name === activeFilterCol)

  return (
    <div className="grid-header-row" role="row">
      <div className="grid-header-cell index-col" role="columnheader">
        #
      </div>

      {columns.map((col) => {
        const width = columnWidths[col.name] || 120
        const isPinned = pinnedColumns.includes(col.name)
        const sortIdx = sortConfig.findIndex(s => s.column === col.name)
        const sortItem = sortIdx !== -1 ? sortConfig[sortIdx] : null
        const isFiltered = !!filters[col.name]

        let ariaSort = 'none'
        if (sortItem) {
          ariaSort = sortItem.direction === 'asc' ? 'ascending' : 'descending'
        }

        return (
          <div
            key={col.name}
            className={`grid-header-cell ${isPinned ? 'pinned' : ''} ${sortItem ? 'sorted' : ''}`}
            style={{ width: `${width}px`, minWidth: `${width}px` }}
            role="columnheader"
            aria-sort={ariaSort}
            onClick={(e) => handleSortClick(col.name, e)}
          >
            <div className="header-cell-content">
              <span className="col-name" title={col.name}>{col.name}</span>
              <span className="col-type-tag">{col.type}</span>

              {sortItem && (
                <span className="sort-indicator">
                  {sortItem.direction === 'asc' ? (
                    <ArrowUpwardIcon fontSize="inherit" />
                  ) : (
                    <ArrowDownwardIcon fontSize="inherit" />
                  )}
                  {sortConfig.length > 1 && <span className="sort-order">{sortIdx + 1}</span>}
                </span>
              )}

              <div className="header-cell-actions">
                <button
                  type="button"
                  className={`header-icon-btn ${isFiltered ? 'active' : ''}`}
                  onClick={(e) => handleFilterClick(col.name, e)}
                  title="Filter column"
                  aria-label={`Filter ${col.name}`}
                >
                  <FilterListIcon fontSize="inherit" />
                </button>

                <button
                  type="button"
                  className={`header-icon-btn ${isPinned ? 'pinned' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch(togglePinColumn(col.name))
                  }}
                  title={isPinned ? 'Unpin column' : 'Pin column left'}
                  aria-label={`Pin ${col.name}`}
                >
                  <PushPinIcon fontSize="inherit" />
                </button>
              </div>
            </div>

            <div
              className={`col-resize-handle ${resizingCol === col.name ? 'active' : ''}`}
              onMouseDown={(e) => handleResizeStart(col.name, e)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )
      })}

      {activeColumnObj && filterAnchor && (
        <GridFilterPopup
          column={activeColumnObj}
          anchorRect={filterAnchor}
          onClose={() => dispatch(setActiveFilterColumn(null))}
          onApply={onFilterChange}
        />
      )}
    </div>
  )
}

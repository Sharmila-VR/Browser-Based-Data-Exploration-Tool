import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import GridHeader from './GridHeader.jsx'
import { setRowsPage, setActiveCell } from '../../state/gridSlice.js'
import { setFilterSortResult } from '../../state/datasetSlice.js'
import { workerClient } from '../../workers/workerClient.js'

const ROW_HEIGHT = 34
const BUFFER_ROWS = 15

export default function VirtualGrid() {
  const dispatch = useDispatch()
  const columns = useSelector(state => state.dataset.columns)
  const filteredCount = useSelector(state => state.dataset.filteredCount)
  const rows = useSelector(state => state.grid.rows)
  const offset = useSelector(state => state.grid.offset)
  const columnWidths = useSelector(state => state.grid.columnWidths)
  const columnOrder = useSelector(state => state.grid.columnOrder)
  const pinnedColumns = useSelector(state => state.grid.pinnedColumns)
  const sortConfig = useSelector(state => state.grid.sortConfig)
  const filters = useSelector(state => state.grid.filters)
  const activeCell = useSelector(state => state.grid.activeCell)

  const containerRef = useRef(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(550)

  const orderedColumns = useMemo(() => {
    if (!columns || columns.length === 0) return []
    const colMap = new Map(columns.map(c => [c.name, c]))
    const pinned = pinnedColumns.map(name => colMap.get(name)).filter(Boolean)
    const unpinned = (columnOrder.length > 0 ? columnOrder : columns.map(c => c.name))
      .filter(name => !pinnedColumns.includes(name))
      .map(name => colMap.get(name))
      .filter(Boolean)
    return [...pinned, ...unpinned]
  }, [columns, columnOrder, pinnedColumns])

  const totalHeight = filteredCount * ROW_HEIGHT
  const visibleCount = Math.ceil(containerHeight / ROW_HEIGHT)
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS)
  const endRow = Math.min(filteredCount, startRow + visibleCount + BUFFER_ROWS * 2)
  const limit = Math.max(20, endRow - startRow)

  const fetchPage = useCallback((reqOffset, reqLimit) => {
    workerClient.getRowsPage(reqOffset, reqLimit).then(data => {
      if (data) {
        dispatch(setRowsPage(data))
      }
    })
  }, [dispatch])

  useEffect(() => {
    fetchPage(startRow, limit)
  }, [fetchPage, startRow, limit, filteredCount])

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight || 550)
      }
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleScroll = (e) => {
    setScrollTop(e.target.scrollTop)
  }

  const triggerFilterAndSort = useCallback(() => {
    workerClient.filterAndSort(filters, sortConfig).then(res => {
      if (res) {
        dispatch(setFilterSortResult(res))
        fetchPage(0, limit)
        if (containerRef.current) {
          containerRef.current.scrollTop = 0
        }
      }
    })
  }, [filters, sortConfig, dispatch, fetchPage, limit])

  const handleKeyDown = (e) => {
    if (filteredCount === 0 || orderedColumns.length === 0) return

    let nextRow = activeCell.rowIndex
    let nextCol = activeCell.colIndex

    if (e.key === 'ArrowDown') {
      nextRow = Math.min(filteredCount - 1, nextRow + 1)
      e.preventDefault()
    } else if (e.key === 'ArrowUp') {
      nextRow = Math.max(0, nextRow - 1)
      e.preventDefault()
    } else if (e.key === 'ArrowRight') {
      nextCol = Math.min(orderedColumns.length - 1, nextCol + 1)
      e.preventDefault()
    } else if (e.key === 'ArrowLeft') {
      nextCol = Math.max(0, nextCol - 1)
      e.preventDefault()
    } else if (e.key === 'PageDown') {
      nextRow = Math.min(filteredCount - 1, nextRow + 20)
      e.preventDefault()
    } else if (e.key === 'PageUp') {
      nextRow = Math.max(0, nextRow - 20)
      e.preventDefault()
    } else if (e.key === 'Home') {
      nextRow = 0
      e.preventDefault()
    } else if (e.key === 'End') {
      nextRow = filteredCount - 1
      e.preventDefault()
    }

    dispatch(setActiveCell({ rowIndex: nextRow, colIndex: nextCol }))

    if (containerRef.current) {
      const cellTop = nextRow * ROW_HEIGHT
      const viewTop = containerRef.current.scrollTop
      const viewBottom = viewTop + containerHeight - ROW_HEIGHT

      if (cellTop < viewTop) {
        containerRef.current.scrollTop = cellTop
      } else if (cellTop > viewBottom) {
        containerRef.current.scrollTop = cellTop - containerHeight + ROW_HEIGHT + 34
      }
    }
  }

  const rowsMap = useMemo(() => {
    const map = new Map()
    for (let i = 0; i < rows.length; i++) {
      const rIdx = offset + i
      map.set(rIdx, rows[i])
    }
    return map
  }, [rows, offset])

  const renderRows = []
  for (let r = startRow; r < endRow; r++) {
    const rowData = rowsMap.get(r)
    const isRowActive = activeCell.rowIndex === r

    renderRows.push(
      <div
        key={r}
        className={`grid-row ${isRowActive ? 'active' : ''} ${r % 2 === 1 ? 'odd' : 'even'}`}
        style={{
          position: 'absolute',
          top: `${r * ROW_HEIGHT}px`,
          left: 0,
          height: `${ROW_HEIGHT}px`,
        }}
        role="row"
        aria-rowindex={r + 1}
      >
        <div className="grid-cell index-col" role="gridcell">
          {r + 1}
        </div>

        {orderedColumns.map((col, colIdx) => {
          const width = columnWidths[col.name] || 120
          const isPinned = pinnedColumns.includes(col.name)
          const isCellFocused = isRowActive && activeCell.colIndex === colIdx
          const rawVal = rowData ? rowData[col.name] : ''

          let displayVal = ''
          if (rawVal !== null && rawVal !== undefined) {
            if (col.type === 'date' && typeof rawVal === 'number') {
              displayVal = new Date(rawVal).toISOString().slice(0, 10)
            } else if (col.type === 'number' && typeof rawVal === 'number') {
              displayVal = Number.isInteger(rawVal) ? String(rawVal) : rawVal.toFixed(2)
            } else if (col.type === 'boolean') {
              displayVal = rawVal ? 'true' : 'false'
            } else {
              displayVal = String(rawVal)
            }
          }

          return (
            <div
              key={col.name}
              className={`grid-cell ${isPinned ? 'pinned' : ''} ${isCellFocused ? 'focused' : ''} ${col.type}`}
              style={{ width: `${width}px`, minWidth: `${width}px` }}
              role="gridcell"
              tabIndex={isCellFocused ? 0 : -1}
              onClick={() => dispatch(setActiveCell({ rowIndex: r, colIndex: colIdx }))}
            >
              <span className="cell-value" title={displayVal}>{displayVal}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="virtual-grid-wrapper" onKeyDown={handleKeyDown} tabIndex={0} role="region" aria-label="Data Grid">
      <div
        className="virtual-grid-container"
        ref={containerRef}
        onScroll={handleScroll}
        role="grid"
        aria-rowcount={filteredCount}
        aria-colcount={orderedColumns.length}
      >
        <div className="grid-header-sticky">
          <GridHeader columns={orderedColumns} onFilterChange={triggerFilterAndSort} />
        </div>

        <div
          className="virtual-grid-canvas"
          style={{ height: `${totalHeight}px`, position: 'relative' }}
          role="rowgroup"
        >
          {renderRows}
        </div>
      </div>
    </div>
  )
}

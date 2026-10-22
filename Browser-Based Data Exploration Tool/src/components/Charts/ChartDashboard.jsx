import React, { useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import BarChartIcon from '@mui/icons-material/BarChart'
import ShowChartIcon from '@mui/icons-material/ShowChart'
import ScatterPlotIcon from '@mui/icons-material/ScatterPlot'
import ViewWeekIcon from '@mui/icons-material/ViewWeek'
import AccessibleIcon from '@mui/icons-material/Accessible'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import SpeedIcon from '@mui/icons-material/Speed'

import CanvasChart from './CanvasChart.jsx'
import AccessibleChartTable from './AccessibleChartTable.jsx'
import {
  setChartConfig,
  setChartData,
  setBrushFilter,
  clearBrushFilter,
  toggleAccessibleTable,
} from '../../state/chartSlice.js'
import { setColumnFilter, clearAllFilters } from '../../state/gridSlice.js'
import { setFilterSortResult } from '../../state/datasetSlice.js'
import { workerClient } from '../../workers/workerClient.js'

export default function ChartDashboard() {
  const dispatch = useDispatch()
  const columns = useSelector(state => state.dataset.columns)
  const filteredCount = useSelector(state => state.dataset.filteredCount)
  const sortConfig = useSelector(state => state.grid.sortConfig)
  const filters = useSelector(state => state.grid.filters)

  const {
    chartType,
    xCol,
    yCol,
    agg,
    chartData,
    latencyMs,
    brushFilter,
    showAccessibleTable,
    palette,
  } = useSelector(state => state.chart)

  const numericCols = columns.filter(c => c.type === 'number' || c.type === 'date')
  const catCols = columns.filter(c => c.type === 'string' || c.type === 'boolean')

  useEffect(() => {
    if (columns.length > 0) {
      if (!xCol) {
        const defaultX = chartType === 'histogram'
          ? (numericCols[0] ? numericCols[0].name : columns[0].name)
          : (catCols[0] ? catCols[0].name : columns[0].name)
        const defaultY = numericCols[0] ? numericCols[0].name : ''
        dispatch(setChartConfig({ xCol: defaultX, yCol: defaultY }))
      }
    }
  }, [columns, chartType, xCol, numericCols, catCols, dispatch])

  const loadChartData = useCallback(() => {
    if (!xCol) return
    workerClient.getChartData({ chartType, xCol, yCol, agg }).then(res => {
      if (res) {
        dispatch(setChartData(res))
      }
    })
  }, [chartType, xCol, yCol, agg, dispatch])

  useEffect(() => {
    loadChartData()
  }, [loadChartData, filteredCount])

  const handleBrushRange = (brushDef) => {
    dispatch(setBrushFilter(brushDef))
    const nextFilters = { ...filters }

    if (brushDef.values) {
      nextFilters[brushDef.column] = { values: brushDef.values }
    } else {
      nextFilters[brushDef.column] = { min: brushDef.min, max: brushDef.max }
    }

    dispatch(setColumnFilter({ column: brushDef.column, filter: nextFilters[brushDef.column] }))

    workerClient.filterAndSort(nextFilters, sortConfig).then(res => {
      if (res) {
        dispatch(setFilterSortResult(res))
      }
    })
  }

  const handleClearBrush = () => {
    if (brushFilter) {
      const nextFilters = { ...filters }
      delete nextFilters[brushFilter.column]
      dispatch(clearBrushFilter())
      dispatch(setColumnFilter({ column: brushFilter.column, filter: null }))
      workerClient.filterAndSort(nextFilters, sortConfig).then(res => {
        if (res) {
          dispatch(setFilterSortResult(res))
        }
      })
    }
  }

  return (
    <div className="chart-dashboard-wrapper">
      <div className="chart-controls-bar">
        <div className="chart-type-picker" role="radiogroup" aria-label="Chart Type Selection">
          <button
            type="button"
            className={`chart-type-btn ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => dispatch(setChartConfig({ chartType: 'bar' }))}
          >
            <BarChartIcon fontSize="small" />
            <span>Bar</span>
          </button>

          <button
            type="button"
            className={`chart-type-btn ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => dispatch(setChartConfig({ chartType: 'line' }))}
          >
            <ShowChartIcon fontSize="small" />
            <span>Line</span>
          </button>

          <button
            type="button"
            className={`chart-type-btn ${chartType === 'scatter' ? 'active' : ''}`}
            onClick={() => {
              const defaultX = numericCols[0] ? numericCols[0].name : columns[0].name
              const defaultY = numericCols[1] ? numericCols[1].name : defaultX
              dispatch(setChartConfig({ chartType: 'scatter', xCol: defaultX, yCol: defaultY }))
            }}
          >
            <ScatterPlotIcon fontSize="small" />
            <span>Scatter</span>
          </button>

          <button
            type="button"
            className={`chart-type-btn ${chartType === 'histogram' ? 'active' : ''}`}
            onClick={() => {
              const defaultX = numericCols[0] ? numericCols[0].name : columns[0].name
              dispatch(setChartConfig({ chartType: 'histogram', xCol: defaultX, yCol: '' }))
            }}
          >
            <ViewWeekIcon fontSize="small" />
            <span>Histogram</span>
          </button>
        </div>

        <div className="chart-dimension-selectors">
          <div className="selector-group">
            <label className="selector-label">X Dimension</label>
            <select
              className="chart-select"
              value={xCol}
              onChange={e => dispatch(setChartConfig({ xCol: e.target.value }))}
            >
              {columns.map(c => (
                <option key={c.name} value={c.name}>{c.name} ({c.type})</option>
              ))}
            </select>
          </div>

          {chartType !== 'histogram' && (
            <div className="selector-group">
              <label className="selector-label">Y Metric</label>
              <select
                className="chart-select"
                value={yCol}
                onChange={e => dispatch(setChartConfig({ yCol: e.target.value }))}
              >
                {numericCols.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {(chartType === 'bar' || chartType === 'line') && (
            <div className="selector-group">
              <label className="selector-label">Aggregation</label>
              <select
                className="chart-select"
                value={agg}
                onChange={e => dispatch(setChartConfig({ agg: e.target.value }))}
              >
                <option value="sum">Sum</option>
                <option value="avg">Average</option>
                <option value="min">Min</option>
                <option value="max">Max</option>
              </select>
            </div>
          )}
        </div>

        <div className="chart-actions-right">
          <div className="chart-latency-tag" title="Canvas rendering & query latency">
            <SpeedIcon fontSize="small" />
            <span>{latencyMs}ms</span>
          </div>

          {brushFilter && (
            <button
              type="button"
              className="btn-brush-reset"
              onClick={handleClearBrush}
              title="Clear active brushed range"
            >
              <RestartAltIcon fontSize="small" />
              <span>Reset Brush</span>
            </button>
          )}

          <button
            type="button"
            className={`btn-accessible-toggle ${showAccessibleTable ? 'active' : ''}`}
            onClick={() => dispatch(toggleAccessibleTable())}
            title="Toggle accessible HTML table view"
          >
            <AccessibleIcon fontSize="small" />
            <span>{showAccessibleTable ? 'Hide Table' : 'Accessible Table'}</span>
          </button>
        </div>
      </div>

      <div className="chart-view-area">
        <CanvasChart
          chartType={chartType}
          data={chartData}
          xCol={xCol}
          yCol={yCol}
          paletteKey={palette}
          onBrushRange={handleBrushRange}
          onClearBrush={handleClearBrush}
        />

        {showAccessibleTable && (
          <AccessibleChartTable
            chartType={chartType}
            chartData={chartData}
            xCol={xCol}
            yCol={yCol}
          />
        )}
      </div>
    </div>
  )
}

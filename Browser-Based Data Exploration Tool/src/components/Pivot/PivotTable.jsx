import React, { useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import SpeedIcon from '@mui/icons-material/Speed'

import {
  setPivotConfig,
  addGroupColumn,
  removeGroupColumn,
  addMetric,
  removeMetric,
  setPivotData,
} from '../../state/pivotSlice.js'
import { workerClient } from '../../workers/workerClient.js'

export default function PivotTable() {
  const dispatch = useDispatch()
  const columns = useSelector(state => state.dataset.columns)
  const filteredCount = useSelector(state => state.dataset.filteredCount)
  const { groupColumns, metrics, pivotData, latencyMs } = useSelector(state => state.pivot)

  const catCols = columns.filter(c => c.type === 'string' || c.type === 'boolean')
  const numCols = columns.filter(c => c.type === 'number' || c.type === 'date')

  useEffect(() => {
    if (groupColumns.length === 0 && catCols.length > 0) {
      const defaultGroup = catCols[0].name
      const defaultMetric = numCols[0] ? { column: numCols[0].name, agg: 'sum' } : null
      dispatch(setPivotConfig({
        groupColumns: [defaultGroup],
        metrics: defaultMetric ? [defaultMetric] : [{ column: columns[0].name, agg: 'count' }]
      }))
    }
  }, [columns, catCols, numCols, groupColumns.length, dispatch])

  const runAggregation = useCallback(() => {
    if (groupColumns.length === 0 && metrics.length === 0) return
    workerClient.getAggregation(groupColumns, metrics).then(res => {
      if (res) {
        dispatch(setPivotData(res))
      }
    })
  }, [groupColumns, metrics, dispatch])

  useEffect(() => {
    runAggregation()
  }, [runAggregation, filteredCount])

  const handleAddMetric = () => {
    const col = numCols[0] ? numCols[0].name : columns[0].name
    dispatch(addMetric({ column: col, agg: 'sum' }))
  }

  const handleAddGroup = (e) => {
    const col = e.target.value
    if (col) {
      dispatch(addGroupColumn(col))
      e.target.value = ''
    }
  }

  const rows = pivotData ? pivotData.rows : []
  const grandTotals = pivotData ? pivotData.grandTotals : {}

  return (
    <div className="pivot-view-wrapper">
      <div className="pivot-config-bar">
        <div className="pivot-section">
          <span className="pivot-section-title">Row Dimensions</span>
          <div className="pivot-chips">
            {groupColumns.map(colName => (
              <span key={colName} className="pivot-chip">
                <span>{colName}</span>
                <button
                  type="button"
                  className="chip-remove"
                  onClick={() => dispatch(removeGroupColumn(colName))}
                  aria-label={`Remove ${colName}`}
                >
                  <DeleteIcon fontSize="inherit" />
                </button>
              </span>
            ))}

            <select className="pivot-add-select" onChange={handleAddGroup} value="">
              <option value="" disabled>+ Add Dimension</option>
              {catCols.filter(c => !groupColumns.includes(c.name)).map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pivot-section">
          <span className="pivot-section-title">Aggregated Metrics</span>
          <div className="pivot-metrics-list">
            {metrics.map((m, idx) => (
              <div key={idx} className="metric-config-row">
                <select
                  className="pivot-select"
                  value={m.agg}
                  onChange={e => {
                    const next = [...metrics]
                    next[idx] = { ...next[idx], agg: e.target.value }
                    dispatch(setPivotConfig({ metrics: next }))
                  }}
                >
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                  <option value="median">Median</option>
                  <option value="count">Count</option>
                  <option value="distinct">Distinct Count</option>
                </select>

                <select
                  className="pivot-select"
                  value={m.column}
                  onChange={e => {
                    const next = [...metrics]
                    next[idx] = { ...next[idx], column: e.target.value }
                    dispatch(setPivotConfig({ metrics: next }))
                  }}
                >
                  {columns.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  className="icon-btn-danger"
                  onClick={() => dispatch(removeMetric(idx))}
                  aria-label="Remove metric"
                >
                  <DeleteIcon fontSize="inherit" />
                </button>
              </div>
            ))}

            <button type="button" className="btn-add-metric" onClick={handleAddMetric}>
              <AddIcon fontSize="small" />
              <span>Add Metric</span>
            </button>
          </div>
        </div>

        <div className="pivot-latency-tag" title="Group-by aggregation engine latency">
          <SpeedIcon fontSize="small" />
          <span>{latencyMs}ms</span>
        </div>
      </div>

      <div className="pivot-table-container" role="region" aria-label="Pivot Matrix Table">
        <table className="pivot-table">
          <thead>
            <tr>
              {groupColumns.map(g => (
                <th key={g} scope="col" className="pivot-th dimension">{g}</th>
              ))}
              <th scope="col" className="pivot-th count">Row Count</th>
              {metrics.map((m, idx) => (
                <th key={idx} scope="col" className="pivot-th metric">
                  {m.column} ({m.agg})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx} className={rIdx % 2 === 1 ? 'odd' : 'even'}>
                {groupColumns.map(g => (
                  <td key={g} className="pivot-td dimension">{row[g]}</td>
                ))}
                <td className="pivot-td count">{row._count ? row._count.toLocaleString() : 0}</td>
                {metrics.map((m, idx) => {
                  const key = `${m.column}_${m.agg}`
                  const val = row[key]
                  return (
                    <td key={idx} className="pivot-td metric">
                      {typeof val === 'number' ? val.toLocaleString() : val}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="pivot-grand-total">
                <td colSpan={groupColumns.length} className="pivot-td total-label">Grand Total</td>
                <td className="pivot-td count">
                  {rows.reduce((acc, r) => acc + (r._count || 0), 0).toLocaleString()}
                </td>
                {metrics.map((m, idx) => {
                  const key = `${m.column}_${m.agg}`
                  const val = grandTotals[key]
                  return (
                    <td key={idx} className="pivot-td metric">
                      {typeof val === 'number' ? val.toLocaleString() : val}
                    </td>
                  )
                })}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  )
}

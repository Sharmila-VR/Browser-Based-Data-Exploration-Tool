import React from 'react'
import { useSelector } from 'react-redux'
import MemoryIcon from '@mui/icons-material/Memory'
import StorageIcon from '@mui/icons-material/Storage'
import LayersIcon from '@mui/icons-material/Layers'

export default function DatasetOverview() {
  const { columns, stats, rowCount, filteredCount, memoryBytes, durationMs } = useSelector(state => state.dataset)

  const formatBytes = (bytes) => {
    if (!bytes) return '0 B'
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(2)} MB`
  }

  const jsObjectHeapEstimate = rowCount * columns.length * 48

  return (
    <div className="overview-container">
      <div className="overview-cards">
        <div className="overview-card">
          <div className="card-icon-wrap">
            <StorageIcon fontSize="medium" />
          </div>
          <div className="card-content">
            <span className="card-label">Total Records</span>
            <span className="card-val">{rowCount.toLocaleString()}</span>
            <span className="card-sub">{filteredCount.toLocaleString()} active filter rows</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon-wrap">
            <LayersIcon fontSize="medium" />
          </div>
          <div className="card-content">
            <span className="card-label">Columns</span>
            <span className="card-val">{columns.length}</span>
            <span className="card-sub">Automatic type detection & dictionary encoding</span>
          </div>
        </div>

        <div className="overview-card">
          <div className="card-icon-wrap">
            <MemoryIcon fontSize="medium" />
          </div>
          <div className="card-content">
            <span className="card-label">Columnar Memory</span>
            <span className="card-val">{formatBytes(memoryBytes)}</span>
            <span className="card-sub">vs ~{formatBytes(jsObjectHeapEstimate)} conventional JS heap</span>
          </div>
        </div>
      </div>

      <div className="schema-table-card">
        <h3 className="section-title">Column Schema & Statistical Distributions</h3>
        <div className="schema-table-wrapper">
          <table className="schema-table">
            <thead>
              <tr>
                <th scope="col">Column Name</th>
                <th scope="col">Inferred Type</th>
                <th scope="col">Encoding</th>
                <th scope="col">Distinct Values</th>
                <th scope="col">Nulls</th>
                <th scope="col">Min</th>
                <th scope="col">Max</th>
                <th scope="col">Average</th>
              </tr>
            </thead>
            <tbody>
              {columns.map((col, idx) => {
                const stat = stats[idx] || {}
                const isDict = col.isDictionary
                return (
                  <tr key={col.name} className={idx % 2 === 1 ? 'odd' : 'even'}>
                    <td className="col-name-td"><strong>{col.name}</strong></td>
                    <td>
                      <span className={`type-badge ${col.type}`}>{col.type}</span>
                    </td>
                    <td>
                      {isDict ? (
                        <span className="encoding-badge dict">Dictionary (Uint16)</span>
                      ) : (
                        <span className="encoding-badge typed">
                          {col.type === 'number' || col.type === 'date' ? 'Float64Array' : 'Uint8Array'}
                        </span>
                      )}
                    </td>
                    <td>{stat.distinctCount ? stat.distinctCount.toLocaleString() : '-'}</td>
                    <td>{stat.nullCount ? stat.nullCount.toLocaleString() : '0'}</td>
                    <td>
                      {col.type === 'date' && stat.min
                        ? new Date(stat.min).toISOString().slice(0, 10)
                        : (typeof stat.min === 'number' ? stat.min.toFixed(2) : '-')}
                    </td>
                    <td>
                      {col.type === 'date' && stat.max
                        ? new Date(stat.max).toISOString().slice(0, 10)
                        : (typeof stat.max === 'number' ? stat.max.toFixed(2) : '-')}
                    </td>
                    <td>{col.type === 'number' && typeof stat.avg === 'number' ? stat.avg.toFixed(2) : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

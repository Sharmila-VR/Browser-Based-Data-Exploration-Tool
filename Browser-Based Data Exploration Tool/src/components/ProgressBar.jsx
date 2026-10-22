import React from 'react'
import { useSelector } from 'react-redux'

export default function ProgressBar() {
  const { status, loadingProgress } = useSelector(state => state.dataset)

  if (status !== 'loading') return null

  const { percent = 0, rowsLoaded = 0, totalRows = 0, statusText = '' } = loadingProgress

  return (
    <div className="progress-overlay" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
      <div className="progress-card">
        <div className="progress-header">
          <div className="progress-spinner" />
          <div className="progress-title-block">
            <h3 className="progress-title">Streaming & Parsing In Worker</h3>
            <p className="progress-subtitle">{statusText || 'Processing typed arrays...'}</p>
          </div>
          <span className="progress-percent">{percent}%</span>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${percent}%` }} />
        </div>

        <div className="progress-footer">
          <span>Processed: {rowsLoaded > 0 ? rowsLoaded.toLocaleString() : '...'} rows</span>
          {totalRows > 0 && <span>Target: {totalRows.toLocaleString()} rows</span>}
        </div>
      </div>
    </div>
  )
}

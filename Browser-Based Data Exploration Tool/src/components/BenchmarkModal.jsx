import React from 'react'
import { useSelector, useDispatch } from 'react-redux'
import CloseIcon from '@mui/icons-material/Close'
import SpeedIcon from '@mui/icons-material/Speed'
import MemoryIcon from '@mui/icons-material/Memory'

import { setBenchmarkModalOpen } from '../state/uiSlice.js'

export default function BenchmarkModal({ onSelectSize }) {
  const dispatch = useDispatch()
  const isOpen = useSelector(state => state.ui.benchmarkModalOpen)

  if (!isOpen) return null

  const presets = [
    {
      rows: 100000,
      title: '100,000 Rows',
      desc: 'Rapid load & responsiveness check',
      estMemory: '~5 MB',
      duration: '< 1s',
    },
    {
      rows: 500000,
      title: '500,000 Rows',
      desc: 'Balanced dashboard exploration benchmark',
      estMemory: '~25 MB',
      duration: '~2s',
    },
    {
      rows: 1000000,
      title: '1,000,000 Rows',
      desc: 'One million row high-density dataset',
      estMemory: '~50 MB',
      duration: '~4s',
    },
    {
      rows: 2000000,
      title: '2,000,000 Rows (Full Target)',
      desc: 'Full stress test with columnar typed arrays',
      estMemory: '~95 MB',
      duration: '~7s',
      highlight: true,
    },
  ]

  const handleSelect = (rows) => {
    dispatch(setBenchmarkModalOpen(false))
    onSelectSize(rows)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="benchmark-modal-title">
      <div className="modal-card">
        <div className="modal-header">
          <div>
            <h3 id="benchmark-modal-title" className="modal-title">Select In-Memory Dataset Size</h3>
            <p className="modal-subtitle">Generate realistic columnar transactional data directly in Web Worker</p>
          </div>
          <button
            type="button"
            className="icon-btn-sm"
            onClick={() => dispatch(setBenchmarkModalOpen(false))}
            aria-label="Close modal"
          >
            <CloseIcon fontSize="inherit" />
          </button>
        </div>

        <div className="benchmark-grid">
          {presets.map(p => (
            <div
              key={p.rows}
              className={`benchmark-option ${p.highlight ? 'highlight' : ''}`}
              onClick={() => handleSelect(p.rows)}
            >
              <div className="option-header">
                <span className="option-title">{p.title}</span>
                {p.highlight && <span className="highlight-tag">2M Target</span>}
              </div>
              <p className="option-desc">{p.desc}</p>
              <div className="option-meta">
                <span className="meta-item">
                  <MemoryIcon fontSize="inherit" />
                  <span>{p.estMemory}</span>
                </span>
                <span className="meta-item">
                  <SpeedIcon fontSize="inherit" />
                  <span>{p.duration}</span>
                </span>
              </div>
              <button type="button" className="btn-select-preset">
                Load {p.rows.toLocaleString()} Rows
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

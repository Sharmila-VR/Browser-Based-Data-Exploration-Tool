import React, { useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import TableChartIcon from '@mui/icons-material/TableChart'
import BarChartIcon from '@mui/icons-material/BarChart'
import ViewColumnIcon from '@mui/icons-material/ViewColumn'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import ShareIcon from '@mui/icons-material/Share'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import StorageIcon from '@mui/icons-material/Storage'

import { setActiveTab, showToast, setBenchmarkModalOpen } from '../state/uiSlice.js'
import { setPalette } from '../state/chartSlice.js'
import { serializeStateToHash } from '../utils/urlState.js'
import { PALETTES } from '../utils/palettes.js'

export default function Navbar({ onExportCSV, onUploadFile }) {
  const dispatch = useDispatch()
  const activeTab = useSelector(state => state.ui.activeTab)
  const fullState = useSelector(state => state)
  const { rowCount, status } = useSelector(state => state.dataset)
  const currentPalette = useSelector(state => state.chart.palette)

  const fileInputRef = useRef(null)

  const handleShare = () => {
    serializeStateToHash(fullState)
    navigator.clipboard.writeText(window.location.href)
    dispatch(showToast('Shareable URL copied to clipboard'))
  }

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0]
    if (file) {
      onUploadFile(file)
    }
  }

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="product-identity">
          <div className="product-icon">
            <StorageIcon fontSize="small" />
          </div>
          <span className="product-title">DataLens</span>
          <span className="dataset-divider">/</span>
          <span className="dataset-name" title="Active in-memory dataset">
            enterprise_orders_{rowCount > 0 ? (rowCount / 1000 >= 1000 ? `${(rowCount / 1000000).toFixed(0)}m` : `${(rowCount / 1000).toFixed(0)}k`) : 'ready'}.csv
          </span>
          <span className="dataset-tag">In-Memory Columnar</span>
        </div>
      </div>

      <div className="header-center">
        <nav className="view-switcher" aria-label="Views">
          <button
            type="button"
            className={`view-tab ${activeTab === 'grid' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('grid'))}
          >
            <TableChartIcon fontSize="inherit" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            className={`view-tab ${activeTab === 'charts' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('charts'))}
          >
            <BarChartIcon fontSize="inherit" />
            <span>Charts</span>
          </button>

          <button
            type="button"
            className={`view-tab ${activeTab === 'pivot' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('pivot'))}
          >
            <AnalyticsIcon fontSize="inherit" />
            <span>Pivot</span>
          </button>

          <button
            type="button"
            className={`view-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => dispatch(setActiveTab('overview'))}
          >
            <ViewColumnIcon fontSize="inherit" />
            <span>Schema</span>
          </button>
        </nav>
      </div>

      <div className="header-right">
        <select
          className="header-select"
          value={currentPalette}
          onChange={(e) => dispatch(setPalette(e.target.value))}
          title="Color palette"
        >
          {Object.entries(PALETTES).map(([key, p]) => (
            <option key={key} value={key}>{p.name}</option>
          ))}
        </select>

        <button
          type="button"
          className="header-btn"
          onClick={() => dispatch(setBenchmarkModalOpen(true))}
          title="Switch dataset size"
        >
          <RestartAltIcon fontSize="inherit" />
          <span>Datasets</span>
        </button>

        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".csv,text/csv"
          onChange={handleFileChange}
        />

        <button
          type="button"
          className="header-btn"
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          title="Import local CSV file"
        >
          <FileUploadIcon fontSize="inherit" />
          <span>Import</span>
        </button>

        <button
          type="button"
          className="header-btn"
          onClick={onExportCSV}
          title="Export active filtered data as CSV"
          disabled={status !== 'ready' || rowCount === 0}
        >
          <FileDownloadIcon fontSize="inherit" />
          <span>Export</span>
        </button>

        <button
          type="button"
          className="header-btn primary"
          onClick={handleShare}
          title="Copy link with serialized filters and view state"
        >
          <ShareIcon fontSize="inherit" />
          <span>Share</span>
        </button>
      </div>
    </header>
  )
}

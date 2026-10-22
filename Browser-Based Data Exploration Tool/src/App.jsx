import React, { useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Navbar from './components/Navbar.jsx'
import StatusBar from './components/StatusBar.jsx'
import ProgressBar from './components/ProgressBar.jsx'
import VirtualGrid from './components/VirtualGrid/VirtualGrid.jsx'
import ChartDashboard from './components/Charts/ChartDashboard.jsx'
import PivotTable from './components/Pivot/PivotTable.jsx'
import DatasetOverview from './components/Overview/DatasetOverview.jsx'
import BenchmarkModal from './components/BenchmarkModal.jsx'
import Toast from './components/Toast.jsx'

import {
  startLoading,
  setLoadingProgress,
  setDatasetReady,
  setError,
} from './state/datasetSlice.js'
import {
  setGridColumns,
  setRowsPage,
  setAllFilters,
  setSortConfig,
} from './state/gridSlice.js'
import { setChartConfig } from './state/chartSlice.js'
import { setPivotConfig } from './state/pivotSlice.js'
import { setActiveTab, showToast } from './state/uiSlice.js'

import { workerClient } from './workers/workerClient.js'
import { parseStateFromHash } from './utils/urlState.js'

export default function App() {
  const dispatch = useDispatch()
  const activeTab = useSelector(state => state.ui.activeTab)
  const datasetStatus = useSelector(state => state.dataset.status)

  const handleBenchmarkLoad = useCallback((rowCount = 500000) => {
    dispatch(startLoading())
    workerClient.generateBenchmark(rowCount).then(data => {
      dispatch(setDatasetReady(data))
      dispatch(setGridColumns(data.columns))
      workerClient.getRowsPage(0, 60).then(page => {
        dispatch(setRowsPage(page))
      })
    }).catch(err => {
      dispatch(setError(String(err)))
    })
  }, [dispatch])

  const handleFileUpload = useCallback((file) => {
    dispatch(startLoading())
    workerClient.loadCSVFile(file).then(data => {
      dispatch(setDatasetReady(data))
      dispatch(setGridColumns(data.columns))
      workerClient.getRowsPage(0, 60).then(page => {
        dispatch(setRowsPage(page))
      })
      dispatch(showToast(`Loaded ${file.name} (${data.rowCount.toLocaleString()} rows)`))
    }).catch(err => {
      dispatch(setError(String(err)))
    })
  }, [dispatch])

  const handleExportCSV = useCallback(() => {
    dispatch(showToast('Exporting CSV...'))
    workerClient.exportCSV().then(res => {
      if (res && res.csvText) {
        const blob = new Blob([res.csvText], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `datalens_export_${Date.now()}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        dispatch(showToast('CSV Export downloaded successfully'))
      }
    })
  }, [dispatch])

  useEffect(() => {
    const unsubProgress = workerClient.onProgress((p) => {
      dispatch(setLoadingProgress(p))
    })

    const restored = parseStateFromHash()
    if (restored) {
      if (restored.tab) dispatch(setActiveTab(restored.tab))
      if (restored.filters) dispatch(setAllFilters(restored.filters))
      if (restored.sort) dispatch(setSortConfig(restored.sort))
      if (restored.chart) dispatch(setChartConfig(restored.chart))
      if (restored.pivot) dispatch(setPivotConfig({ groupColumns: restored.pivot.groups, metrics: restored.pivot.metrics }))
    }

    handleBenchmarkLoad(500000)

    return () => {
      unsubProgress()
      workerClient.terminate()
    }
  }, [dispatch, handleBenchmarkLoad])

  return (
    <div className="app-container">
      <Navbar
        onExportCSV={handleExportCSV}
        onUploadFile={handleFileUpload}
      />

      <ProgressBar />
      <BenchmarkModal onSelectSize={handleBenchmarkLoad} />
      <Toast />

      <main className="main-content">
        {datasetStatus === 'ready' && (
          <>
            {activeTab === 'grid' && <VirtualGrid />}
            {activeTab === 'charts' && <ChartDashboard />}
            {activeTab === 'pivot' && <PivotTable />}
            {activeTab === 'overview' && <DatasetOverview />}
          </>
        )}
      </main>

      <StatusBar />
    </div>
  )
}

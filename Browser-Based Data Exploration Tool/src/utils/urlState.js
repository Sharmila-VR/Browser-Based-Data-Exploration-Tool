export function serializeStateToHash(state) {
  try {
    const payload = {
      tab: state.ui.activeTab,
      filters: state.grid.filters,
      sort: state.grid.sortConfig,
      chart: {
        type: state.chart.chartType,
        xCol: state.chart.xCol,
        yCol: state.chart.yCol,
        agg: state.chart.agg,
      },
      pivot: {
        groups: state.pivot.groupColumns,
        metrics: state.pivot.metrics,
      },
    }
    const jsonStr = JSON.stringify(payload)
    const encoded = btoa(encodeURIComponent(jsonStr))
    window.location.hash = `view=${encoded}`
  } catch (e) {
    return
  }
}

export function parseStateFromHash() {
  try {
    const hash = window.location.hash.slice(1)
    if (!hash) return null
    const params = new URLSearchParams(hash)
    const encoded = params.get('view')
    if (!encoded) return null
    const jsonStr = decodeURIComponent(atob(encoded))
    return JSON.parse(jsonStr)
  } catch (e) {
    return null
  }
}

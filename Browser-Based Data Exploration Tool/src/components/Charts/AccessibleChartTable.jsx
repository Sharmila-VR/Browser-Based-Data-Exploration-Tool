import React from 'react'

export default function AccessibleChartTable({ chartType, chartData, xCol, yCol }) {
  if (!chartData) return null

  if (chartType === 'bar' && chartData.items) {
    return (
      <div className="accessible-table-wrapper" role="region" aria-label="Accessible data table for Bar Chart">
        <table className="accessible-table">
          <caption>Bar Chart: {yCol || 'Count'} grouped by {xCol}</caption>
          <thead>
            <tr>
              <th scope="col">{xCol}</th>
              <th scope="col">{yCol || 'Count'}</th>
              <th scope="col">Record Count</th>
            </tr>
          </thead>
          <tbody>
            {chartData.items.map((item, i) => (
              <tr key={i}>
                <td>{item.category}</td>
                <td>{item.value.toLocaleString()}</td>
                <td>{item.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (chartType === 'histogram' && chartData.bins) {
    return (
      <div className="accessible-table-wrapper" role="region" aria-label="Accessible data table for Histogram">
        <table className="accessible-table">
          <caption>Histogram: Distribution of {xCol}</caption>
          <thead>
            <tr>
              <th scope="col">Bin Range</th>
              <th scope="col">Min</th>
              <th scope="col">Max</th>
              <th scope="col">Frequency Count</th>
            </tr>
          </thead>
          <tbody>
            {chartData.bins.map((bin, i) => (
              <tr key={i}>
                <td>{bin.label}</td>
                <td>{bin.x0}</td>
                <td>{bin.x1}</td>
                <td>{bin.count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (chartType === 'line' && chartData.points) {
    return (
      <div className="accessible-table-wrapper" role="region" aria-label="Accessible data table for Line Chart">
        <table className="accessible-table">
          <caption>Line Chart: {yCol} across {xCol}</caption>
          <thead>
            <tr>
              <th scope="col">{xCol}</th>
              <th scope="col">{yCol}</th>
            </tr>
          </thead>
          <tbody>
            {chartData.points.slice(0, 50).map((pt, i) => (
              <tr key={i}>
                <td>{pt.label}</td>
                <td>{pt.y.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (chartType === 'scatter' && chartData.points) {
    return (
      <div className="accessible-table-wrapper" role="region" aria-label="Accessible data table for Scatter Plot">
        <table className="accessible-table">
          <caption>Scatter Plot: {xCol} vs {yCol} (Total Points: {chartData.total.toLocaleString()})</caption>
          <thead>
            <tr>
              <th scope="col">{xCol}</th>
              <th scope="col">{yCol}</th>
              <th scope="col">Density</th>
              <th scope="col">Cluster Count</th>
            </tr>
          </thead>
          <tbody>
            {chartData.points.slice(0, 50).map((pt, i) => (
              <tr key={i}>
                <td>{pt.x.toFixed(2)}</td>
                <td>{pt.y.toFixed(2)}</td>
                <td>{(pt.density * 100).toFixed(0)}%</td>
                <td>{pt.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return null
}

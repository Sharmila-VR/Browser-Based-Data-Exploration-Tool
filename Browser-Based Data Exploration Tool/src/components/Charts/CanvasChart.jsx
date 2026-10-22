import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { PALETTES, getColor } from '../../utils/palettes.js'

export default function CanvasChart({
  chartType,
  data,
  xCol,
  yCol,
  paletteKey = 'okabe-ito',
  onBrushRange,
  onClearBrush,
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const [brushState, setBrushState] = useState(null)
  const [tooltip, setTooltip] = useState(null)
  const [zoomPan, setZoomPan] = useState({ zoom: 1, panX: 0, panY: 0 })
  const [dragMode, setDragMode] = useState('brush')

  const isMouseDownRef = useRef(false)
  const startPosRef = useRef({ x: 0, y: 0 })

  const palette = PALETTES[paletteKey] || PALETTES['okabe-ito']

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    const padding = { top: 30, right: 30, bottom: 50, left: 65 }
    const plotWidth = width - padding.left - padding.right
    const plotHeight = height - padding.top - padding.bottom

    ctx.strokeStyle = '#2d3748'
    ctx.lineWidth = 1
    ctx.strokeRect(padding.left, padding.top, plotWidth, plotHeight)

    ctx.fillStyle = '#718096'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(xCol || 'X Axis', padding.left + plotWidth / 2, height - 12)

    ctx.save()
    ctx.translate(16, padding.top + plotHeight / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.fillText(yCol || 'Count', 0, 0)
    ctx.restore()

    if (chartType === 'bar' && data.items && data.items.length > 0) {
      const items = data.items
      const maxVal = data.maxVal || 1
      const barWidth = Math.max(8, Math.min(60, (plotWidth / items.length) * 0.75))
      const gap = (plotWidth - barWidth * items.length) / (items.length + 1)

      const yTicks = 5
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#a0aec0'
      ctx.strokeStyle = '#1a202c'

      for (let t = 0; t <= yTicks; t++) {
        const val = (maxVal / yTicks) * t
        const yPos = padding.top + plotHeight - (plotHeight / yTicks) * t
        ctx.beginPath()
        ctx.moveTo(padding.left, yPos)
        ctx.lineTo(padding.left + plotWidth, yPos)
        ctx.stroke()
        ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0), padding.left - 8, yPos)
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        const barHeight = (item.value / maxVal) * plotHeight
        const xPos = padding.left + gap + i * (barWidth + gap)
        const yPos = padding.top + plotHeight - barHeight

        const color = getColor(paletteKey, i)
        ctx.fillStyle = color
        ctx.fillRect(xPos, yPos, barWidth, barHeight)

        ctx.fillStyle = '#cbd5e0'
        const label = item.category.length > 12 ? `${item.category.slice(0, 10)}...` : item.category
        ctx.fillText(label, xPos + barWidth / 2, padding.top + plotHeight + 8)
      }
    } else if (chartType === 'histogram' && data.bins && data.bins.length > 0) {
      const bins = data.bins
      let maxCount = 0
      for (let b = 0; b < bins.length; b++) {
        if (bins[b].count > maxCount) maxCount = bins[b].count
      }
      if (maxCount === 0) maxCount = 1

      const binWidth = plotWidth / bins.length

      const yTicks = 5
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#a0aec0'
      ctx.strokeStyle = '#1a202c'

      for (let t = 0; t <= yTicks; t++) {
        const val = (maxCount / yTicks) * t
        const yPos = padding.top + plotHeight - (plotHeight / yTicks) * t
        ctx.beginPath()
        ctx.moveTo(padding.left, yPos)
        ctx.lineTo(padding.left + plotWidth, yPos)
        ctx.stroke()
        ctx.fillText(val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0), padding.left - 8, yPos)
      }

      ctx.fillStyle = palette.primary
      ctx.strokeStyle = '#1a202c'

      for (let b = 0; b < bins.length; b++) {
        const bin = bins[b]
        const h = (bin.count / maxCount) * plotHeight
        const x = padding.left + b * binWidth
        const y = padding.top + plotHeight - h

        ctx.fillRect(x, y, binWidth - 1, h)
        ctx.strokeRect(x, y, binWidth - 1, h)
      }

      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = '#a0aec0'
      ctx.fillText(String(data.min.toFixed(1)), padding.left, padding.top + plotHeight + 8)
      ctx.fillText(String(data.max.toFixed(1)), padding.left + plotWidth, padding.top + plotHeight + 8)
    } else if (chartType === 'line' && data.points && data.points.length > 0) {
      const pts = data.points
      const minX = data.minX
      const maxX = data.maxX
      const minY = data.minY
      const maxY = data.maxY
      const xSpan = maxX - minX || 1
      const ySpan = maxY - minY || 1

      const yTicks = 5
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#a0aec0'
      ctx.strokeStyle = '#1a202c'

      for (let t = 0; t <= yTicks; t++) {
        const val = minY + (ySpan / yTicks) * t
        const yPos = padding.top + plotHeight - (plotHeight / yTicks) * t
        ctx.beginPath()
        ctx.moveTo(padding.left, yPos)
        ctx.lineTo(padding.left + plotWidth, yPos)
        ctx.stroke()
        ctx.fillText(val.toFixed(1), padding.left - 8, yPos)
      }

      ctx.beginPath()
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        const px = padding.left + ((p.x - minX) / xSpan) * plotWidth
        const py = padding.top + plotHeight - ((p.y - minY) / ySpan) * plotHeight
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.strokeStyle = palette.primary
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.lineTo(padding.left + plotWidth, padding.top + plotHeight)
      ctx.lineTo(padding.left, padding.top + plotHeight)
      ctx.closePath()
      ctx.fillStyle = 'rgba(0, 114, 178, 0.15)'
      ctx.fill()
    } else if (chartType === 'scatter' && data.points && data.points.length > 0) {
      const pts = data.points
      const minX = data.minX
      const maxX = data.maxX
      const minY = data.minY
      const maxY = data.maxY
      const xSpan = maxX - minX || 1
      const ySpan = maxY - minY || 1

      ctx.save()
      ctx.beginPath()
      ctx.rect(padding.left, padding.top, plotWidth, plotHeight)
      ctx.clip()

      const zoom = zoomPan.zoom
      const panX = zoomPan.panX
      const panY = zoomPan.panY

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        const normX = (p.x - minX) / xSpan
        const normY = (p.y - minY) / ySpan

        const px = padding.left + normX * plotWidth * zoom + panX
        const py = padding.top + plotHeight - normY * plotHeight * zoom + panY

        if (px < padding.left - 10 || px > padding.left + plotWidth + 10 || py < padding.top - 10 || py > padding.top + plotHeight + 10) {
          continue
        }

        const radius = Math.min(6, Math.max(2, 2 + p.density * 4))
        const alpha = Math.min(0.9, Math.max(0.3, 0.3 + p.density * 0.6))

        ctx.beginPath()
        ctx.arc(px, py, radius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(213, 94, 0, ${alpha})`
        ctx.fill()
      }
      ctx.restore()
    }

    if (brushState && brushState.active) {
      const bx = Math.min(brushState.startX, brushState.currentX)
      const bw = Math.abs(brushState.currentX - brushState.startX)
      ctx.fillStyle = 'rgba(86, 180, 233, 0.25)'
      ctx.strokeStyle = '#56B4E9'
      ctx.lineWidth = 1.5
      ctx.fillRect(bx, padding.top, bw, plotHeight)
      ctx.strokeRect(bx, padding.top, bw, plotHeight)
    }

    ctx.restore()
  }, [chartType, data, xCol, yCol, paletteKey, palette, brushState, zoomPan])

  useEffect(() => {
    render()
  }, [render])

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    isMouseDownRef.current = true
    startPosRef.current = { x, y }

    if (dragMode === 'brush') {
      setBrushState({ active: true, startX: x, currentX: x })
    }
  }

  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !data) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const padding = { top: 30, right: 30, bottom: 50, left: 65 }
    const plotWidth = rect.width - padding.left - padding.right
    const plotHeight = rect.height - padding.top - padding.bottom

    if (isMouseDownRef.current) {
      if (dragMode === 'brush' && brushState) {
        setBrushState(prev => ({ ...prev, currentX: x }))
      } else if (dragMode === 'pan') {
        const dx = x - startPosRef.current.x
        const dy = y - startPosRef.current.y
        setZoomPan(prev => ({ ...prev, panX: prev.panX + dx, panY: prev.panY + dy }))
        startPosRef.current = { x, y }
      }
    } else {
      if (chartType === 'bar' && data.items) {
        const items = data.items
        const barWidth = Math.max(8, Math.min(60, (plotWidth / items.length) * 0.75))
        const gap = (plotWidth - barWidth * items.length) / (items.length + 1)

        let hovered = null
        for (let i = 0; i < items.length; i++) {
          const bx = padding.left + gap + i * (barWidth + gap)
          if (x >= bx && x <= bx + barWidth) {
            hovered = {
              title: items[i].category,
              val: items[i].value.toLocaleString(),
              count: items[i].count.toLocaleString(),
              x: e.clientX,
              y: e.clientY,
            }
            break
          }
        }
        setTooltip(hovered)
      } else if (chartType === 'histogram' && data.bins) {
        const bins = data.bins
        const binWidth = plotWidth / bins.length
        const b = Math.floor((x - padding.left) / binWidth)
        if (b >= 0 && b < bins.length) {
          setTooltip({
            title: `Bin: ${bins[b].label}`,
            val: `${bins[b].count.toLocaleString()} rows`,
            x: e.clientX,
            y: e.clientY,
          })
        } else {
          setTooltip(null)
        }
      } else {
        setTooltip(null)
      }
    }
  }

  const handleMouseUp = () => {
    if (!isMouseDownRef.current) return
    isMouseDownRef.current = false

    if (dragMode === 'brush' && brushState && canvasRef.current && data) {
      const rect = canvasRef.current.getBoundingClientRect()
      const padding = { top: 30, right: 30, bottom: 50, left: 65 }
      const plotWidth = rect.width - padding.left - padding.right

      const x1 = Math.min(brushState.startX, brushState.currentX)
      const x2 = Math.max(brushState.startX, brushState.currentX)
      const width = x2 - x1

      if (width > 10 && onBrushRange) {
        const normMin = Math.max(0, (x1 - padding.left) / plotWidth)
        const normMax = Math.min(1, (x2 - padding.left) / plotWidth)

        if (chartType === 'histogram') {
          const min = data.min + normMin * (data.max - data.min)
          const max = data.min + normMax * (data.max - data.min)
          onBrushRange({ column: xCol, min: Number(min.toFixed(2)), max: Number(max.toFixed(2)) })
        } else if (chartType === 'scatter') {
          const min = data.minX + normMin * (data.maxX - data.minX)
          const max = data.minX + normMax * (data.maxX - data.minX)
          onBrushRange({ column: xCol, min: Number(min.toFixed(2)), max: Number(max.toFixed(2)) })
        } else if (chartType === 'line') {
          const min = data.minX + normMin * (data.maxX - data.minX)
          const max = data.minX + normMax * (data.maxX - data.minX)
          onBrushRange({ column: xCol, min: Math.round(min), max: Math.round(max) })
        } else if (chartType === 'bar' && data.items) {
          const items = data.items
          const barWidth = Math.max(8, Math.min(60, (plotWidth / items.length) * 0.75))
          const gap = (plotWidth - barWidth * items.length) / (items.length + 1)
          const selected = []

          for (let i = 0; i < items.length; i++) {
            const bx = padding.left + gap + i * (barWidth + gap)
            if (bx + barWidth >= x1 && bx <= x2) {
              selected.push(items[i].category)
            }
          }
          if (selected.length > 0) {
            onBrushRange({ column: xCol, values: selected })
          }
        }
      }
      setBrushState(null)
    }
  }

  const handleWheel = (e) => {
    if (chartType === 'scatter') {
      e.preventDefault()
      const factor = e.deltaY < 0 ? 1.15 : 0.85
      setZoomPan(prev => ({
        ...prev,
        zoom: Math.max(0.5, Math.min(20, prev.zoom * factor)),
      }))
    }
  }

  const handleResetZoom = () => {
    setZoomPan({ zoom: 1, panX: 0, panY: 0 })
    if (onClearBrush) onClearBrush()
  }

  return (
    <div className="canvas-chart-wrapper" ref={containerRef}>
      <div className="chart-canvas-container">
        <canvas
          ref={canvasRef}
          className="chart-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            isMouseDownRef.current = false
            setTooltip(null)
          }}
          onWheel={handleWheel}
        />

        {chartType === 'scatter' && (
          <div className="canvas-scatter-controls">
            <button
              type="button"
              className={`tool-btn ${dragMode === 'brush' ? 'active' : ''}`}
              onClick={() => setDragMode('brush')}
              title="Brush range selection"
            >
              Brush
            </button>
            <button
              type="button"
              className={`tool-btn ${dragMode === 'pan' ? 'active' : ''}`}
              onClick={() => setDragMode('pan')}
              title="Pan chart"
            >
              Pan
            </button>
            <button
              type="button"
              className="tool-btn"
              onClick={handleResetZoom}
              title="Reset Zoom and Pan"
            >
              Reset
            </button>
          </div>
        )}

        {tooltip && (
          <div
            className="chart-tooltip"
            style={{
              position: 'fixed',
              top: `${tooltip.y - 45}px`,
              left: `${tooltip.x + 12}px`,
            }}
          >
            <div className="tooltip-title">{tooltip.title}</div>
            <div className="tooltip-val">{tooltip.val}</div>
            {tooltip.count && <div className="tooltip-sub">{tooltip.count} records</div>}
          </div>
        )}
      </div>
    </div>
  )
}

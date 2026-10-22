import { describe, it, expect, beforeEach } from 'vitest'
import { ColumnarTable } from '../core/columnarStorage.js'
import {
  getHistogramData,
  getBarData,
  getLineData,
  getScatterData,
} from '../core/chartEngine.js'

describe('chartEngine', () => {
  let table

  beforeEach(() => {
    const schema = [
      { name: 'region', type: 'string', isDictionary: true },
      { name: 'date', type: 'date', isDictionary: false },
      { name: 'sales', type: 'number', isDictionary: false },
      { name: 'profit', type: 'number', isDictionary: false },
    ]

    table = new ColumnarTable(schema, 6)
    table.appendRow(['East', '2023-01-01', 100, 20])
    table.appendRow(['East', '2023-01-02', 200, 40])
    table.appendRow(['West', '2023-01-03', 300, 60])
    table.appendRow(['West', '2023-01-04', 400, 80])
    table.appendRow(['South', '2023-01-05', 500, 100])
    table.trimToSize()
  })

  it('computes histogram bins and frequency counts', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = getHistogramData(table, indices, 'sales', 5)
    expect(res.bins).toHaveLength(5)
    expect(res.min).toBe(100)
    expect(res.max).toBe(500)
    expect(res.total).toBe(5)
    const totalCount = res.bins.reduce((a, b) => a + b.count, 0)
    expect(totalCount).toBe(5)
  })

  it('computes bar chart items and maximum values', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = getBarData(table, indices, 'region', 'sales', 'sum', 10)
    expect(res.items.length).toBe(3)
    const west = res.items.find(i => i.category === 'West')
    expect(west.value).toBe(700)
    expect(west.count).toBe(2)
    expect(res.maxVal).toBe(700)
  })

  it('computes line chart points and sorted chronological bounds', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = getLineData(table, indices, 'date', 'profit', 'avg', 10)
    expect(res.points.length).toBe(5)
    expect(res.minY).toBe(20)
    expect(res.maxY).toBe(100)
  })

  it('computes scatter data with LOD density binning', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = getScatterData(table, indices, 'sales', 'profit', 100)
    expect(res.total).toBe(5)
    expect(res.points.length).toBeGreaterThan(0)
    expect(res.minX).toBe(100)
    expect(res.maxX).toBe(500)
    expect(res.minY).toBe(20)
    expect(res.maxY).toBe(100)
    expect(res.points[0]).toHaveProperty('density')
  })
})

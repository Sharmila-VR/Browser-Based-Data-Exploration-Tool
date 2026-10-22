import { describe, it, expect, beforeEach } from 'vitest'
import { ColumnarTable } from '../core/columnarStorage.js'
import { aggregateData, computeMedian } from '../core/aggregationEngine.js'

describe('aggregationEngine', () => {
  let table

  beforeEach(() => {
    const schema = [
      { name: 'region', type: 'string', isDictionary: true },
      { name: 'category', type: 'string', isDictionary: true },
      { name: 'sales', type: 'number', isDictionary: false },
      { name: 'quantity', type: 'number', isDictionary: false },
    ]

    table = new ColumnarTable(schema, 6)
    table.appendRow(['East', 'Computers', 100, 2])
    table.appendRow(['East', 'Computers', 200, 4])
    table.appendRow(['East', 'Audio', 50, 1])
    table.appendRow(['West', 'Computers', 300, 5])
    table.appendRow(['West', 'Audio', 150, 3])
    table.trimToSize()
  })

  it('calculates median for odd and even arrays', () => {
    expect(computeMedian([10, 20, 30])).toBe(20)
    expect(computeMedian([10, 20, 30, 40])).toBe(25)
    expect(computeMedian([5])).toBe(5)
    expect(computeMedian([])).toBe(0)
  })

  it('aggregates sum, avg, min, max, count, distinct, and median by single dimension', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = aggregateData(
      table,
      indices,
      ['region'],
      [
        { column: 'sales', agg: 'sum' },
        { column: 'sales', agg: 'avg' },
        { column: 'sales', agg: 'min' },
        { column: 'sales', agg: 'max' },
        { column: 'sales', agg: 'count' },
        { column: 'category', agg: 'distinct' },
        { column: 'sales', agg: 'median' },
      ]
    )

    expect(res.rows).toHaveLength(2)

    const east = res.rows.find(r => r.region === 'East')
    expect(east.sales_sum).toBe(350)
    expect(east.sales_avg).toBe(116.67)
    expect(east.sales_min).toBe(50)
    expect(east.sales_max).toBe(200)
    expect(east.sales_count).toBe(3)
    expect(east.category_distinct).toBe(2)
    expect(east.sales_median).toBe(100)

    const west = res.rows.find(r => r.region === 'West')
    expect(west.sales_sum).toBe(450)
    expect(west.sales_avg).toBe(225)
    expect(west.sales_median).toBe(225)

    expect(res.grandTotals.sales_sum).toBe(800)
    expect(res.grandTotals.sales_avg).toBe(160)
  })

  it('aggregates multiple group-by dimensions', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = aggregateData(
      table,
      indices,
      ['region', 'category'],
      [{ column: 'sales', agg: 'sum' }]
    )

    expect(res.rows).toHaveLength(4)
    const eastComp = res.rows.find(r => r.region === 'East' && r.category === 'Computers')
    expect(eastComp.sales_sum).toBe(300)
    expect(eastComp._count).toBe(2)
  })

  it('aggregates with no group dimensions (overall totals)', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = aggregateData(
      table,
      indices,
      [],
      [{ column: 'sales', agg: 'sum' }]
    )

    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].sales_sum).toBe(800)
  })
})

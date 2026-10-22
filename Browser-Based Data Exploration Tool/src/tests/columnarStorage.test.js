import { describe, it, expect } from 'vitest'
import { ColumnarTable } from '../core/columnarStorage.js'

describe('columnarStorage', () => {
  const schema = [
    { name: 'id', type: 'number', isDictionary: false },
    { name: 'date', type: 'date', isDictionary: false },
    { name: 'region', type: 'string', isDictionary: true },
    { name: 'notes', type: 'string', isDictionary: false },
    { name: 'active', type: 'boolean', isDictionary: false },
    { name: 'revenue', type: 'number', isDictionary: false },
  ]

  it('allocates and appends rows correctly', () => {
    const table = new ColumnarTable(schema, 2)
    table.appendRow([1, '2023-01-01', 'North', 'Order note 1', true, 100.5])
    table.appendRow([2, '2023-01-02', 'South', 'Order note 2', false, 200.0])
    table.appendRow([3, '2023-01-03', 'North', 'Order note 3', 'yes', 300.75])

    expect(table.rowCount).toBe(3)
    expect(table.getValue(0, 0)).toBe(1)
    expect(table.getValue(2, 0)).toBe('North')
    expect(table.getValue(2, 1)).toBe('South')
    expect(table.getValue(2, 2)).toBe('North')
    expect(table.getValue(3, 0)).toBe('Order note 1')
    expect(table.getValue(4, 0)).toBe(true)
    expect(table.getValue(4, 1)).toBe(false)
    expect(table.getValue(4, 2)).toBe(true)
    expect(table.getValue(5, 2)).toBe(300.75)
  })

  it('handles null and invalid values', () => {
    const table = new ColumnarTable(schema, 5)
    table.appendRow([null, '', undefined, null, null, 'invalid_number'])
    expect(table.isNull(0, 0)).toBe(true)
    expect(table.getValue(0, 0)).toBe(null)
    expect(table.isNull(5, 0)).toBe(true)
    expect(table.getFormattedValue(0, 0)).toBe('')
  })

  it('formats dates and numbers correctly', () => {
    const table = new ColumnarTable(schema, 5)
    table.appendRow([10, '2023-05-15', 'East', 'n', true, 99.1234])
    expect(table.getFormattedValue(1, 0)).toBe('2023-05-15')
    expect(table.getFormattedValue(5, 0)).toBe('99.12')
    expect(table.getFormattedValue(0, 0)).toBe('10')
  })

  it('computes column statistics accurately', () => {
    const table = new ColumnarTable(schema, 5)
    table.appendRow([10, '2023-01-01', 'East', 'a', true, 100])
    table.appendRow([20, '2023-01-02', 'West', 'b', false, 200])
    table.appendRow([30, '2023-01-03', 'East', 'c', true, 300])

    const numStats = table.getColumnStats(5)
    expect(numStats.min).toBe(100)
    expect(numStats.max).toBe(300)
    expect(numStats.sum).toBe(600)
    expect(numStats.avg).toBe(200)
    expect(numStats.validCount).toBe(3)
    expect(numStats.nullCount).toBe(0)

    const dictStats = table.getColumnStats(2)
    expect(dictStats.distinctCount).toBe(2)
  })

  it('trims capacity and calculates memory estimate', () => {
    const table = new ColumnarTable(schema, 100)
    table.appendRow([1, '2023-01-01', 'East', 'note', true, 50])
    table.trimToSize()
    expect(table.capacity).toBe(1)
    const mem = table.getMemoryEstimate()
    expect(mem).toBeGreaterThan(0)
  })

  it('retrieves row as plain object', () => {
    const table = new ColumnarTable(schema, 5)
    table.appendRow([101, '2023-01-01', 'Central', 'hello', true, 42])
    const row = table.getRow(0)
    expect(row.id).toBe(101)
    expect(row.region).toBe('Central')
    expect(row.active).toBe(true)
    expect(row.revenue).toBe(42)
  })

  it('dynamically expands capacity when rows exceed initial capacity', () => {
    const table = new ColumnarTable(schema, 1)
    table.appendRow([1, '2023-01-01', 'East', 'note1', true, 10])
    table.appendRow([2, '2023-01-02', 'West', 'note2', false, 20])
    table.appendRow([3, '2023-01-03', 'North', 'note3', true, 30])
    expect(table.rowCount).toBe(3)
    expect(table.capacity).toBeGreaterThanOrEqual(3)
    expect(table.getValue(0, 2)).toBe(3)
    expect(table.getRaw(0, 2)).toBe(3)
  })
})

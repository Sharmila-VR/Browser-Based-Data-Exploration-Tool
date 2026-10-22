import { describe, it, expect, beforeEach } from 'vitest'
import { ColumnarTable } from '../core/columnarStorage.js'
import { sortIndices } from '../core/sortEngine.js'

describe('sortEngine', () => {
  let table

  beforeEach(() => {
    const schema = [
      { name: 'id', type: 'number', isDictionary: false },
      { name: 'region', type: 'string', isDictionary: true },
      { name: 'score', type: 'number', isDictionary: false },
      { name: 'active', type: 'boolean', isDictionary: false },
      { name: 'text', type: 'string', isDictionary: false },
    ]

    table = new ColumnarTable(schema, 6)
    table.appendRow([101, 'West', 50, false, 'zebra'])
    table.appendRow([102, 'East', 80, true, 'apple'])
    table.appendRow([103, 'North', 30, true, null])
    table.appendRow([104, 'East', 60, false, 'mango'])
    table.appendRow([105, 'South', null, true, 'banana'])
    table.trimToSize()
  })

  it('returns original indices if no sort config provided', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = sortIndices(indices, table, [])
    expect(Array.from(res)).toEqual([0, 1, 2, 3, 4])
  })

  it('returns original indices if single index provided', () => {
    const indices = new Uint32Array([1])
    const res = sortIndices(indices, table, [{ column: 'score', direction: 'asc' }])
    expect(Array.from(res)).toEqual([1])
  })

  it('sorts numeric column ascending with nulls', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = sortIndices(indices, table, [{ column: 'score', direction: 'asc' }])
    expect(table.isNull(2, res[4])).toBe(true)
    expect(table.getValue(2, res[0])).toBe(30)
  })

  it('sorts numeric column descending', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = sortIndices(indices, table, [{ column: 'score', direction: 'desc' }])
    expect(table.getValue(2, res[0])).toBe(80)
  })

  it('sorts non-dictionary string column ascending', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = sortIndices(indices, table, [{ column: 'text', direction: 'asc' }])
    expect(table.getValue(4, res[0])).toBe('apple')
    expect(table.getValue(4, res[1])).toBe('banana')
    expect(table.getValue(4, res[2])).toBe('mango')
    expect(table.getValue(4, res[3])).toBe('zebra')
    expect(table.getValue(4, res[4])).toBe(null)
  })

  it('sorts dictionary encoded string column ascending', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = sortIndices(indices, table, [{ column: 'region', direction: 'asc' }])
    const regions = Array.from(res).map(i => table.getValue(1, i))
    expect(regions).toEqual(['East', 'East', 'North', 'South', 'West'])
  })

  it('performs multi-column sort (region ASC, score DESC)', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = sortIndices(indices, table, [
      { column: 'region', direction: 'asc' },
      { column: 'score', direction: 'desc' },
    ])
    expect(res[0]).toBe(1)
    expect(res[1]).toBe(3)
  })

  it('sorts boolean column ascending and descending', () => {
    const indices = new Uint32Array([0, 1, 2, 3, 4])
    const res = sortIndices(indices, table, [{ column: 'active', direction: 'desc' }])
    expect(table.getValue(3, res[0])).toBe(true)
    expect(table.getValue(3, res[1])).toBe(true)
    expect(table.getValue(3, res[2])).toBe(true)
    expect(table.getValue(3, res[3])).toBe(false)
    expect(table.getValue(3, res[4])).toBe(false)
  })
})

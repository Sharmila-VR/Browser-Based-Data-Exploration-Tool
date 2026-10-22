import { describe, it, expect, beforeEach } from 'vitest'
import { ColumnarTable } from '../core/columnarStorage.js'
import { applyFilters } from '../core/filterEngine.js'

describe('filterEngine', () => {
  let table

  beforeEach(() => {
    const schema = [
      { name: 'id', type: 'number', isDictionary: false },
      { name: 'date', type: 'date', isDictionary: false },
      { name: 'region', type: 'string', isDictionary: true },
      { name: 'category', type: 'string', isDictionary: true },
      { name: 'active', type: 'boolean', isDictionary: false },
      { name: 'amount', type: 'number', isDictionary: false },
    ]

    table = new ColumnarTable(schema, 10)
    table.appendRow([1, '2023-01-10', 'East', 'Electronics', true, 150.0])
    table.appendRow([2, '2023-02-15', 'West', 'Furniture', false, 80.0])
    table.appendRow([3, '2023-03-20', 'East', 'Supplies', true, 320.0])
    table.appendRow([4, '2023-04-25', 'South', 'Electronics', false, 50.0])
    table.appendRow([5, '2023-05-30', 'North', 'Furniture', true, 500.0])
    table.trimToSize()
  })

  it('returns all indices when no filters are provided', () => {
    const indices = applyFilters(table, {})
    expect(indices.length).toBe(5)
    expect(Array.from(indices)).toEqual([0, 1, 2, 3, 4])
  })

  it('filters by numeric range', () => {
    const indices = applyFilters(table, {
      amount: { min: 100, max: 400 },
    })
    expect(Array.from(indices)).toEqual([0, 2])
  })

  it('filters by date range', () => {
    const indices = applyFilters(table, {
      date: { min: '2023-02-01', max: '2023-04-01' },
    })
    expect(Array.from(indices)).toEqual([1, 2])
  })

  it('filters by boolean state', () => {
    const indicesTrue = applyFilters(table, {
      active: { bool: 'true' },
    })
    expect(Array.from(indicesTrue)).toEqual([0, 2, 4])

    const indicesFalse = applyFilters(table, {
      active: { bool: 'false' },
    })
    expect(Array.from(indicesFalse)).toEqual([1, 3])
  })

  it('filters by string text contains, startsWith, equals', () => {
    const contains = applyFilters(table, {
      region: { text: 'ast', textMode: 'contains' },
    })
    expect(Array.from(contains)).toEqual([0, 2])

    const starts = applyFilters(table, {
      region: { text: 'So', textMode: 'startsWith' },
    })
    expect(Array.from(starts)).toEqual([3])

    const exact = applyFilters(table, {
      region: { text: 'North', textMode: 'equals' },
    })
    expect(Array.from(exact)).toEqual([4])
  })

  it('filters by regex pattern', () => {
    const regex = applyFilters(table, {
      region: { regex: '^(East|South)$' },
    })
    expect(Array.from(regex)).toEqual([0, 2, 3])
  })

  it('filters by categorical values set', () => {
    const set = applyFilters(table, {
      category: { values: ['Electronics', 'Supplies'] },
    })
    expect(Array.from(set)).toEqual([0, 2, 3])
  })

  it('combines multiple filters with AND logic', () => {
    const multi = applyFilters(table, {
      region: { values: ['East'] },
      amount: { min: 200 },
      active: { bool: 'true' },
    })
    expect(Array.from(multi)).toEqual([2])
  })
})

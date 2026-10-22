import { describe, it, expect } from 'vitest'
import { parseCSVLine, parseCSVChunk, detectColumnType, detectSchema } from '../core/csvParser.js'

describe('csvParser', () => {
  it('parses standard unquoted CSV line', () => {
    const line = '1,Alice,25.5,true'
    const res = parseCSVLine(line)
    expect(res).toEqual(['1', 'Alice', '25.5', 'true'])
  })

  it('parses quoted fields with commas and escaped quotes', () => {
    const line = '101,"Smith, John","He said ""Hello"" to me",99.9'
    const res = parseCSVLine(line)
    expect(res).toEqual(['101', 'Smith, John', 'He said "Hello" to me', '99.9'])
  })

  it('parses chunks with newlines and returns remainder', () => {
    const chunk1 = 'id,name,score\n1,Alice,90\n2,Bob'
    const { rows, remainder } = parseCSVChunk(chunk1)
    expect(rows).toEqual([
      ['id', 'name', 'score'],
      ['1', 'Alice', '90'],
    ])
    expect(remainder).toBe('2,Bob')

    const chunk2 = ',85\r\n3,"Charlie, C",95\n'
    const next = parseCSVChunk(chunk2, remainder)
    expect(next.rows).toEqual([
      ['2', 'Bob', '85'],
      ['3', 'Charlie, C', '95'],
    ])
    expect(next.remainder).toBe('')
  })

  it('detects numeric column type', () => {
    const values = ['10', '20.5', '300', '-4.2', '0']
    const res = detectColumnType(values)
    expect(res.type).toBe('number')
    expect(res.isDictionary).toBe(false)
  })

  it('detects date column type', () => {
    const values = ['2023-01-01', '2023-05-15', '2024-12-31', '2023-08-20T10:00:00Z']
    const res = detectColumnType(values)
    expect(res.type).toBe('date')
  })

  it('detects boolean column type', () => {
    const values = ['true', 'false', 'TRUE', '1', '0', 'yes', 'no']
    const res = detectColumnType(values)
    expect(res.type).toBe('boolean')
  })

  it('detects low-cardinality string as dictionary', () => {
    const values = ['East', 'West', 'East', 'North', 'South', 'West', 'East']
    const res = detectColumnType(values)
    expect(res.type).toBe('string')
    expect(res.isDictionary).toBe(true)
    expect(res.cardinality).toBe(4)
  })

  it('detects high-cardinality string without dictionary', () => {
    const values = Array.from({ length: 100 }, (_, i) => `UniqueString_${i}_${Math.random()}`)
    const res = detectColumnType(values)
    expect(res.type).toBe('string')
  })

  it('handles empty column detection', () => {
    const res = detectColumnType(['', null, undefined])
    expect(res.type).toBe('string')
  })

  it('detects full table schema', () => {
    const headers = ['id', 'order_date', 'region', 'is_priority', 'sales']
    const rows = [
      ['1001', '2023-01-15', 'East', 'true', '450.50'],
      ['1002', '2023-02-20', 'West', 'false', '120.00'],
      ['1003', '2023-03-10', 'East', 'true', '99.95'],
    ]
    const schema = detectSchema(headers, rows)
    expect(schema).toHaveLength(5)
    expect(schema[0].type).toBe('number')
    expect(schema[1].type).toBe('date')
    expect(schema[2].type).toBe('string')
    expect(schema[2].isDictionary).toBe(true)
    expect(schema[3].type).toBe('boolean')
    expect(schema[4].type).toBe('number')
  })
})

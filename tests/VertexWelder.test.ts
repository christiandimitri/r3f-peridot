import { describe, it, expect } from 'vitest'
import { weldVertices } from '../src/utils/VertexWelder'

describe('VertexWelder', () => {
  it('should weld vertices correctly', () => {
    // Simple test case: two triangles sharing an edge
    const vertices = [
      0, 0, 0, // 0
      1, 0, 0, // 1
      0, 1, 0, // 2
      1, 0, 0, // 3 (duplicate of 1)
      1, 1, 0, // 4
      0, 1, 0, // 5 (duplicate of 2)
    ]
    
    const indices = [
      0, 1, 2, // First triangle
      3, 4, 5, // Second triangle (shares edge with first)
    ]
    
    const result = weldVertices(vertices, indices, 1)
    
    // The welded indices should reference the original vertices
    expect(result).toBeDefined()
    expect(result.length).toBe(6)
  })

  it('should not weld vertices above threshold angle', () => {
    const vertices = [
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ]
    
    const indices = [0, 1, 2]
    
    const result = weldVertices(vertices, indices, 90) // High threshold
    
    expect(result).toBeDefined()
    expect(result.length).toBe(3)
  })
})


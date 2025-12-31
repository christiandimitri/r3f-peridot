import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import FindSurfaces from '../src/utils/FindSurfaces'

describe('FindSurfaces', () => {
  it('should compute surface IDs for a simple mesh', () => {
    const geometry = new THREE.BoxGeometry(1, 1, 1)
    const mesh = new THREE.Mesh(geometry)
    
    const findSurfaces = new FindSurfaces()
    const surfaceIds = findSurfaces.getSurfaceIdAttribute(mesh)
    
    expect(surfaceIds).toBeDefined()
    expect(surfaceIds.length).toBeGreaterThan(0)
    expect(surfaceIds instanceof Float32Array).toBe(true)
  })

  it('should increment surface ID counter', () => {
    const geometry1 = new THREE.BoxGeometry(1, 1, 1)
    const mesh1 = new THREE.Mesh(geometry1)
    
    const geometry2 = new THREE.BoxGeometry(1, 1, 1)
    const mesh2 = new THREE.Mesh(geometry2)
    
    const findSurfaces = new FindSurfaces()
    
    const initialId = findSurfaces.surfaceId
    findSurfaces.getSurfaceIdAttribute(mesh1)
    const afterFirst = findSurfaces.surfaceId
    findSurfaces.getSurfaceIdAttribute(mesh2)
    const afterSecond = findSurfaces.surfaceId
    
    expect(afterFirst).toBeGreaterThan(initialId)
    expect(afterSecond).toBeGreaterThan(afterFirst)
  })
})


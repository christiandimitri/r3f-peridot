import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import FindSurfaces from './FindSurfaces'

/**
 * Hook that computes and applies surface IDs to all meshes in the scene
 * This is required for outline V2 (surface ID based outlines) to work
 */
export function useSurfaceIds(enabled: boolean = true) {
  const { scene } = useThree()

  useEffect(() => {
    if (!enabled) return

    const findSurfaces = new FindSurfaces()
    let maxSurfaceId = 0

    // Traverse scene and apply surface IDs to all meshes
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.geometry) {
        const geometry = object.geometry

        // Compute surface IDs
        const surfaceIdAttribute = findSurfaces.getSurfaceIdAttribute(object)

        // Set as color attribute (used by the shader)
        geometry.setAttribute('color', new THREE.BufferAttribute(surfaceIdAttribute, 4))

        // Track max surface ID
        maxSurfaceId = Math.max(maxSurfaceId, findSurfaces.surfaceId)
      }
    })

    // Return the max surface ID for normalization in the shader
    return () => {
      // Cleanup: remove color attributes when disabled
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh && object.geometry) {
          object.geometry.deleteAttribute('color')
        }
      })
    }
  }, [scene, enabled])
}

export default useSurfaceIds


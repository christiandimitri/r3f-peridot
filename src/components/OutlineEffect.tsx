import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { CustomOutlinePass } from '../utils/CustomOutlinePass'
import FindSurfaces from '../utils/FindSurfaces'

export interface OutlineEffectProps {
  /** Enable or disable the outline effect */
  enabled?: boolean
  /** Color of the outline (THREE.Color or hex string) */
  outlineColor?: THREE.Color | string
  /** Depth bias for edge detection (default: 0.9) */
  depthBias?: number
  /** Depth multiplier for edge detection (default: 20.0) */
  depthMultiplier?: number
  /** Normal bias for edge detection (default: 1.0) */
  normalBias?: number
  /** Normal multiplier for edge detection (default: 1.0) */
  normalMultiplier?: number
  /**
   * Debug visualization mode (default: 0)
   * - 0: Outlines V2 (surface ID based)
   * - 1: Outlines V1 (depth/normal based)
   * - 2: Original scene
   * - 3: Depth buffer
   * - 4: Normal buffer
   * - 5: SurfaceID debug buffer
   * - 6: Outlines only V2
   */
  debugVisualize?: number
  /** Array of objects to apply outlines to (currently not used, reserved for future) */
  selectedObjects?: THREE.Object3D[]
}

export interface OutlineEffectRef {
  /** Update the maximum surface ID for proper normalization */
  updateMaxSurfaceId: (maxSurfaceId: number) => void
}

/**
 * OutlineEffect - A React Three Fiber component that adds post-processing outline effects
 * to your 3D scene using depth, normals, and surface ID detection.
 *
 * Based on the webgl-outlines technique by Omar Shehata
 * https://github.com/OmarShehata/webgl-outlines
 *
 * @example
 * ```tsx
 * import { Canvas } from '@react-three/fiber'
 * import { OutlineEffect } from 'r3f-gltf-outlines'
 *
 * function Scene() {
 *   return (
 *     <>
 *       <OutlineEffect
 *         outlineColor="#ffffff"
 *         depthBias={0.9}
 *         depthMultiplier={20.0}
 *       />
 *       <mesh>
 *         <boxGeometry />
 *         <meshStandardMaterial />
 *       </mesh>
 *     </>
 *   )
 * }
 * ```
 */
export const OutlineEffect = forwardRef<OutlineEffectRef, OutlineEffectProps>(
  (
    {
      enabled = true,
      outlineColor = '#ffffff',
      depthBias = 0.9,
      depthMultiplier = 20.0,
      normalBias = 1.0,
      normalMultiplier = 1.0,
      debugVisualize = 0,
    },
    ref
  ) => {
    const { gl, scene, camera, size, invalidate } = useThree()
    const composerRef = useRef<EffectComposer | null>(null)
    const outlinePassRef = useRef<CustomOutlinePass | null>(null)
    const fxaaPassRef = useRef<ShaderPass | null>(null)
    const surfaceIdsComputedRef = useRef<boolean>(false)

    useEffect(() => {
      if (!enabled) {
        if (composerRef.current) {
          composerRef.current.dispose()
          composerRef.current = null
        }
        return
      }

      const width = Math.max(1, size.width * gl.getPixelRatio())
      const height = Math.max(1, size.height * gl.getPixelRatio())

      // Create render target with depthTexture
      const depthTexture = new THREE.DepthTexture(width, height)
      const renderTarget = new THREE.WebGLRenderTarget(width, height, {
        depthTexture: depthTexture,
        depthBuffer: true,
      })

      // Create EffectComposer
      const composer = new EffectComposer(gl, renderTarget)
      composerRef.current = composer

      // Initial render pass
      const renderPass = new RenderPass(scene, camera)
      composer.addPass(renderPass)

      // Outline pass
      const customOutline = new CustomOutlinePass(new THREE.Vector2(width, height), scene, camera)
      customOutline.renderToScreen = true // Make it render to screen
      outlinePassRef.current = customOutline
      composer.addPass(customOutline)

      // Antialias pass
      const effectFXAA = new ShaderPass(FXAAShader)
      effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height)
      effectFXAA.renderToScreen = true // Make FXAA render to screen (last pass)
      customOutline.renderToScreen = false // Outline pass no longer renders to screen
      fxaaPassRef.current = effectFXAA
      composer.addPass(effectFXAA)

      return () => {
        composer.dispose()
        renderTarget.dispose()
        depthTexture.dispose()
      }
    }, [enabled, scene, camera, gl, size.width, size.height, invalidate])

    // Compute surface IDs when using debug mode 0, 5, or 6 (surface ID modes)
    useEffect(() => {
      if (!enabled) return

      const isUsingSurfaceIds = debugVisualize === 0 || debugVisualize === 5 || debugVisualize === 6

      if (isUsingSurfaceIds && !surfaceIdsComputedRef.current) {
        const findSurfaces = new FindSurfaces()
        let maxSurfaceId = 0

        // Traverse scene and apply surface IDs to all meshes
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh && object.geometry) {
            try {
              const geometry = object.geometry

              // Compute surface IDs
              const surfaceIdAttribute = findSurfaces.getSurfaceIdAttribute(object)

              // Set as color attribute (used by the shader)
              geometry.setAttribute('color', new THREE.BufferAttribute(surfaceIdAttribute, 4))

              // Track max surface ID
              maxSurfaceId = Math.max(maxSurfaceId, findSurfaces.surfaceId)
            } catch (error) {
              console.warn('Failed to compute surface IDs for mesh:', error)
            }
          }
        })

        // Update the shader with the max surface ID (+1 for normalization)
        if (outlinePassRef.current && maxSurfaceId > 0) {
          outlinePassRef.current.updateMaxSurfaceId(maxSurfaceId + 1)
        }

        surfaceIdsComputedRef.current = true
      } else if (!isUsingSurfaceIds && surfaceIdsComputedRef.current) {
        // Cleanup: remove color attributes when not using surface IDs
        scene.traverse((object) => {
          if (object instanceof THREE.Mesh && object.geometry) {
            object.geometry.deleteAttribute('color')
          }
        })
        surfaceIdsComputedRef.current = false
      }
    }, [enabled, scene, debugVisualize])

    // Update uniforms every frame and render composer
    useFrame(() => {
      if (!enabled || !outlinePassRef.current || !composerRef.current) {
        return // Skip rendering if composer is not ready
      }

      const outlinePass = outlinePassRef.current
      const material = outlinePass.fsQuad.material as THREE.ShaderMaterial
      const uniforms = material.uniforms

      // Update outline color
      if (typeof outlineColor === 'string') {
        uniforms.outlineColor.value.set(outlineColor)
      } else {
        uniforms.outlineColor.value.copy(outlineColor)
      }

      // Update multiplier parameters
      uniforms.multiplierParameters.value.set(
        depthBias,
        depthMultiplier,
        normalBias,
        normalMultiplier
      )

      // Update debug visualize
      uniforms.debugVisualize.value = debugVisualize

      // Update camera near/far
      const cam = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera
      if ('near' in cam) {
        uniforms.cameraNear.value = cam.near
      }
      if ('far' in cam) {
        uniforms.cameraFar.value = cam.far
      }

      // Render the composer
      composerRef.current.render()
    }, 1) // Positive priority = runs AFTER R3F's default render

    // Update size when canvas resizes
    useEffect(() => {
      if (!composerRef.current || !outlinePassRef.current || !fxaaPassRef.current) return

      const width = Math.max(1, size.width * gl.getPixelRatio())
      const height = Math.max(1, size.height * gl.getPixelRatio())

      composerRef.current.setSize(width, height)
      outlinePassRef.current.setSize(width, height)
      fxaaPassRef.current.uniforms['resolution'].value.set(1 / width, 1 / height)
    }, [size, gl])

    useImperativeHandle(ref, () => ({
      updateMaxSurfaceId: (maxSurfaceId: number) => {
        if (outlinePassRef.current) {
          outlinePassRef.current.updateMaxSurfaceId(maxSurfaceId)
        }
      },
    }))

    return null
  }
)

OutlineEffect.displayName = 'OutlineEffect'


import * as THREE from 'three'
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js'
import { getSurfaceIdMaterial, getDebugSurfaceIdMaterial } from './FindSurfaces'

/**
 * CustomOutlinePass - A post-processing pass that renders outlines based on depth,
 * normals, and surface IDs.
 *
 * Based on the webgl-outlines technique by Omar Shehata
 * https://github.com/OmarShehata/webgl-outlines
 */
export class CustomOutlinePass extends Pass {
  renderScene: THREE.Scene
  renderCamera: THREE.Camera
  resolution: THREE.Vector2
  fsQuad: FullScreenQuad
  surfaceBuffer: THREE.WebGLRenderTarget
  normalOverrideMaterial: THREE.MeshNormalMaterial
  surfaceIdOverrideMaterial: THREE.ShaderMaterial
  surfaceIdDebugOverrideMaterial: THREE.ShaderMaterial

  constructor(resolution: THREE.Vector2, scene: THREE.Scene, camera: THREE.Camera) {
    super()

    this.renderScene = scene
    this.renderCamera = camera
    this.resolution = new THREE.Vector2(resolution.x, resolution.y)

    this.fsQuad = new FullScreenQuad(undefined)
    this.fsQuad.material = this.createOutlinePostProcessMaterial()

    // Create a buffer to store the normals of the scene onto
    // or store the "surface IDs"
    const surfaceBuffer = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y)
    surfaceBuffer.texture.format = THREE.RGBAFormat
    surfaceBuffer.texture.type = THREE.HalfFloatType
    surfaceBuffer.texture.minFilter = THREE.NearestFilter
    surfaceBuffer.texture.magFilter = THREE.NearestFilter
    surfaceBuffer.texture.generateMipmaps = false
    surfaceBuffer.stencilBuffer = false
    this.surfaceBuffer = surfaceBuffer

    this.normalOverrideMaterial = new THREE.MeshNormalMaterial()
    this.surfaceIdOverrideMaterial = getSurfaceIdMaterial()
    this.surfaceIdDebugOverrideMaterial = getDebugSurfaceIdMaterial()
  }

  dispose() {
    this.surfaceBuffer.dispose()
    this.fsQuad.dispose()
  }

  updateMaxSurfaceId(maxSurfaceId: number) {
    this.surfaceIdOverrideMaterial.uniforms.maxSurfaceId.value = maxSurfaceId
  }

  setSize(width: number, height: number) {
    this.surfaceBuffer.setSize(width, height)
    this.resolution.set(width, height)

    const screenSize = new THREE.Vector4(
      this.resolution.x,
      this.resolution.y,
      1 / this.resolution.x,
      1 / this.resolution.y
    )
    const material = this.fsQuad.material as THREE.ShaderMaterial
    material.uniforms.screenSize.value.set(screenSize.x, screenSize.y, screenSize.z, screenSize.w)
  }

  getDebugVisualizeValue() {
    return (this.fsQuad.material as THREE.ShaderMaterial).uniforms.debugVisualize.value
  }

  isUsingSurfaceIds() {
    const debugVisualize = this.getDebugVisualizeValue()

    return (
      debugVisualize == 0 || // Main outlines v2 mode
      debugVisualize == 5 || // Render just surfaceID debug buffer
      debugVisualize == 6
    ) // Render just outlines with surfaceId
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ) {
    const debugVisualize = this.getDebugVisualizeValue()
    const isUsingSurfaceIds = this.isUsingSurfaceIds()

    // Turn off writing to the depth buffer
    // because we need to read from it in the subsequent passes.
    const depthBufferValue = writeBuffer.depthBuffer
    writeBuffer.depthBuffer = false

    // 1. Re-render the scene to capture all normals (or surface IDs) in a texture.
    renderer.setRenderTarget(this.surfaceBuffer)
    const overrideMaterialValue = this.renderScene.overrideMaterial

    if (isUsingSurfaceIds) {
      // Render the "surface ID buffer"
      if (debugVisualize == 5) {
        this.renderScene.overrideMaterial = this.surfaceIdDebugOverrideMaterial
      } else {
        this.renderScene.overrideMaterial = this.surfaceIdOverrideMaterial
      }
    } else {
      // Render normal buffer
      this.renderScene.overrideMaterial = this.normalOverrideMaterial
    }

    renderer.render(this.renderScene, this.renderCamera)
    this.renderScene.overrideMaterial = overrideMaterialValue

    const material = this.fsQuad.material as THREE.ShaderMaterial
    material.uniforms['depthBuffer'].value = readBuffer.depthTexture
    material.uniforms['surfaceBuffer'].value = this.surfaceBuffer.texture
    material.uniforms['sceneColorBuffer'].value = readBuffer.texture

    // 2. Draw the outlines using the depth texture and normal texture
    // and combine it with the scene color
    if (this.renderToScreen) {
      // If this is the last effect, then renderToScreen is true.
      // So we should render to the screen by setting target null
      // Otherwise, just render into the writeBuffer that the next effect will use as its read buffer.
      renderer.setRenderTarget(null)
      this.fsQuad.render(renderer)
    } else {
      renderer.setRenderTarget(writeBuffer)
      this.fsQuad.render(renderer)
    }

    // Reset the depthBuffer value so we continue writing to it in the next render.
    writeBuffer.depthBuffer = depthBufferValue
  }

  get vertexShader() {
    return `
			varying vec2 vUv;
			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
			}
			`
  }

  get fragmentShader() {
    return `
			#include <packing>
			// The above include imports "perspectiveDepthToViewZ"
			// and other GLSL functions from ThreeJS we need for reading depth.
			uniform sampler2D sceneColorBuffer;
			uniform sampler2D depthBuffer;
			uniform sampler2D surfaceBuffer;
			uniform float cameraNear;
			uniform float cameraFar;
			uniform vec4 screenSize;
			uniform vec3 outlineColor;
			uniform vec4 multiplierParameters;
			uniform int debugVisualize;

			varying vec2 vUv;

			// Helper functions for reading from depth buffer.
			float readDepth (sampler2D depthSampler, vec2 coord) {
				float fragCoordZ = texture2D(depthSampler, coord).x;
				float viewZ = perspectiveDepthToViewZ( fragCoordZ, cameraNear, cameraFar );
				return viewZToOrthographicDepth( viewZ, cameraNear, cameraFar );
			}
			float getLinearDepth(vec3 pos) {
				return -(viewMatrix * vec4(pos, 1.0)).z;
			}

			float getLinearScreenDepth(sampler2D map) {
					vec2 uv = gl_FragCoord.xy * screenSize.zw;
					return readDepth(map,uv);
			}
			// Helper functions for reading normals and depth of neighboring pixels.
			float getPixelDepth(int x, int y) {
				// screenSize.zw is pixel size 
				// vUv is current position
				return readDepth(depthBuffer, vUv + screenSize.zw * vec2(x, y));
			}
			// "surface value" is either the normal or the "surfaceID"
			vec3 getSurfaceValue(int x, int y) {
				vec3 val = texture2D(surfaceBuffer, vUv + screenSize.zw * vec2(x, y)).rgb;
				return val;
			}

			float saturateValue(float num) {
				return clamp(num, 0.0, 1.0);
			}

			float getSufaceIdDiff(vec3 surfaceValue) {
				float surfaceIdDiff = 0.0;
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 0));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(0, -1));

				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(1, -1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, 1));
				surfaceIdDiff += distance(surfaceValue, getSurfaceValue(-1, -1));
				return surfaceIdDiff;
			}

			void main() {
				vec4 sceneColor = texture2D(sceneColorBuffer, vUv);
				float depth = getPixelDepth(0, 0);
				// "surfaceValue" is either the normal or the surfaceId
				vec3 surfaceValue = getSurfaceValue(0, 0);

				// Get the difference between depth of neighboring pixels and current.
				float depthDiff = 0.0;
				depthDiff += abs(depth - getPixelDepth(1, 0));
				depthDiff += abs(depth - getPixelDepth(-1, 0));
				depthDiff += abs(depth - getPixelDepth(0, 1));
				depthDiff += abs(depth - getPixelDepth(0, -1));

				// Get the difference between surface values of neighboring pixels
				// and current
				float surfaceValueDiff = getSufaceIdDiff(surfaceValue);
				
				// Apply multiplier & bias to each 
				float depthBias = multiplierParameters.x;
				float depthMultiplier = multiplierParameters.y;
				float normalBias = multiplierParameters.z;
				float normalMultiplier = multiplierParameters.w;

				depthDiff = depthDiff * depthMultiplier;
				depthDiff = saturateValue(depthDiff);
				depthDiff = pow(depthDiff, depthBias);

				if (debugVisualize != 0 && debugVisualize != 6) {
					// Apply these params when using
					// normals instead of surfaceIds
					surfaceValueDiff = surfaceValueDiff * normalMultiplier;
					surfaceValueDiff = saturateValue(surfaceValueDiff);
					surfaceValueDiff = pow(surfaceValueDiff, normalBias);
				} else {
					if (surfaceValueDiff != 0.0) surfaceValueDiff = 1.0;
				}

				float outline = saturateValue(surfaceValueDiff + depthDiff);
			
				// Combine outline with scene color.
				vec4 outlineColor = vec4(outlineColor, 1.0);
				gl_FragColor = vec4(mix(sceneColor, outlineColor, outline));

				//// For debug visualization of the different inputs to this shader.
				if (debugVisualize == 2) {
					gl_FragColor = sceneColor;
				}
				if (debugVisualize == 3) {
					gl_FragColor = vec4(vec3(depth), 1.0);
				}
				if (debugVisualize == 4 || debugVisualize == 5) {
					// 4 visualizes the normal buffer
					// 5 visualizes the surfaceID buffer 
					// Either way they are the same buffer, we change 
					// what we render into it
					gl_FragColor = vec4(surfaceValue, 1.0);
				}
				if (debugVisualize == 6 || debugVisualize == 7) {
					// Outlines only
					gl_FragColor = vec4(vec3(outline * outlineColor), 1.0);
				}				
			}
			`
  }

  createOutlinePostProcessMaterial() {
    const camera = this.renderCamera as THREE.PerspectiveCamera | THREE.OrthographicCamera
    return new THREE.ShaderMaterial({
      uniforms: {
        debugVisualize: { value: 0 },
        sceneColorBuffer: { value: null },
        depthBuffer: { value: null },
        surfaceBuffer: { value: null },
        outlineColor: { value: new THREE.Color(0xffffff) },
        //4 scalar values packed in one uniform: depth multiplier, depth bias, and same for normals.
        multiplierParameters: {
          value: new THREE.Vector4(0.9, 20, 1, 1),
        },
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
        screenSize: {
          value: new THREE.Vector4(
            this.resolution.x,
            this.resolution.y,
            1 / this.resolution.x,
            1 / this.resolution.y
          ),
        },
      },
      vertexShader: this.vertexShader,
      fragmentShader: this.fragmentShader,
    })
  }
}


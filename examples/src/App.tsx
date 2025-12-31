import { useState, useRef, useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, Environment } from '@react-three/drei'
import { OutlineEffect } from 'r3f-peridot'
import type { OutlineEffectRef } from 'r3f-peridot'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import * as FRAGS from '@thatopen/fragments'

// GLTF Model component
function GLTFModel({ url }: { url: string | null }) {
  const { camera, controls } = useThree()
  const [model, setModel] = useState<THREE.Group | null>(null)

  useEffect(() => {
    if (!url) return

    const loadGLTF = async () => {
      try {
        const loader = new GLTFLoader()
        const gltf = await loader.loadAsync(url)
        const scene = gltf.scene
        
        // Make all materials double-sided
        scene.traverse((child: THREE.Object3D) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.side = THREE.DoubleSide)
              } else {
                mesh.material.side = THREE.DoubleSide
              }
            }
          }
        })

        setModel(scene)

        // Fit camera to model
        const box = new THREE.Box3().setFromObject(scene)
        if (controls && 'fitToSphere' in controls) {
          const sphere = new THREE.Sphere()
          box.getBoundingSphere(sphere)
          ;(controls as any).fitToSphere(sphere, true)
        }
      } catch (error) {
        console.error('Error loading GLTF:', error)
      }
    }

    loadGLTF()
  }, [url, camera, controls])

  if (!model) return null
  return <primitive object={model} />
}

// Fragment Model component - loads pre-converted .frag files
function FragmentModel({ file }: { file: File | null }) {
  const { camera, controls } = useThree()
  const scene = useThree((state) => state.scene)
  const [model, setModel] = useState<FRAGS.FragmentsModel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null)

  // Update fragments when camera controls change
  useEffect(() => {
    if (!fragmentsRef.current || !controls) return

    const handleControlChange = () => {
      fragmentsRef.current?.update()
    }

    const handleControlRest = () => {
      fragmentsRef.current?.update(true)
    }

    const orbitControls = controls as any
    orbitControls.addEventListener('change', handleControlChange)
    orbitControls.addEventListener('rest', handleControlRest)

    return () => {
      orbitControls.removeEventListener('change', handleControlChange)
      orbitControls.removeEventListener('rest', handleControlRest)
    }
  }, [controls, fragmentsRef.current])

  useEffect(() => {
    if (!file) return

    const loadFragment = async () => {
      setIsLoading(true)
      try {
        console.log(`Loading Fragment file: ${file.name}`)
        
        // Initialize fragments if not already done
        if (!fragmentsRef.current) {
          fragmentsRef.current = new FRAGS.FragmentsModels('/worker.mjs')
        }

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer()

        // Load fragment file (already converted, no need to process)
        const fragmentsModel = await fragmentsRef.current.load(arrayBuffer, {
          modelId: performance.now().toString(),
          camera: camera as THREE.PerspectiveCamera | THREE.OrthographicCamera,
          raw: false, // Fragments are compressed by default
        })

        // Add to scene
        scene.add(fragmentsModel.object)

        // Update fragments to make them visible
        await fragmentsRef.current.update(true)

        // Make all materials double-sided
        fragmentsModel.object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.side = THREE.DoubleSide)
              } else {
                mesh.material.side = THREE.DoubleSide
              }
            }
          }
        })

        // Fit camera to model
        const box = new THREE.Box3().setFromObject(fragmentsModel.object)
        if (controls && 'fitToSphere' in controls) {
          const sphere = new THREE.Sphere()
          box.getBoundingSphere(sphere)
          ;(controls as any).fitToSphere(sphere, true)
        }

        console.log('Fragment model loaded successfully:', fragmentsModel)
        setModel(fragmentsModel)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load Fragment:', err)
        setIsLoading(false)
      }
    }

    loadFragment()

    return () => {
      if (model) {
        scene.remove(model.object)
        model.dispose()
      }
    }
  }, [file, camera, scene, controls])

  if (isLoading) {
    return (
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="purple" wireframe />
      </mesh>
    )
  }

  return null
}

// IFC Model component using @thatopen/fragments
function IFCModel({ file }: { file: File | null }) {
  const { camera, controls } = useThree()
  const scene = useThree((state) => state.scene)
  const [model, setModel] = useState<FRAGS.FragmentsModel | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const fragmentsRef = useRef<FRAGS.FragmentsModels | null>(null)

  // Update fragments when camera controls change
  useEffect(() => {
    if (!fragmentsRef.current || !controls) return

    const handleControlChange = () => {
      fragmentsRef.current?.update()
    }

    const handleControlRest = () => {
      fragmentsRef.current?.update(true)
    }

    const orbitControls = controls as any
    orbitControls.addEventListener('change', handleControlChange)
    orbitControls.addEventListener('rest', handleControlRest)

    return () => {
      orbitControls.removeEventListener('change', handleControlChange)
      orbitControls.removeEventListener('rest', handleControlRest)
    }
  }, [controls, fragmentsRef.current])

  useEffect(() => {
    if (!file) return

    const loadIFC = async () => {
      setIsLoading(true)
      try {
        console.log(`Loading IFC file: ${file.name}`)
        
        // Initialize fragments if not already done
        if (!fragmentsRef.current) {
          fragmentsRef.current = new FRAGS.FragmentsModels('/worker.mjs')
        }

        // Read file as array buffer
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)

        // Convert IFC to fragments (exactly like the example)
        const serializer = new FRAGS.IfcImporter()
        serializer.wasm.path = '/'
        serializer.wasm.absolute = false
        const fragmentsBytes = await serializer.process({ 
          bytes, 
          raw: true 
        })

        // Load fragments (exactly like the example)
        const fragmentsModel = await fragmentsRef.current.load(fragmentsBytes, {
          modelId: performance.now().toString(),
          camera: camera as THREE.PerspectiveCamera | THREE.OrthographicCamera,
          raw: true,
        })

        // Add to scene (exactly like the example)
        scene.add(fragmentsModel.object)

        // Update fragments to make them visible (critical!)
        await fragmentsRef.current.update(true)

        // Make all materials double-sided
        fragmentsModel.object.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh
            if (mesh.material) {
              if (Array.isArray(mesh.material)) {
                mesh.material.forEach(mat => mat.side = THREE.DoubleSide)
              } else {
                mesh.material.side = THREE.DoubleSide
              }
            }
          }
        })

        // Fit camera to model
        const box = new THREE.Box3().setFromObject(fragmentsModel.object)
        if (controls && 'fitToSphere' in controls) {
          const sphere = new THREE.Sphere()
          box.getBoundingSphere(sphere)
          ;(controls as any).fitToSphere(sphere, true)
        }

        console.log('IFC model loaded successfully:', fragmentsModel)
        setModel(fragmentsModel)
        setIsLoading(false)
      } catch (err) {
        console.error('Failed to load IFC:', err)
        setIsLoading(false)
      }
    }

    loadIFC()

    return () => {
      if (model) {
        scene.remove(model.object)
        model.dispose()
      }
    }
  }, [file, camera, scene, controls])

  if (isLoading) {
    return (
      <mesh>
        <boxGeometry args={[2, 2, 2]} />
        <meshStandardMaterial color="orange" wireframe />
      </mesh>
    )
  }

  // Don't render anything - the model is already added to the scene
  // Returning null is fine because we manually added it to scene.add()
  return null
}

// Example geometry scene
function ExampleGeometry() {
  return (
    <>
      <mesh position={[-2, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.7, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>

      <mesh position={[2, 0, 0]}>
        <torusKnotGeometry args={[0.5, 0.2, 100, 16]} />
        <meshStandardMaterial color="lightblue" />
      </mesh>
    </>
  )
}

function Scene({ 
  modelUrl, 
  modelFile,
  showModel, 
  modelType 
}: { 
  modelUrl: string | null
  modelFile: File | null
  showModel: boolean
  modelType: 'gltf' | 'ifc' | 'fragment'
}) {
  return (
    <>
      {/* Lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />
      <Environment preset="sunset" />

      {/* Render model or example geometry */}
      {showModel ? (
        modelType === 'ifc' && modelFile ? (
          <IFCModel file={modelFile} />
        ) : modelType === 'fragment' && modelFile ? (
          <FragmentModel file={modelFile} />
        ) : modelUrl ? (
          <GLTFModel url={modelUrl} />
        ) : (
          <ExampleGeometry />
        )
      ) : (
        <ExampleGeometry />
      )}

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Camera controls */}
      <OrbitControls makeDefault />
    </>
  )
}

function ControlPanel({
  outlineColor,
  setOutlineColor,
  depthBias,
  setDepthBias,
  depthMultiplier,
  setDepthMultiplier,
  normalBias,
  setNormalBias,
  normalMultiplier,
  setNormalMultiplier,
  debugVisualize,
  setDebugVisualize,
  showModel,
  setShowModel,
  onFileUpload,
}: {
  outlineColor: string
  setOutlineColor: (color: string) => void
  depthBias: number
  setDepthBias: (value: number) => void
  depthMultiplier: number
  setDepthMultiplier: (value: number) => void
  normalBias: number
  setNormalBias: (value: number) => void
  normalMultiplier: number
  setNormalMultiplier: (value: number) => void
  debugVisualize: number
  setDebugVisualize: (value: number) => void
  showModel: boolean
  setShowModel: (show: boolean) => void
  onFileUpload: (file: File) => void
}) {
  const gltfInputRef = useRef<HTMLInputElement>(null)
  const ifcInputRef = useRef<HTMLInputElement>(null)
  const fragmentInputRef = useRef<HTMLInputElement>(null)

  const handleGltfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
      onFileUpload(file)
      setShowModel(true)
    } else {
      alert('Please select a .glb or .gltf file')
    }
  }

  const handleIfcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.ifc')) {
      onFileUpload(file)
      setShowModel(true)
    } else {
      alert('Please select a .ifc file')
    }
  }

  const handleFragmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.frag')) {
      onFileUpload(file)
      setShowModel(true)
    } else {
      alert('Please select a .frag file')
    }
  }

  return (
    <div className="controls-panel">
      <h3>Outline Controls</h3>

      <div className="control-group">
        <label>Model Type</label>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowModel(false)}
            style={{
              flex: '1 1 100%',
              padding: '8px',
              background: !showModel ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Primitives
          </button>
          <button
            onClick={() => gltfInputRef.current?.click()}
            style={{
              flex: '1 1 45%',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            📦 GLTF
          </button>
          <button
            onClick={() => ifcInputRef.current?.click()}
            style={{
              flex: '1 1 45%',
              padding: '8px',
              background: 'rgba(0, 136, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(0, 136, 255, 0.5)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            🏗️ IFC
          </button>
          <button
            onClick={() => fragmentInputRef.current?.click()}
            style={{
              flex: '1 1 100%',
              padding: '8px',
              background: 'rgba(147, 51, 234, 0.2)',
              color: 'white',
              border: '1px solid rgba(147, 51, 234, 0.5)',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            📐 Fragment
          </button>
        </div>
        <input
          ref={gltfInputRef}
          type="file"
          accept=".glb,.gltf"
          onChange={handleGltfChange}
          style={{ display: 'none' }}
        />
        <input
          ref={ifcInputRef}
          type="file"
          accept=".ifc"
          onChange={handleIfcChange}
          style={{ display: 'none' }}
        />
        <input
          ref={fragmentInputRef}
          type="file"
          accept=".frag"
          onChange={handleFragmentChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="control-group">
        <label>
          Debug Mode <span className="value-display">{debugVisualize}</span>
        </label>
        <select value={debugVisualize} onChange={(e) => setDebugVisualize(Number(e.target.value))}>
          <option value={0}>Outlines V2 (Surface ID)</option>
          <option value={1}>Outlines V1 (Depth/Normal)</option>
          <option value={2}>Original Scene</option>
          <option value={3}>Depth Buffer</option>
          <option value={4}>Normal Buffer</option>
          <option value={5}>Surface ID Buffer</option>
          <option value={6}>Outlines Only</option>
        </select>
      </div>

      <div className="control-group">
        <label>Outline Color</label>
        <input
          type="color"
          value={outlineColor}
          onChange={(e) => setOutlineColor(e.target.value)}
        />
      </div>

      <div className="control-group">
        <label>
          Depth Bias <span className="value-display">{depthBias.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={depthBias}
          onChange={(e) => setDepthBias(Number(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          Depth Multiplier <span className="value-display">{depthMultiplier.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="50"
          step="1"
          value={depthMultiplier}
          onChange={(e) => setDepthMultiplier(Number(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          Normal Bias <span className="value-display">{normalBias.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={normalBias}
          onChange={(e) => setNormalBias(Number(e.target.value))}
        />
      </div>

      <div className="control-group">
        <label>
          Normal Multiplier <span className="value-display">{normalMultiplier.toFixed(1)}</span>
        </label>
        <input
          type="range"
          min="0"
          max="10"
          step="0.1"
          value={normalMultiplier}
          onChange={(e) => setNormalMultiplier(Number(e.target.value))}
        />
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#888' }}>
        <p>💡 Load different model types:</p>
        <p style={{ fontSize: '11px', marginTop: '5px' }}>
          📦 GLTF: .glb/.gltf files
        </p>
        <p style={{ fontSize: '11px', color: '#0088ff', marginTop: '3px' }}>
          🏗️ IFC: BIM models (converts to fragments)
        </p>
        <p style={{ fontSize: '11px', color: '#9333ea', marginTop: '3px' }}>
          📐 Fragment: Pre-converted .frag files
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [outlineColor, setOutlineColor] = useState('#ffffff')
  const [depthBias, setDepthBias] = useState(0.9)
  const [depthMultiplier, setDepthMultiplier] = useState(20.0)
  const [normalBias, setNormalBias] = useState(1.0)
  const [normalMultiplier, setNormalMultiplier] = useState(1.0)
  const [debugVisualize, setDebugVisualize] = useState(0)
  const [showModel, setShowModel] = useState(false)
  const [modelUrl, setModelUrl] = useState<string | null>(null)
  const [modelFile, setModelFile] = useState<File | null>(null)
  const [modelType, setModelType] = useState<'gltf' | 'ifc' | 'fragment'>('gltf')
  const outlineRef = useRef<OutlineEffectRef>(null)

  const handleFileUpload = (file: File) => {
    // Detect file type
    if (file.name.endsWith('.ifc')) {
      setModelType('ifc')
      setModelFile(file)
      setModelUrl(null)
    } else if (file.name.endsWith('.frag')) {
      setModelType('fragment')
      setModelFile(file)
      setModelUrl(null)
    } else {
      setModelType('gltf')
      const url = URL.createObjectURL(file)
      setModelUrl(url)
      setModelFile(null)
    }
  }

  return (
    <>
      <Canvas camera={{ position: [5, 3, 5], fov: 50 }}>
        <OutlineEffect
          ref={outlineRef}
          outlineColor={outlineColor}
          depthBias={depthBias}
          depthMultiplier={depthMultiplier}
          normalBias={normalBias}
          normalMultiplier={normalMultiplier}
          debugVisualize={debugVisualize}
        />
          <Scene 
            modelUrl={modelUrl} 
            modelFile={modelFile}
            showModel={showModel} 
            modelType={modelType} 
          />
      </Canvas>

      <ControlPanel
        outlineColor={outlineColor}
        setOutlineColor={setOutlineColor}
        depthBias={depthBias}
        setDepthBias={setDepthBias}
        depthMultiplier={depthMultiplier}
        setDepthMultiplier={setDepthMultiplier}
        normalBias={normalBias}
        setNormalBias={setNormalBias}
        normalMultiplier={normalMultiplier}
        setNormalMultiplier={setNormalMultiplier}
        debugVisualize={debugVisualize}
        setDebugVisualize={setDebugVisualize}
        showModel={showModel}
        setShowModel={setShowModel}
        onFileUpload={handleFileUpload}
      />
    </>
  )
}

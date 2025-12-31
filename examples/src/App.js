import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { OutlineEffect } from 'r3f-peridot';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as FRAGS from '@thatopen/fragments';
// GLTF Model component
function GLTFModel({ url }) {
    const { camera, controls } = useThree();
    const [model, setModel] = useState(null);
    useEffect(() => {
        if (!url)
            return;
        const loadGLTF = async () => {
            try {
                const loader = new GLTFLoader();
                const gltf = await loader.loadAsync(url);
                const scene = gltf.scene;
                // Make all materials double-sided
                scene.traverse((child) => {
                    if (child.isMesh) {
                        const mesh = child;
                        if (mesh.material) {
                            if (Array.isArray(mesh.material)) {
                                mesh.material.forEach(mat => mat.side = THREE.DoubleSide);
                            }
                            else {
                                mesh.material.side = THREE.DoubleSide;
                            }
                        }
                    }
                });
                setModel(scene);
                // Fit camera to model
                const box = new THREE.Box3().setFromObject(scene);
                if (controls && 'fitToSphere' in controls) {
                    const sphere = new THREE.Sphere();
                    box.getBoundingSphere(sphere);
                    controls.fitToSphere(sphere, true);
                }
            }
            catch (error) {
                console.error('Error loading GLTF:', error);
            }
        };
        loadGLTF();
    }, [url, camera, controls]);
    if (!model)
        return null;
    return _jsx("primitive", { object: model });
}
// Fragment Model component - loads pre-converted .frag files
function FragmentModel({ file }) {
    const { camera, controls } = useThree();
    const scene = useThree((state) => state.scene);
    const [model, setModel] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fragmentsRef = useRef(null);
    // Update fragments when camera controls change
    useEffect(() => {
        if (!fragmentsRef.current || !controls)
            return;
        const handleControlChange = () => {
            fragmentsRef.current?.update();
        };
        const handleControlRest = () => {
            fragmentsRef.current?.update(true);
        };
        const orbitControls = controls;
        orbitControls.addEventListener('change', handleControlChange);
        orbitControls.addEventListener('rest', handleControlRest);
        return () => {
            orbitControls.removeEventListener('change', handleControlChange);
            orbitControls.removeEventListener('rest', handleControlRest);
        };
    }, [controls, fragmentsRef.current]);
    useEffect(() => {
        if (!file)
            return;
        const loadFragment = async () => {
            setIsLoading(true);
            try {
                console.log(`Loading Fragment file: ${file.name}`);
                // Initialize fragments if not already done
                if (!fragmentsRef.current) {
                    const basePath = import.meta.env.BASE_URL || '/';
                    fragmentsRef.current = new FRAGS.FragmentsModels(`${basePath}worker.mjs`);
                }
                // Read file as array buffer
                const arrayBuffer = await file.arrayBuffer();
                // Load fragment file (already converted, no need to process)
                const fragmentsModel = await fragmentsRef.current.load(arrayBuffer, {
                    modelId: performance.now().toString(),
                    camera: camera,
                    raw: false, // Fragments are compressed by default
                });
                // Add to scene
                scene.add(fragmentsModel.object);
                // Update fragments to make them visible
                await fragmentsRef.current.update(true);
                // Make all materials double-sided
                fragmentsModel.object.traverse((child) => {
                    if (child.isMesh) {
                        const mesh = child;
                        if (mesh.material) {
                            if (Array.isArray(mesh.material)) {
                                mesh.material.forEach(mat => mat.side = THREE.DoubleSide);
                            }
                            else {
                                mesh.material.side = THREE.DoubleSide;
                            }
                        }
                    }
                });
                // Fit camera to model
                const box = new THREE.Box3().setFromObject(fragmentsModel.object);
                if (controls && 'fitToSphere' in controls) {
                    const sphere = new THREE.Sphere();
                    box.getBoundingSphere(sphere);
                    controls.fitToSphere(sphere, true);
                }
                console.log('Fragment model loaded successfully:', fragmentsModel);
                setModel(fragmentsModel);
                setIsLoading(false);
            }
            catch (err) {
                console.error('Failed to load Fragment:', err);
                setIsLoading(false);
            }
        };
        loadFragment();
        return () => {
            if (model) {
                scene.remove(model.object);
                model.dispose();
            }
        };
    }, [file, camera, scene, controls]);
    if (isLoading) {
        return (_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [2, 2, 2] }), _jsx("meshStandardMaterial", { color: "purple", wireframe: true })] }));
    }
    return null;
}
// IFC Model component using @thatopen/fragments
function IFCModel({ file }) {
    const { camera, controls } = useThree();
    const scene = useThree((state) => state.scene);
    const [model, setModel] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fragmentsRef = useRef(null);
    // Update fragments when camera controls change
    useEffect(() => {
        if (!fragmentsRef.current || !controls)
            return;
        const handleControlChange = () => {
            fragmentsRef.current?.update();
        };
        const handleControlRest = () => {
            fragmentsRef.current?.update(true);
        };
        const orbitControls = controls;
        orbitControls.addEventListener('change', handleControlChange);
        orbitControls.addEventListener('rest', handleControlRest);
        return () => {
            orbitControls.removeEventListener('change', handleControlChange);
            orbitControls.removeEventListener('rest', handleControlRest);
        };
    }, [controls, fragmentsRef.current]);
    useEffect(() => {
        if (!file)
            return;
        const loadIFC = async () => {
            setIsLoading(true);
            try {
                console.log(`Loading IFC file: ${file.name}`);
                // Initialize fragments if not already done
                if (!fragmentsRef.current) {
                    const basePath = import.meta.env.BASE_URL || '/';
                    fragmentsRef.current = new FRAGS.FragmentsModels(`${basePath}worker.mjs`);
                }
                // Read file as array buffer
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                // Convert IFC to fragments (exactly like the example)
                const serializer = new FRAGS.IfcImporter();
                // Use local WASM files for development, CDN for production if local files fail
                const basePath = import.meta.env.BASE_URL || '/';
                serializer.wasm.path = basePath;
                serializer.wasm.absolute = false;
                const fragmentsBytes = await serializer.process({
                    bytes,
                    raw: true
                });
                // Load fragments (exactly like the example)
                const fragmentsModel = await fragmentsRef.current.load(fragmentsBytes, {
                    modelId: performance.now().toString(),
                    camera: camera,
                    raw: true,
                });
                // Add to scene (exactly like the example)
                scene.add(fragmentsModel.object);
                // Update fragments to make them visible (critical!)
                await fragmentsRef.current.update(true);
                // Make all materials double-sided
                fragmentsModel.object.traverse((child) => {
                    if (child.isMesh) {
                        const mesh = child;
                        if (mesh.material) {
                            if (Array.isArray(mesh.material)) {
                                mesh.material.forEach(mat => mat.side = THREE.DoubleSide);
                            }
                            else {
                                mesh.material.side = THREE.DoubleSide;
                            }
                        }
                    }
                });
                // Fit camera to model
                const box = new THREE.Box3().setFromObject(fragmentsModel.object);
                if (controls && 'fitToSphere' in controls) {
                    const sphere = new THREE.Sphere();
                    box.getBoundingSphere(sphere);
                    controls.fitToSphere(sphere, true);
                }
                console.log('IFC model loaded successfully:', fragmentsModel);
                setModel(fragmentsModel);
                setIsLoading(false);
            }
            catch (err) {
                console.error('Failed to load IFC:', err);
                setIsLoading(false);
            }
        };
        loadIFC();
        return () => {
            if (model) {
                scene.remove(model.object);
                model.dispose();
            }
        };
    }, [file, camera, scene, controls]);
    if (isLoading) {
        return (_jsxs("mesh", { children: [_jsx("boxGeometry", { args: [2, 2, 2] }), _jsx("meshStandardMaterial", { color: "orange", wireframe: true })] }));
    }
    // Don't render anything - the model is already added to the scene
    // Returning null is fine because we manually added it to scene.add()
    return null;
}
// Example geometry scene
function ExampleGeometry() {
    return (_jsxs(_Fragment, { children: [_jsxs("mesh", { position: [-2, 0, 0], children: [_jsx("boxGeometry", { args: [1, 1, 1] }), _jsx("meshStandardMaterial", { color: "orange" })] }), _jsxs("mesh", { position: [0, 0, 0], children: [_jsx("sphereGeometry", { args: [0.7, 32, 32] }), _jsx("meshStandardMaterial", { color: "hotpink" })] }), _jsxs("mesh", { position: [2, 0, 0], children: [_jsx("torusKnotGeometry", { args: [0.5, 0.2, 100, 16] }), _jsx("meshStandardMaterial", { color: "lightblue" })] })] }));
}
function Scene({ modelUrl, modelFile, showModel, modelType }) {
    return (_jsxs(_Fragment, { children: [_jsx("ambientLight", { intensity: 0.5 }), _jsx("directionalLight", { position: [10, 10, 5], intensity: 1 }), _jsx(Environment, { preset: "sunset" }), showModel ? (modelType === 'ifc' && modelFile ? (_jsx(IFCModel, { file: modelFile })) : modelType === 'fragment' && modelFile ? (_jsx(FragmentModel, { file: modelFile })) : modelUrl ? (_jsx(GLTFModel, { url: modelUrl })) : (_jsx(ExampleGeometry, {}))) : (_jsx(ExampleGeometry, {})), _jsxs("mesh", { rotation: [-Math.PI / 2, 0, 0], position: [0, -1, 0], children: [_jsx("planeGeometry", { args: [10, 10] }), _jsx("meshStandardMaterial", { color: "#333" })] }), _jsx(OrbitControls, { makeDefault: true })] }));
}
function ControlPanel({ outlineColor, setOutlineColor, depthBias, setDepthBias, depthMultiplier, setDepthMultiplier, normalBias, setNormalBias, normalMultiplier, setNormalMultiplier, debugVisualize, setDebugVisualize, showModel, setShowModel, onFileUpload, }) {
    const gltfInputRef = useRef(null);
    const ifcInputRef = useRef(null);
    const fragmentInputRef = useRef(null);
    const handleGltfChange = (e) => {
        const file = e.target.files?.[0];
        if (file && (file.name.endsWith('.glb') || file.name.endsWith('.gltf'))) {
            onFileUpload(file);
            setShowModel(true);
        }
        else {
            alert('Please select a .glb or .gltf file');
        }
    };
    const handleIfcChange = (e) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith('.ifc')) {
            onFileUpload(file);
            setShowModel(true);
        }
        else {
            alert('Please select a .ifc file');
        }
    };
    const handleFragmentChange = (e) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith('.frag')) {
            onFileUpload(file);
            setShowModel(true);
        }
        else {
            alert('Please select a .frag file');
        }
    };
    return (_jsxs("div", { className: "controls-panel", children: [_jsx("h3", { children: "Outline Controls" }), _jsxs("div", { className: "control-group", children: [_jsx("label", { children: "Model Type" }), _jsxs("div", { style: { display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }, children: [_jsx("button", { onClick: () => setShowModel(false), style: {
                                    flex: '1 1 100%',
                                    padding: '8px',
                                    background: !showModel ? '#4CAF50' : 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }, children: "Primitives" }), _jsx("button", { onClick: () => gltfInputRef.current?.click(), style: {
                                    flex: '1 1 45%',
                                    padding: '8px',
                                    background: 'rgba(255, 255, 255, 0.1)',
                                    color: 'white',
                                    border: '1px solid rgba(255, 255, 255, 0.2)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }, children: "\uD83D\uDCE6 GLTF" }), _jsx("button", { onClick: () => ifcInputRef.current?.click(), style: {
                                    flex: '1 1 45%',
                                    padding: '8px',
                                    background: 'rgba(0, 136, 255, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(0, 136, 255, 0.5)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }, children: "\uD83C\uDFD7\uFE0F IFC" }), _jsx("button", { onClick: () => fragmentInputRef.current?.click(), style: {
                                    flex: '1 1 100%',
                                    padding: '8px',
                                    background: 'rgba(147, 51, 234, 0.2)',
                                    color: 'white',
                                    border: '1px solid rgba(147, 51, 234, 0.5)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                }, children: "\uD83D\uDCD0 Fragment" })] }), _jsx("input", { ref: gltfInputRef, type: "file", accept: ".glb,.gltf", onChange: handleGltfChange, style: { display: 'none' } }), _jsx("input", { ref: ifcInputRef, type: "file", accept: ".ifc", onChange: handleIfcChange, style: { display: 'none' } }), _jsx("input", { ref: fragmentInputRef, type: "file", accept: ".frag", onChange: handleFragmentChange, style: { display: 'none' } })] }), _jsxs("div", { className: "control-group", children: [_jsxs("label", { children: ["Debug Mode ", _jsx("span", { className: "value-display", children: debugVisualize })] }), _jsxs("select", { value: debugVisualize, onChange: (e) => setDebugVisualize(Number(e.target.value)), children: [_jsx("option", { value: 0, children: "Outlines V2 (Surface ID)" }), _jsx("option", { value: 1, children: "Outlines V1 (Depth/Normal)" }), _jsx("option", { value: 2, children: "Original Scene" }), _jsx("option", { value: 3, children: "Depth Buffer" }), _jsx("option", { value: 4, children: "Normal Buffer" }), _jsx("option", { value: 5, children: "Surface ID Buffer" }), _jsx("option", { value: 6, children: "Outlines Only" })] })] }), _jsxs("div", { className: "control-group", children: [_jsx("label", { children: "Outline Color" }), _jsx("input", { type: "color", value: outlineColor, onChange: (e) => setOutlineColor(e.target.value) })] }), _jsxs("div", { className: "control-group", children: [_jsxs("label", { children: ["Depth Bias ", _jsx("span", { className: "value-display", children: depthBias.toFixed(2) })] }), _jsx("input", { type: "range", min: "0", max: "2", step: "0.1", value: depthBias, onChange: (e) => setDepthBias(Number(e.target.value)) })] }), _jsxs("div", { className: "control-group", children: [_jsxs("label", { children: ["Depth Multiplier ", _jsx("span", { className: "value-display", children: depthMultiplier.toFixed(1) })] }), _jsx("input", { type: "range", min: "0", max: "50", step: "1", value: depthMultiplier, onChange: (e) => setDepthMultiplier(Number(e.target.value)) })] }), _jsxs("div", { className: "control-group", children: [_jsxs("label", { children: ["Normal Bias ", _jsx("span", { className: "value-display", children: normalBias.toFixed(2) })] }), _jsx("input", { type: "range", min: "0", max: "2", step: "0.1", value: normalBias, onChange: (e) => setNormalBias(Number(e.target.value)) })] }), _jsxs("div", { className: "control-group", children: [_jsxs("label", { children: ["Normal Multiplier ", _jsx("span", { className: "value-display", children: normalMultiplier.toFixed(1) })] }), _jsx("input", { type: "range", min: "0", max: "10", step: "0.1", value: normalMultiplier, onChange: (e) => setNormalMultiplier(Number(e.target.value)) })] }), _jsxs("div", { style: { marginTop: '20px', fontSize: '12px', color: '#888' }, children: [_jsx("p", { children: "\uD83D\uDCA1 Load different model types:" }), _jsx("p", { style: { fontSize: '11px', marginTop: '5px' }, children: "\uD83D\uDCE6 GLTF: .glb/.gltf files" }), _jsx("p", { style: { fontSize: '11px', color: '#0088ff', marginTop: '3px' }, children: "\uD83C\uDFD7\uFE0F IFC: BIM models (converts to fragments)" }), _jsx("p", { style: { fontSize: '11px', color: '#9333ea', marginTop: '3px' }, children: "\uD83D\uDCD0 Fragment: Pre-converted .frag files" })] })] }));
}
export default function App() {
    const [outlineColor, setOutlineColor] = useState('#ffffff');
    const [depthBias, setDepthBias] = useState(0.9);
    const [depthMultiplier, setDepthMultiplier] = useState(20.0);
    const [normalBias, setNormalBias] = useState(1.0);
    const [normalMultiplier, setNormalMultiplier] = useState(1.0);
    const [debugVisualize, setDebugVisualize] = useState(0);
    const [showModel, setShowModel] = useState(false);
    const [modelUrl, setModelUrl] = useState(null);
    const [modelFile, setModelFile] = useState(null);
    const [modelType, setModelType] = useState('gltf');
    const outlineRef = useRef(null);
    const handleFileUpload = (file) => {
        // Detect file type
        if (file.name.endsWith('.ifc')) {
            setModelType('ifc');
            setModelFile(file);
            setModelUrl(null);
        }
        else if (file.name.endsWith('.frag')) {
            setModelType('fragment');
            setModelFile(file);
            setModelUrl(null);
        }
        else {
            setModelType('gltf');
            const url = URL.createObjectURL(file);
            setModelUrl(url);
            setModelFile(null);
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Canvas, { camera: { position: [5, 3, 5], fov: 50 }, children: [_jsx(OutlineEffect, { ref: outlineRef, outlineColor: outlineColor, depthBias: depthBias, depthMultiplier: depthMultiplier, normalBias: normalBias, normalMultiplier: normalMultiplier, debugVisualize: debugVisualize }), _jsx(Scene, { modelUrl: modelUrl, modelFile: modelFile, showModel: showModel, modelType: modelType })] }), _jsx(ControlPanel, { outlineColor: outlineColor, setOutlineColor: setOutlineColor, depthBias: depthBias, setDepthBias: setDepthBias, depthMultiplier: depthMultiplier, setDepthMultiplier: setDepthMultiplier, normalBias: normalBias, setNormalBias: setNormalBias, normalMultiplier: normalMultiplier, setNormalMultiplier: setNormalMultiplier, debugVisualize: debugVisualize, setDebugVisualize: setDebugVisualize, showModel: showModel, setShowModel: setShowModel, onFileUpload: handleFileUpload })] }));
}

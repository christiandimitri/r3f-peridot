# 💎 Peridot

### High-Quality Outlines for React Three Fiber - GLTF, IFC & Beyond

[![npm version](https://badge.fury.io/js/r3f-peridot.svg)](https://www.npmjs.com/package/r3f-peridot)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Peridot** brings professional-grade outline rendering to React Three Fiber. Perfect for architectural visualization, BIM workflows, CAD applications, and any 3D model that needs crisp, clean edges.

![Peridot Demo](https://via.placeholder.com/800x400?text=Peridot+Demo)

## ✨ Why Peridot?

- 🏗️ **IFC Support** - First-class support for Building Information Modeling (BIM/IFC) files
- 📦 **GLTF Ready** - Works seamlessly with GLTF/GLB models
- 🎨 **High-Quality** - Uses advanced depth, normal, and surface ID detection
- ⚡ **Performant** - Efficient post-processing shader implementation
- 🎛️ **Customizable** - Full control over outline appearance
- 🔍 **Debug Modes** - Multiple visualization modes for fine-tuning
- 📦 **TypeScript** - Full type definitions included
- 🌲 **Tree-Shakeable** - Optimized bundle size

## 🚀 Quick Start

### Installation

```bash
npm install r3f-peridot
```

```bash
yarn add r3f-peridot
```

```bash
pnpm add r3f-peridot
```

### Basic Usage

```tsx
import { Canvas } from '@react-three/fiber'
import { OutlineEffect } from 'r3f-peridot'

function Scene() {
  return (
    <Canvas>
      <OutlineEffect outlineColor="#ffffff" />
      
      {/* Your 3D content */}
      <mesh>
        <boxGeometry />
        <meshStandardMaterial />
      </mesh>
    </Canvas>
  )
}
```

### With GLTF Models

```tsx
import { useGLTF } from '@react-three/drei'
import { OutlineEffect } from 'r3f-peridot'

function Model() {
  const { scene } = useGLTF('/model.glb')
  return <primitive object={scene} />
}

function App() {
  return (
    <Canvas>
      <OutlineEffect outlineColor="#00ff00" />
      <Model />
    </Canvas>
  )
}
```

### With IFC Models 🏗️

```tsx
import { IFCLoader } from 'web-ifc-three/IFCLoader'
import { OutlineEffect } from 'r3f-peridot'
import { useEffect, useState } from 'react'

function IFCModel({ url }) {
  const [model, setModel] = useState(null)

  useEffect(() => {
    const loader = new IFCLoader()
    loader.load(url, setModel)
  }, [url])

  return model ? <primitive object={model} /> : null
}

function App() {
  return (
    <Canvas>
      <OutlineEffect 
        outlineColor="#0080ff"
        depthMultiplier={25.0}
      />
      <IFCModel url="/building.ifc" />
    </Canvas>
  )
}
```

## 📖 API Reference

### `<OutlineEffect />`

The main component that adds outline post-processing to your R3F scene.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable or disable the effect |
| `outlineColor` | `string \| THREE.Color` | `'#ffffff'` | Color of the outline |
| `depthBias` | `number` | `0.9` | Bias for depth-based edge detection (0-2) |
| `depthMultiplier` | `number` | `20.0` | Multiplier for depth-based edges (0-50) |
| `normalBias` | `number` | `1.0` | Bias for normal-based edge detection (0-2) |
| `normalMultiplier` | `number` | `1.0` | Multiplier for normal-based edges (0-10) |
| `debugVisualize` | `number` | `0` | Debug visualization mode (see below) |

#### Debug Visualization Modes

- `0` - **Outlines V2** (Surface ID based) - Best for CAD/BIM models
- `1` - **Outlines V1** (Depth/Normal based) - Alternative method
- `2` - **Original Scene** - No outline effect
- `3` - **Depth Buffer** - Visualize depth information
- `4` - **Normal Buffer** - Visualize normal information
- `5` - **Surface ID Buffer** - Visualize surface IDs (random colors)
- `6` - **Outlines Only** - Show only the outline effect

## 🎨 Advanced Usage

### Custom Outline Colors

```tsx
import * as THREE from 'three'

// Using hex string
<OutlineEffect outlineColor="#ff0000" />

// Using THREE.Color
<OutlineEffect outlineColor={new THREE.Color('hotpink')} />

// Dynamic colors
const [color, setColor] = useState('#00ff00')
<OutlineEffect outlineColor={color} />
```

### Fine-Tuning for Different Models

```tsx
// For architectural/BIM models (IFC)
<OutlineEffect
  outlineColor="#0080ff"
  depthBias={0.8}
  depthMultiplier={25.0}
  debugVisualize={0} // Use Surface ID mode
/>

// For organic/smooth models
<OutlineEffect
  outlineColor="#ffffff"
  depthBias={1.2}
  depthMultiplier={15.0}
  normalMultiplier={1.5}
  debugVisualize={1} // Use Depth/Normal mode
/>

// For mechanical/CAD models
<OutlineEffect
  outlineColor="#000000"
  depthBias={0.6}
  depthMultiplier={30.0}
  debugVisualize={0} // Use Surface ID mode
/>
```

### Conditional Outlines

```tsx
function Scene() {
  const [showOutlines, setShowOutlines] = useState(true)
  
  return (
    <Canvas>
      <OutlineEffect enabled={showOutlines} />
      {/* Your scene */}
    </Canvas>
  )
}
```

## 🏗️ IFC & BIM Workflows

Peridot is designed with AEC (Architecture, Engineering, Construction) workflows in mind:

### Perfect for:
- 📐 **Architectural Visualization** - Clean edges for buildings
- 🏢 **BIM Model Review** - Clear element boundaries
- 🏗️ **Construction Planning** - Highlight different components
- 📊 **Facility Management** - Visual clarity for complex structures
- 🎓 **Educational Content** - Clear technical drawings

### IFC Best Practices

```tsx
// Recommended settings for IFC models
<OutlineEffect
  outlineColor="#003366" // Professional dark blue
  depthBias={0.8}
  depthMultiplier={25.0}
  normalBias={1.0}
  normalMultiplier={1.0}
  debugVisualize={0} // Surface ID mode for clean element separation
/>
```

## 🛠️ Utility Functions

### `FindSurfaces`

Computes surface IDs for meshes based on vertex connectivity.

```tsx
import { FindSurfaces } from 'r3f-peridot'

const findSurfaces = new FindSurfaces()
const surfaceIdAttribute = findSurfaces.getSurfaceIdAttribute(mesh)
```

### `weldVertices`

Merges vertices along edges for improved outline quality.

```tsx
import { weldVertices } from 'r3f-peridot'

const newIndices = weldVertices(vertices, indices, thresholdAngle)
```

### `CustomOutlinePass`

Direct access to the Three.js post-processing pass.

```tsx
import { CustomOutlinePass } from 'r3f-peridot'
```

## 🎯 Examples

Check out the `/examples` directory for complete working examples:

- **Basic Example** - Simple scene with primitive geometry
- **GLTF Models** - Loading and outlining GLTF/GLB files
- **IFC Models** - Working with Building Information Models
- **Interactive Controls** - Real-time parameter adjustment

To run examples locally:

```bash
cd examples
npm install
npm run dev
```

## 🎓 How It Works

Peridot uses the [webgl-outlines technique](https://github.com/OmarShehata/webgl-outlines) by Omar Shehata:

1. **Render Passes** - Scene is rendered to depth, normal, and surface ID buffers
2. **Edge Detection** - Post-process shader detects edges based on buffer differences
3. **Outline Rendering** - Detected edges are rendered as colored outlines
4. **Anti-Aliasing** - FXAA pass ensures smooth, crisp edges

This approach provides:
- ✅ High-quality outlines on any geometry
- ✅ No special mesh preparation required
- ✅ Works with any material
- ✅ Minimal performance impact

## 📊 Performance

- **Bundle Size**: ~27 KB (minified)
- **Runtime**: < 1ms per frame (typical)
- **Memory**: Minimal overhead (2-3 render targets)
- **Compatibility**: WebGL 2.0+ required

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📝 License

MIT © Christian Dimitri

## 🙏 Acknowledgments

- [Omar Shehata](https://github.com/OmarShehata) for the original [webgl-outlines](https://github.com/OmarShehata/webgl-outlines) technique
- [Three.js](https://threejs.org/) for the amazing 3D library
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) for the React renderer
- [IFC.js](https://ifcjs.github.io/info/) for IFC support

## 📚 Resources

- [Documentation](https://github.com/yourusername/r3f-peridot#readme)
- [Examples](https://github.com/yourusername/r3f-peridot/tree/main/examples)
- [Issues](https://github.com/yourusername/r3f-peridot/issues)
- [WebGL Outlines Blog Post](https://omar-shehata.medium.com/how-to-render-outlines-in-webgl-8253c14724f9)

## 🌟 Show Your Support

If you find Peridot useful, please:
- ⭐ Star the repository
- 🐦 Share on social media
- 📝 Write a blog post
- 🎥 Create a tutorial

---

**Made with 💚 for the open source community**

*"Precision outlines for every model" - Peridot* 💎

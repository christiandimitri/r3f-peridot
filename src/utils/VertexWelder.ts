/**
 * Merges together vertices along the edges between triangles
 * whose angle is below the given threshold.
 *
 * @param {number[]} vertices - Array of (x,y,z) positions as a flat list.
 * @param {number[]} indices - Array of indices of (v1, v2, v3) that define the triangles.
 * @param {number} [thresholdAngle=1] - In degrees. When the angle between the face normals
 *  of 2 triangles is less than this threshold, the vertices along their shared edge are merged.
 * @returns {number[]} - A new index buffer without the extra vertices.
 */
export function weldVertices(
  vertices: number[],
  indices: number[],
  thresholdAngle: number = 1
): number[] {
  const mergedMap: { [key: number]: number[] } = {}
  const vertexAliases: { [key: number]: number } = {}

  // Helper function to mark 2 vertices as merged
  function merge(i1: number, i2: number) {
    if (mergedMap[i1] == undefined) mergedMap[i1] = []

    mergedMap[i1].push(i2)
  }
  // Marks a given edge as deleted, and which one it's replaced by
  function aliasDeletedVertex(deletedVertex: number, remainingVertex: number) {
    if (deletedVertex == remainingVertex) return

    vertexAliases[deletedVertex] = remainingVertex
  }

  // `computeEdgesToMerge` looks over all the geometry and returns an array of edges that should be merged
  const edgesToMerge = computeEdgesToMerge(vertices, indices, thresholdAngle)
  // Convert the array of edges to merge to a map
  const edgesToMergeMap: { [key: string]: number[][] } = {}
  for (let i = 0; i < edgesToMerge.length; i++) {
    const edgesList = edgesToMerge[i]
    for (const index of edgesList) {
      const key = `${index[0]}_${index[1]}`
      edgesToMergeMap[key] = edgesList
    }
  }

  // Go through all triangles
  for (let i = 0; i < indices.length; i += 3) {
    // Look at all 3 edges
    const i1 = indices[i + 0]
    const i2 = indices[i + 1]
    const i3 = indices[i + 2]
    const edges: number[][] = []
    edges.push([i1, i2])
    edges.push([i1, i3])
    edges.push([i2, i3])
    for (const edge of edges) {
      let index0 = edge[0]
      let index1 = edge[1]
      const reverseEdge = [index1, index0]
      let isReverse = false

      // Check if this edge exists in the "merge map"
      let edgeToMerge: number[] | undefined
      const edgeKey = `${edge[0]}_${edge[1]}`
      const reverseEdgeKey = `${reverseEdge[0]}_${reverseEdge[1]}`
      if (edgesToMergeMap[edgeKey]) {
        edgeToMerge = edge
      }
      if (edgesToMergeMap[reverseEdgeKey]) {
        edgeToMerge = reverseEdge
        isReverse = true
      }

      if (edgeToMerge) {
        // Once you found an edge to merge,
        // you need to find its sibling edge, then merge the vertices in the right orientation
        // edgesToMergeMap[edge] contains two edges
        const edgeKeyToUse = isReverse ? reverseEdgeKey : edgeKey
        const possibleEdges = edgesToMergeMap[edgeKeyToUse]
        const possibleEdge1 = possibleEdges[0]
        const possibleEdge2 = possibleEdges[1]
        let otherEdge = possibleEdge1
        let originalEdge = possibleEdge2
        // Just pick the one that is NOT the current edgeToMerge
        if (
          (possibleEdge1[0] == index0 && possibleEdge1[1] == index1) ||
          (possibleEdge1[0] == index1 && possibleEdge1[1] == index0)
        ) {
          otherEdge = possibleEdge2
          originalEdge = possibleEdge1
        }

        let index2 = otherEdge[0]
        let index3 = otherEdge[1]
        index0 = originalEdge[0]
        index1 = originalEdge[1]

        if (index0 == index2 && index1 == index3) {
          // Not sure why this happens, but sometimes
          // you get these degenerate self edges
          continue
        }

        // Merge index0 and index1, with index2 & 3
        // Figure out which orientation to merge in
        // if you have:
        //  1 ---- 2
        //  3 ----- 4
        // You want to merge 1,3, and 2,4
        // NOT the other way around
        const v0 = getVertexFromIndexBuffer(index0, vertices)
        const v2 = getVertexFromIndexBuffer(index2, vertices)
        if (v0.distanceTo(v2) > 0.1) {
          const tmp = index3
          index3 = index2
          index2 = tmp
        }

        // Replace deleted indices
        if (vertexAliases[index0]) index0 = vertexAliases[index0]
        if (vertexAliases[index1]) index1 = vertexAliases[index1]
        if (vertexAliases[index2]) index2 = vertexAliases[index2]
        if (vertexAliases[index3]) index3 = vertexAliases[index3]

        merge(index0, index2)
        merge(index1, index3)
        // 0 was merged with 2, so we consider 2 the deleted vertex
        aliasDeletedVertex(index2, index0)
        aliasDeletedVertex(index3, index1)

        // Remove them edges we've merged from the map
        const mergedEdgeKey = `${index2}_${index3}`
        delete edgesToMergeMap[edgeKeyToUse]
        delete edgesToMergeMap[mergedEdgeKey]
      }
    }
  }

  const finalMergeMap = fillOutMergeMap(mergedMap)

  /* 
    Go through the original index buffer
    replace indices with the merged indices
    
    So if you had the following 2 triangles
    
  
      [0, 1, 2] & [3, 4, 5]

    And the merge map tells you the following vertices are merged together:
    	3 -> 1
    	4 -> 2

    Then you want to replace 3 with 1 whenever you see it, etc.
    So the new buffer is:

      [0, 1, 2] & [1, 2, 5]

    */
  const newIndexBuffer: number[] = []
  for (let i = 0; i < indices.length; i++) {
    const index = indices[i]
    let newIndex = index
    if (finalMergeMap[index] != undefined) {
      newIndex = finalMergeMap[index]
    }

    newIndexBuffer.push(newIndex)
  }

  return newIndexBuffer
}

function getVertexFromIndexBuffer(index: number, positionAttr: number[]): Vector3 {
  return new Vector3(
    positionAttr[index * 3 + 0],
    positionAttr[index * 3 + 1],
    positionAttr[index * 3 + 2]
  )
}

function fillOutMergeMap(mergeMap: { [key: number]: number[] }): { [key: number]: number } {
  /*
    If your map looks like this:

    0: [1, 2, 3]

    This creates entries for 1, 2, 3 so that they are all replaced with 0

    So the result looks like this:
  
    0: [1, 2, 3],
    1: [0],
    2: [0],
    3: [0],
    */
  const newMergeMap: { [key: number]: number } = {}
  for (let i = 0; i < Object.keys(mergeMap).length; i++) {
    const key = Number(Object.keys(mergeMap)[i]) // 0
    const indices = mergeMap[key] // [1, 2, 3]
    for (const ind of indices) {
      newMergeMap[ind] = key
    }
  }

  return newMergeMap
}

// Based on ThreeJS class
class Vector3 {
  x: number
  y: number
  z: number

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x
    this.y = y
    this.z = z
  }
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z)
  }

  set(x: number, y: number, z: number): Vector3 {
    this.x = x
    this.y = y
    this.z = z
    return this
  }

  distanceTo(v: Vector3): number {
    const dx = this.x - v.x,
      dy = this.y - v.y,
      dz = this.z - v.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
  }

  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  multiplyScalar(scalar: number): Vector3 {
    this.x *= scalar
    this.y *= scalar
    this.z *= scalar

    return this
  }

  subVectors(a: Vector3, b: Vector3): Vector3 {
    this.x = a.x - b.x
    this.y = a.y - b.y
    this.z = a.z - b.z

    return this
  }

  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z
  }
  cross(v: Vector3): Vector3 {
    return this.crossVectors(this, v)
  }

  crossVectors(a: Vector3, b: Vector3): Vector3 {
    const ax = a.x,
      ay = a.y,
      az = a.z
    const bx = b.x,
      by = b.y,
      bz = b.z

    this.x = ay * bz - az * by
    this.y = az * bx - ax * bz
    this.z = ax * by - ay * bx
    return this
  }
}

// Code below is adapted from ThreeJS EdgesGeometry
// https://github.com/mrdoob/three.js/blob/dev/src/geometries/EdgesGeometry.js
const _v0 = new Vector3()
const _normal = new Vector3()
const precisionPoints = 4
const precision = Math.pow(10, precisionPoints)

function hashVertex(v: Vector3): string {
  return `${Math.round(v.x * precision)},${Math.round(v.y * precision)},${Math.round(
    v.z * precision
  )}`
}

function getNormal(a: Vector3, b: Vector3, c: Vector3, resultNormal: Vector3): Vector3 {
  resultNormal.subVectors(c, b)
  _v0.subVectors(a, b)
  resultNormal.cross(_v0)

  const targetLengthSq = resultNormal.lengthSq()
  if (targetLengthSq > 0) {
    return resultNormal.multiplyScalar(1 / Math.sqrt(targetLengthSq))
  }

  return resultNormal.set(0, 0, 0)
}

interface EdgeData {
  index0: number
  index1: number
  normal: Vector3
}

function computeEdgesToMerge(
  vertices: number[],
  indices: number[],
  thresholdAngle: number = 1
): number[][][] {
  const DEG2RAD = Math.PI / 180
  const thresholdDot = Math.cos(DEG2RAD * thresholdAngle)

  const indexCount = indices.length

  const indexArr = [0, 0, 0]
  const hashes = new Array(3)

  const edgeData: { [key: string]: EdgeData | null } = {}
  const edgesToMerge: number[][][] = []

  for (let i = 0; i < indexCount; i += 3) {
    indexArr[0] = indices[i]
    indexArr[1] = indices[i + 1]
    indexArr[2] = indices[i + 2]

    const a = getVertexFromIndexBuffer(indexArr[0], vertices)
    const b = getVertexFromIndexBuffer(indexArr[1], vertices)
    const c = getVertexFromIndexBuffer(indexArr[2], vertices)

    getNormal(a, b, c, _normal)

    // create hashes for the edge from the vertices
    hashes[0] = hashVertex(a)
    hashes[1] = hashVertex(b)
    hashes[2] = hashVertex(c)

    // skip degenerate triangles
    if (hashes[0] === hashes[1] || hashes[1] === hashes[2] || hashes[2] === hashes[0]) {
      continue
    }

    // iterate over every edge
    for (let j = 0; j < 3; j++) {
      // get the first and next vertex making up the edge
      const jNext = (j + 1) % 3
      const vecHash0 = hashes[j]
      const vecHash1 = hashes[jNext]

      const hash = `${vecHash0}_${vecHash1}`
      const reverseHash = `${vecHash1}_${vecHash0}`

      if (reverseHash in edgeData && edgeData[reverseHash]) {
        // if we found a sibling edge add it into the vertex array if
        // it meets the angle threshold and delete the edge from the map.
        if (_normal.dot(edgeData[reverseHash]!.normal) > thresholdDot) {
          // Merge these two edges if they are separate
          const edge1 = [edgeData[reverseHash]!.index0, edgeData[reverseHash]!.index1]
          const edge2 = [indexArr[j], indexArr[jNext]]

          edgesToMerge.push([edge1, edge2])
        }
        edgeData[reverseHash] = null
      } else if (!(hash in edgeData)) {
        // if we've already got an edge here then skip adding a new one
        edgeData[hash] = {
          index0: indexArr[j],
          index1: indexArr[jNext],
          normal: _normal.clone(),
        }
      }
    }
  }

  return edgesToMerge
}


import * as THREE from 'three'
import type { ModelStats, Vector3D } from '../types'

/**
 * Calculates volume, surface area, bounding box, triangle counts and watertightness of a BufferGeometry.
 */
export function calculateModelStats(
  geometry: THREE.BufferGeometry,
  filename: string = 'model.stl',
  fileSize: number = 0
): ModelStats {
  // Ensure bounding box is calculated
  geometry.computeBoundingBox()
  const bbox = geometry.boundingBox || new THREE.Box3()

  const min: Vector3D = { x: bbox.min.x, y: bbox.min.y, z: bbox.min.z }
  const max: Vector3D = { x: bbox.max.x, y: bbox.max.y, z: bbox.max.z }
  const size: Vector3D = {
    x: Math.abs(max.x - min.x),
    y: Math.abs(max.y - min.y),
    z: Math.abs(max.z - min.z),
  }
  const center: Vector3D = {
    x: (min.x + max.x) / 2,
    y: (min.y + max.y) / 2,
    z: (min.z + max.z) / 2,
  }

  const pos = geometry.attributes.position
  const index = geometry.index

  let triangleCount = 0
  let vertexCount = pos ? pos.count : 0
  let totalVolumeMm3 = 0
  let totalAreaMm2 = 0

  const p1 = new THREE.Vector3()
  const p2 = new THREE.Vector3()
  const p3 = new THREE.Vector3()
  const vA = new THREE.Vector3()
  const vB = new THREE.Vector3()
  const cross = new THREE.Vector3()

  // For checking watertightness: track edges
  // In STL meshes, vertices often duplicate without index. We'll quantize coords to catch duplicate vertices.
  const edgeMap = new Map<string, number>()
  const quantize = (v: THREE.Vector3) => {
    // Quantize to 0.001 mm to avoid floating-point mismatch
    const qx = Math.round(v.x * 1000)
    const qy = Math.round(v.y * 1000)
    const qz = Math.round(v.z * 1000)
    return `${qx},${qy},${qz}`
  }

  const getEdgeKey = (k1: string, k2: string) => {
    return k1 < k2 ? `${k1}#${k2}` : `${k2}#${k1}`
  }

  if (index) {
    triangleCount = index.count / 3
    for (let i = 0; i < index.count; i += 3) {
      const i1 = index.getX(i)
      const i2 = index.getX(i + 1)
      const i3 = index.getX(i + 2)

      p1.fromBufferAttribute(pos, i1)
      p2.fromBufferAttribute(pos, i2)
      p3.fromBufferAttribute(pos, i3)

      // Signed volume of tetrahedron formed with origin (0,0,0)
      totalVolumeMm3 += signedVolumeOfTriangle(p1, p2, p3)

      // Surface area
      vA.subVectors(p2, p1)
      vB.subVectors(p3, p1)
      cross.crossVectors(vA, vB)
      totalAreaMm2 += cross.length() * 0.5

      // Edges for manifold check
      const k1 = quantize(p1)
      const k2 = quantize(p2)
      const k3 = quantize(p3)
      const e1 = getEdgeKey(k1, k2)
      const e2 = getEdgeKey(k2, k3)
      const e3 = getEdgeKey(k3, k1)
      edgeMap.set(e1, (edgeMap.get(e1) || 0) + 1)
      edgeMap.set(e2, (edgeMap.get(e2) || 0) + 1)
      edgeMap.set(e3, (edgeMap.get(e3) || 0) + 1)
    }
  } else if (pos) {
    triangleCount = pos.count / 3
    for (let i = 0; i < pos.count; i += 3) {
      p1.fromBufferAttribute(pos, i)
      p2.fromBufferAttribute(pos, i + 1)
      p3.fromBufferAttribute(pos, i + 2)

      totalVolumeMm3 += signedVolumeOfTriangle(p1, p2, p3)

      vA.subVectors(p2, p1)
      vB.subVectors(p3, p1)
      cross.crossVectors(vA, vB)
      totalAreaMm2 += cross.length() * 0.5

      const k1 = quantize(p1)
      const k2 = quantize(p2)
      const k3 = quantize(p3)
      const e1 = getEdgeKey(k1, k2)
      const e2 = getEdgeKey(k2, k3)
      const e3 = getEdgeKey(k3, k1)
      edgeMap.set(e1, (edgeMap.get(e1) || 0) + 1)
      edgeMap.set(e2, (edgeMap.get(e2) || 0) + 1)
      edgeMap.set(e3, (edgeMap.get(e3) || 0) + 1)
    }
  }

  totalVolumeMm3 = Math.abs(totalVolumeMm3)
  const volumeCm3 = totalVolumeMm3 / 1000.0
  const areaCm2 = totalAreaMm2 / 100.0

  // Check if watertight: in a closed manifold, each edge belongs to exactly 2 triangles
  let isWatertight = triangleCount > 0
  if (triangleCount > 0) {
    for (const count of edgeMap.values()) {
      if (count !== 2) {
        isWatertight = false
        break
      }
    }
  }

  return {
    name: filename,
    triangleCount,
    vertexCount,
    dimensions: size,
    volume: volumeCm3,
    volumeMm3: totalVolumeMm3,
    surfaceArea: areaCm2,
    surfaceAreaMm2: totalAreaMm2,
    isWatertight,
    fileSize,
    bbox: {
      min,
      max,
      size,
      center,
    },
  }
}

/**
 * Calculates signed volume of a single triangle with respect to origin.
 */
function signedVolumeOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
  return (
    p1.dot(p2.clone().cross(p3)) / 6.0
  )
}

/**
 * Snaps a 3D intersection point to the closest vertex of the triangle face or edge.
 */
export function getSnappedPoint(
  intersection: THREE.Intersection,
  camera: THREE.Camera,
  canvasRect: DOMRect,
  snapTolerancePx: number = 20
): { point: THREE.Vector3; isSnapped: boolean; snapType: 'vertex' | 'surface' } {
  if (!intersection.face || !intersection.object) {
    return { point: intersection.point.clone(), isSnapped: false, snapType: 'surface' }
  }

  const mesh = intersection.object as THREE.Mesh
  const geometry = mesh.geometry
  const pos = geometry.attributes.position

  if (!pos) {
    return { point: intersection.point.clone(), isSnapped: false, snapType: 'surface' }
  }

  // Get triangle vertices in world coordinates
  const a = intersection.face.a
  const b = intersection.face.b
  const c = intersection.face.c

  const vA = new THREE.Vector3().fromBufferAttribute(pos, a).applyMatrix4(mesh.matrixWorld)
  const vB = new THREE.Vector3().fromBufferAttribute(pos, b).applyMatrix4(mesh.matrixWorld)
  const vC = new THREE.Vector3().fromBufferAttribute(pos, c).applyMatrix4(mesh.matrixWorld)

  // Project vertices to screen coordinates
  const projectToScreen = (v: THREE.Vector3) => {
    const cloned = v.clone().project(camera)
    const x = ((cloned.x + 1) * canvasRect.width) / 2
    const y = ((-cloned.y + 1) * canvasRect.height) / 2
    return { x, y }
  }

  const hitScreen = projectToScreen(intersection.point)
  const sA = projectToScreen(vA)
  const sB = projectToScreen(vB)
  const sC = projectToScreen(vC)

  const distA = Math.hypot(hitScreen.x - sA.x, hitScreen.y - sA.y)
  const distB = Math.hypot(hitScreen.x - sB.x, hitScreen.y - sB.y)
  const distC = Math.hypot(hitScreen.x - sC.x, hitScreen.y - sC.y)

  const minDist = Math.min(distA, distB, distC)

  if (minDist <= snapTolerancePx) {
    if (minDist === distA) return { point: vA, isSnapped: true, snapType: 'vertex' }
    if (minDist === distB) return { point: vB, isSnapped: true, snapType: 'vertex' }
    return { point: vC, isSnapped: true, snapType: 'vertex' }
  }

  // Also check 3D world distance threshold (e.g. 1.5mm)
  const worldDistA = intersection.point.distanceTo(vA)
  const worldDistB = intersection.point.distanceTo(vB)
  const worldDistC = intersection.point.distanceTo(vC)
  const minWorldDist = Math.min(worldDistA, worldDistB, worldDistC)

  if (minWorldDist < 1.0) {
    if (minWorldDist === worldDistA) return { point: vA, isSnapped: true, snapType: 'vertex' }
    if (minWorldDist === worldDistB) return { point: vB, isSnapped: true, snapType: 'vertex' }
    return { point: vC, isSnapped: true, snapType: 'vertex' }
  }

  return { point: intersection.point.clone(), isSnapped: false, snapType: 'surface' }
}

/**
 * Format dimension with unit
 */
export function formatMm(val: number, decimals: number = 2): string {
  return `${val.toFixed(decimals)} mm`
}

/**
 * Format volume
 */
export function formatVolume(valCm3: number): string {
  if (valCm3 >= 1000) {
    return `${(valCm3 / 1000).toFixed(2)} l (${valCm3.toFixed(1)} cm³)`
  }
  return `${valCm3.toFixed(2)} cm³ (${(valCm3 * 1000).toFixed(0)} mm³)`
}

/**
 * Format bytes
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}


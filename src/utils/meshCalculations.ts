import * as THREE from 'three'
import type { ModelStats, Vector3D } from '../types'

export type SnapType = 'vertex' | 'edge' | 'face-center' | 'surface'

export interface EdgeSegment {
  start: THREE.Vector3
  end: THREE.Vector3
}

export interface SnapInfo {
  point: THREE.Vector3
  isSnapped: boolean
  snapType: SnapType
  normal: THREE.Vector3
  edge?: EdgeSegment
}

/**
 * Calculates volume, surface area, bounding box, triangle counts and watertightness of a BufferGeometry.
 */
export function calculateModelStats(
  geometry: THREE.BufferGeometry,
  filename: string = 'model.stl',
  fileSize: number = 0
): ModelStats {
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

  const edgeMap = new Map<string, number>()
  const quantize = (v: THREE.Vector3) => {
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

function signedVolumeOfTriangle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3): number {
  return p1.dot(p2.clone().cross(p3)) / 6.0
}

/**
 * Snaps a 3D intersection point to the closest vertex, edge segment, or face center of the triangle.
 */
export function getSnappedPoint(
  intersection: THREE.Intersection,
  camera: THREE.Camera,
  canvasRect: DOMRect,
  options: {
    snapToVertex: boolean
    snapToEdge: boolean
    snapToFaceCenter: boolean
    snapTolerancePx: number
  } = {
    snapToVertex: true,
    snapToEdge: true,
    snapToFaceCenter: false,
    snapTolerancePx: 20,
  }
): SnapInfo {
  const defaultNormal = new THREE.Vector3(0, 0, 1)

  if (!intersection.face || !intersection.object) {
    return {
      point: intersection.point.clone(),
      isSnapped: false,
      snapType: 'surface',
      normal: defaultNormal,
    }
  }

  const mesh = intersection.object as THREE.Mesh
  const geometry = mesh.geometry
  const pos = geometry.attributes.position

  // Normal in world coordinates
  const worldNormal = intersection.face.normal.clone().transformDirection(mesh.matrixWorld).normalize()

  if (!pos) {
    return {
      point: intersection.point.clone(),
      isSnapped: false,
      snapType: 'surface',
      normal: worldNormal,
    }
  }

  const a = intersection.face.a
  const b = intersection.face.b
  const c = intersection.face.c

  const vA = new THREE.Vector3().fromBufferAttribute(pos, a).applyMatrix4(mesh.matrixWorld)
  const vB = new THREE.Vector3().fromBufferAttribute(pos, b).applyMatrix4(mesh.matrixWorld)
  const vC = new THREE.Vector3().fromBufferAttribute(pos, c).applyMatrix4(mesh.matrixWorld)

  const projectToScreen = (v: THREE.Vector3) => {
    const cloned = v.clone().project(camera)
    const x = ((cloned.x + 1) * canvasRect.width) / 2
    const y = ((-cloned.y + 1) * canvasRect.height) / 2
    return { x, y }
  }

  const hitScreen = projectToScreen(intersection.point)

  // 1. Vertex Snapping (Highest priority)
  if (options.snapToVertex) {
    const sA = projectToScreen(vA)
    const sB = projectToScreen(vB)
    const sC = projectToScreen(vC)

    const distA = Math.hypot(hitScreen.x - sA.x, hitScreen.y - sA.y)
    const distB = Math.hypot(hitScreen.x - sB.x, hitScreen.y - sB.y)
    const distC = Math.hypot(hitScreen.x - sC.x, hitScreen.y - sC.y)

    const minDist = Math.min(distA, distB, distC)
    if (minDist <= options.snapTolerancePx) {
      if (minDist === distA) return { point: vA, isSnapped: true, snapType: 'vertex', normal: worldNormal }
      if (minDist === distB) return { point: vB, isSnapped: true, snapType: 'vertex', normal: worldNormal }
      return { point: vC, isSnapped: true, snapType: 'vertex', normal: worldNormal }
    }
  }

  // Helper to project point P onto line segment [p1, p2]
  const projectOnSegment = (p: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3) => {
    const seg = new THREE.Vector3().subVectors(p2, p1)
    const lenSq = seg.lengthSq()
    if (lenSq < 1e-6) return { pt: p1.clone(), t: 0 }
    const t = Math.max(0, Math.min(1, new THREE.Vector3().subVectors(p, p1).dot(seg) / lenSq))
    return { pt: p1.clone().addScaledVector(seg, t), t }
  }

  // 2. Edge Snapping (Magnet to entire edge)
  if (options.snapToEdge) {
    const edges = [
      { start: vA, end: vB },
      { start: vB, end: vC },
      { start: vC, end: vA },
    ]

    let bestEdgePt: THREE.Vector3 | null = null
    let bestEdgeDist = Infinity
    let bestEdge: EdgeSegment | null = null

    for (const edge of edges) {
      const proj = projectOnSegment(intersection.point, edge.start, edge.end)
      const sPt = projectToScreen(proj.pt)
      const screenDist = Math.hypot(hitScreen.x - sPt.x, hitScreen.y - sPt.y)

      if (screenDist < bestEdgeDist) {
        bestEdgeDist = screenDist
        bestEdgePt = proj.pt
        bestEdge = edge
      }
    }

    if (bestEdgePt && bestEdge && bestEdgeDist <= options.snapTolerancePx) {
      return {
        point: bestEdgePt,
        isSnapped: true,
        snapType: 'edge',
        normal: worldNormal,
        edge: bestEdge,
      }
    }
  }

  // 3. Face Center Snapping
  if (options.snapToFaceCenter) {
    const center = new THREE.Vector3().add(vA).add(vB).add(vC).divideScalar(3)
    const sCenter = projectToScreen(center)
    const distCenter = Math.hypot(hitScreen.x - sCenter.x, hitScreen.y - sCenter.y)

    if (distCenter <= options.snapTolerancePx) {
      return {
        point: center,
        isSnapped: true,
        snapType: 'face-center',
        normal: worldNormal,
      }
    }
  }

  return {
    point: intersection.point.clone(),
    isSnapped: false,
    snapType: 'surface',
    normal: worldNormal,
  }
}

/**
 * Measures wall thickness by raycasting perpendicularly inwards (-normal) from the surface point.
 */
export function measureWallThickness(
  surfacePoint: THREE.Vector3,
  surfaceNormal: THREE.Vector3,
  mesh: THREE.Mesh
): { endPoint: THREE.Vector3; thickness: number; backNormal: THREE.Vector3 } | null {
  // Ray origin slightly inside the material to prevent self-intersection with the front face
  const rayDir = surfaceNormal.clone().negate().normalize()
  const rayOrigin = surfacePoint.clone().addScaledVector(rayDir, 0.001)

  const raycaster = new THREE.Raycaster(rayOrigin, rayDir, 0.001, 10000)

  // Ensure double sided material for raycaster to detect inside faces
  const oldSide = Array.isArray(mesh.material)
    ? mesh.material.map((m) => m.side)
    : mesh.material.side

  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m) => (m.side = THREE.DoubleSide))
  } else {
    mesh.material.side = THREE.DoubleSide
  }

  const hits = raycaster.intersectObject(mesh, false)

  // Restore material side
  if (Array.isArray(mesh.material)) {
    mesh.material.forEach((m, idx) => (m.side = (oldSide as THREE.Side[])[idx]))
  } else {
    mesh.material.side = oldSide as THREE.Side
  }

  if (hits.length > 0) {
    const hit = hits[0]
    const thickness = surfacePoint.distanceTo(hit.point)
    const backNormal = hit.face
      ? hit.face.normal.clone().transformDirection(mesh.matrixWorld).normalize()
      : rayDir.clone().negate()

    return {
      endPoint: hit.point,
      thickness,
      backNormal,
    }
  }

  return null
}

/**
 * Calculates perpendicular normal distance and angle between two surface faces/planes.
 */
export function calculateFaceToFace(
  p1: THREE.Vector3,
  n1: THREE.Vector3,
  p2: THREE.Vector3,
  n2: THREE.Vector3
): {
  directDistance: number
  perpendicularDistance: number
  angleDegrees: number
  isParallel: boolean
  projectedPoint: THREE.Vector3
} {
  const directDistance = p1.distanceTo(p2)
  const diff = new THREE.Vector3().subVectors(p2, p1)

  // Perpendicular distance is projection of vector (p2 - p1) onto normal n1
  const perpendicularDistance = Math.abs(diff.dot(n1))

  // Angle between the normals
  const dotNormals = THREE.MathUtils.clamp(n1.dot(n2), -1, 1)
  const angleRad = Math.acos(dotNormals)
  const angleDegrees = THREE.MathUtils.radToDeg(angleRad)

  // Parallel if angle is near 0 deg or 180 deg
  const isParallel = angleDegrees < 2.0 || angleDegrees > 178.0

  // Projected point on plane 1 opposite p2
  const projectedPoint = p2.clone().addScaledVector(n1, -diff.dot(n1))

  return {
    directDistance,
    perpendicularDistance,
    angleDegrees,
    isParallel,
    projectedPoint,
  }
}

/**
 * Calculates the shortest distance and closest points between two 3D line segments (edges).
 */
export function calculateClosestPointsBetweenSegments(
  a1: THREE.Vector3,
  b1: THREE.Vector3,
  a2: THREE.Vector3,
  b2: THREE.Vector3
): {
  closest1: THREE.Vector3
  closest2: THREE.Vector3
  distance: number
  isParallel: boolean
  angleDegrees: number
} {
  const u = new THREE.Vector3().subVectors(b1, a1)
  const v = new THREE.Vector3().subVectors(b2, a2)
  const w = new THREE.Vector3().subVectors(a1, a2)

  const a = u.dot(u)
  const b = u.dot(v)
  const c = v.dot(v)
  const d = u.dot(w)
  const e = v.dot(w)

  const D = a * c - b * b
  let sc = 0
  let sN = 0
  let sD = D
  let tc = 0
  let tN = 0
  let tD = D

  if (D < 1e-6) {
    // Segments are almost parallel
    sN = 0.0
    sD = 1.0
    tN = e
    tD = c
  } else {
    sN = b * e - c * d
    tN = a * e - b * d
    if (sN < 0.0) {
      sN = 0.0
      tN = e
      tD = c
    } else if (sN > sD) {
      sN = sD
      tN = e + b
      tD = c
    }
  }

  if (tN < 0.0) {
    tc = 0.0
    if (-d < 0.0) sc = 0.0
    else if (-d > a) sc = 1.0
    else sc = -d / a
  } else if (tN > tD) {
    tc = 1.0
    if (-d + b < 0.0) sc = 0.0
    else if (-d + b > a) sc = 1.0
    else sc = (-d + b) / a
  } else {
    tc = tN / tD
    sc = Math.abs(sN) < 1e-6 ? 0.0 : sN / sD
  }

  const closest1 = new THREE.Vector3().addVectors(a1, u.clone().multiplyScalar(sc))
  const closest2 = new THREE.Vector3().addVectors(a2, v.clone().multiplyScalar(tc))
  const distance = closest1.distanceTo(closest2)

  const lenU = u.length()
  const lenV = v.length()
  let angleDegrees = 0
  let isParallel = false

  if (lenU > 1e-6 && lenV > 1e-6) {
    const dot = THREE.MathUtils.clamp(u.dot(v) / (lenU * lenV), -1, 1)
    angleDegrees = THREE.MathUtils.radToDeg(Math.acos(Math.abs(dot)))
    isParallel = angleDegrees < 1.0
  }

  return {
    closest1,
    closest2,
    distance,
    isParallel,
    angleDegrees,
  }
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

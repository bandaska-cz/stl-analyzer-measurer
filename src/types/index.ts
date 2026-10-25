export interface Vector3D {
  x: number
  y: number
  z: number
}

export interface Measurement {
  id: string
  name: string
  start: Vector3D
  end: Vector3D
  distance: number
  deltaX: number
  deltaY: number
  deltaZ: number
  color: string
  visible: boolean
  createdAt: number
}

export interface BoundingBoxInfo {
  min: Vector3D
  max: Vector3D
  size: Vector3D
  center: Vector3D
}

export interface ModelStats {
  name: string
  triangleCount: number
  vertexCount: number
  dimensions: Vector3D // in mm
  volume: number // in cm3
  volumeMm3: number // in mm3
  surfaceArea: number // in cm2
  surfaceAreaMm2: number // in mm2
  isWatertight: boolean
  fileSize: number // in bytes
  bbox: BoundingBoxInfo
}

export type RenderMode = 'solid' | 'wireframe' | 'solid-wireframe' | 'matcap' | 'xray' | 'normals'

export type CameraPreset = 'iso' | 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right'

export interface RenderSettings {
  renderMode: RenderMode
  modelColor: string
  showGrid: boolean
  gridSize: number // e.g. 220, 256, 300 mm
  showAxes: boolean
  showBoundingBox: boolean
  showBoxDimensions: boolean
  snapToVertex: boolean
  snapTolerancePx: number
  orthographic: boolean
}

export interface MaterialInfo {
  id: string
  name: string
  density: number // g/cm3
  color: string
}

export const MATERIAL_PRESETS: MaterialInfo[] = [
  { id: 'pla', name: 'PLA (1.24 g/cm³)', density: 1.24, color: '#38bdf8' },
  { id: 'petg', name: 'PETG (1.27 g/cm³)', density: 1.27, color: '#34d399' },
  { id: 'abs', name: 'ABS (1.04 g/cm³)', density: 1.04, color: '#f59e0b' },
  { id: 'tpu', name: 'TPU 95A (1.21 g/cm³)', density: 1.21, color: '#a855f7' },
  { id: 'resin', name: 'Standard Resin (1.15 g/cm³)', density: 1.15, color: '#ec4899' },
  { id: 'aluminum', name: 'Hliník (2.70 g/cm³)', density: 2.70, color: '#94a3b8' },
  { id: 'steel', name: 'Ocel (7.85 g/cm³)', density: 7.85, color: '#64748b' },
]

export const MEASUREMENT_COLORS = [
  '#06b6d4', // cyan
  '#f97316', // orange
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#eab308', // yellow
  '#3b82f6', // blue
  '#14b8a6', // teal
]


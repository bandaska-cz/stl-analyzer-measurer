import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type {
  CameraPreset,
  Measurement,
  MeasureMode,
  ModelStats,
  RenderSettings,
} from '../../types'
import {
  getSnappedPoint,
  measureWallThickness,
  calculateFaceToFace,
  calculateClosestPointsBetweenSegments,
  type SnapInfo,
  type EdgeSegment,
} from '../../utils/meshCalculations'
import { ViewGizmo } from './ViewGizmo'
import { CanvasToolbar } from './CanvasToolbar'
import { X } from 'lucide-react'

interface ProjectedBadge {
  id: string
  x: number
  y: number
  text: string
  subtext?: string
  color: string
  isSelected: boolean
  isLive?: boolean
}

interface BBoxBadge {
  axis: 'X' | 'Y' | 'Z'
  x: number
  y: number
  text: string
}

interface StartPointData {
  point: THREE.Vector3
  normal: THREE.Vector3
  edge?: EdgeSegment
}

interface ThreeCanvasProps {
  geometry: THREE.BufferGeometry | null
  stats: ModelStats | null
  settings: RenderSettings
  onChangeSettings: (settings: Partial<RenderSettings>) => void
  measurements: Measurement[]
  selectedMeasurementId: string | null
  onSelectMeasurement: (id: string | null) => void
  onAddMeasurement: (measurement: Measurement) => void
  onDeleteMeasurement: (id: string) => void
  isMeasuringActive: boolean
  setIsMeasuringActive: (active: boolean) => void
  measureMode: MeasureMode
  setMeasureMode: (mode: MeasureMode) => void
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  geometry,
  stats,
  settings,
  onChangeSettings,
  measurements,
  selectedMeasurementId,
  onSelectMeasurement,
  onAddMeasurement,
  onDeleteMeasurement,
  isMeasuringActive,
  setIsMeasuringActive,
  measureMode,
  setMeasureMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Internal Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraPerspRef = useRef<THREE.PerspectiveCamera | null>(null)
  const cameraOrthoRef = useRef<THREE.OrthographicCamera | null>(null)
  const activeCameraRef = useRef<THREE.Camera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelMeshRef = useRef<THREE.Mesh | null>(null)
  const edgesLineRef = useRef<THREE.LineSegments | null>(null)
  const bboxHelperRef = useRef<THREE.Box3Helper | null>(null)
  const gridHelperRef = useRef<THREE.GridHelper | null>(null)
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null)

  // Dynamic measurement 3D objects group
  const measurementsGroupRef = useRef<THREE.Group | null>(null)
  const liveGuideGroupRef = useRef<THREE.Group | null>(null)
  const snapIndicatorRef = useRef<THREE.Mesh | null>(null)
  const hoverEdgeLineRef = useRef<THREE.Line | null>(null)
  const startEdgeLineRef = useRef<THREE.Line | null>(null)

  // Interaction state
  const [startPointData, setStartPointData] = useState<StartPointData | null>(null)
  const [hoverSnap, setHoverSnap] = useState<SnapInfo | null>(null)
  const [mouseScreenPos, setMouseScreenPos] = useState<{ x: number; y: number } | null>(null)

  // Projected 2D badges for measurements & bounding box
  const [projectedBadges, setProjectedBadges] = useState<ProjectedBadge[]>([])
  const [liveBadge, setLiveBadge] = useState<ProjectedBadge | null>(null)
  const [bboxBadges, setBboxBadges] = useState<BBoxBadge[]>([])

  // Setup Three.js scene once
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#0c101b')
    sceneRef.current = scene

    // Camera - Perspective
    const persp = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000)
    persp.position.set(120, -120, 100)
    persp.up.set(0, 0, 1)
    cameraPerspRef.current = persp

    // Camera - Orthographic
    const aspect = width / height
    const frustumSize = 180
    const ortho = new THREE.OrthographicCamera(
      (frustumSize * aspect) / -2,
      (frustumSize * aspect) / 2,
      frustumSize / 2,
      frustumSize / -2,
      0.1,
      5000
    )
    ortho.position.copy(persp.position)
    ortho.up.set(0, 0, 1)
    cameraOrthoRef.current = ortho

    const activeCamera = settings.orthographic ? ortho : persp
    activeCameraRef.current = activeCamera

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    rendererRef.current = renderer

    // Controls
    const controls = new OrbitControls(activeCamera, canvasRef.current)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.target.set(0, 0, 15)
    controls.update()
    controlsRef.current = controls

    // Lighting (Studio CAD setup)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4)
    keyLight.position.set(150, -120, 200)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x90b0e0, 0.7)
    fillLight.position.set(-150, 120, 100)
    scene.add(fillLight)

    const bottomFillLight = new THREE.DirectionalLight(0x506080, 0.4)
    bottomFillLight.position.set(0, 0, -100)
    scene.add(bottomFillLight)

    // Build Plate Grid
    const grid = new THREE.GridHelper(settings.gridSize, settings.gridSize / 10, 0x4f46e5, 0x1e293b)
    grid.rotation.x = Math.PI / 2
    grid.position.z = -0.01
    scene.add(grid)
    gridHelperRef.current = grid

    // Coordinate Axes Helper
    const axes = new THREE.AxesHelper(30)
    axes.position.set(-settings.gridSize / 2, -settings.gridSize / 2, 0)
    scene.add(axes)
    axesHelperRef.current = axes

    // Measurement & Guide groups
    const measurementsGroup = new THREE.Group()
    scene.add(measurementsGroup)
    measurementsGroupRef.current = measurementsGroup

    const liveGuideGroup = new THREE.Group()
    scene.add(liveGuideGroup)
    liveGuideGroupRef.current = liveGuideGroup

    // Snapping indicator (Glowing sphere)
    const snapSphereGeo = new THREE.SphereGeometry(1.2, 16, 16)
    const snapSphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      depthTest: false,
      transparent: true,
      opacity: 0.95,
    })
    const snapIndicator = new THREE.Mesh(snapSphereGeo, snapSphereMat)
    snapIndicator.renderOrder = 999
    snapIndicator.visible = false
    scene.add(snapIndicator)
    snapIndicatorRef.current = snapIndicator

    // Hovered edge highlight line
    const hoverEdgeGeo = new THREE.BufferGeometry()
    const hoverEdgeMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      linewidth: 3,
      depthTest: false,
    })
    const hoverEdgeLine = new THREE.Line(hoverEdgeGeo, hoverEdgeMat)
    hoverEdgeLine.renderOrder = 998
    hoverEdgeLine.visible = false
    scene.add(hoverEdgeLine)
    hoverEdgeLineRef.current = hoverEdgeLine

    // Start edge highlight line
    const startEdgeGeo = new THREE.BufferGeometry()
    const startEdgeMat = new THREE.LineBasicMaterial({
      color: 0x06b6d4,
      linewidth: 3,
      depthTest: false,
    })
    const startEdgeLine = new THREE.Line(startEdgeGeo, startEdgeMat)
    startEdgeLine.renderOrder = 997
    startEdgeLine.visible = false
    scene.add(startEdgeLine)
    startEdgeLineRef.current = startEdgeLine

    // Animation loop
    let animationFrameId: number
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, activeCameraRef.current || persp)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current) return
      const w = containerRef.current.clientWidth
      const h = containerRef.current.clientHeight
      const asp = w / h

      persp.aspect = asp
      persp.updateProjectionMatrix()

      ortho.left = (frustumSize * asp) / -2
      ortho.right = (frustumSize * asp) / 2
      ortho.top = frustumSize / 2
      ortho.bottom = frustumSize / -2
      ortho.updateProjectionMatrix()

      rendererRef.current.setSize(w, h)
    }

    const resizeObserver = new ResizeObserver(handleResize)
    resizeObserver.observe(containerRef.current)

    return () => {
      cancelAnimationFrame(animationFrameId)
      resizeObserver.disconnect()
      controls.dispose()
      renderer.dispose()
    }
  }, [])

  // Camera projection toggle
  useEffect(() => {
    if (!cameraPerspRef.current || !cameraOrthoRef.current || !controlsRef.current) return
    const persp = cameraPerspRef.current
    const ortho = cameraOrthoRef.current

    if (settings.orthographic) {
      ortho.position.copy(persp.position)
      ortho.quaternion.copy(persp.quaternion)
      ortho.zoom = persp.position.length() > 0 ? 300 / persp.position.length() : 1
      ortho.updateProjectionMatrix()
      activeCameraRef.current = ortho
      controlsRef.current.object = ortho
    } else {
      persp.position.copy(ortho.position)
      persp.quaternion.copy(ortho.quaternion)
      persp.updateProjectionMatrix()
      activeCameraRef.current = persp
      controlsRef.current.object = persp
    }
    controlsRef.current.update()
  }, [settings.orthographic])

  // Update Grid & Axes
  useEffect(() => {
    if (gridHelperRef.current) gridHelperRef.current.visible = settings.showGrid
    if (axesHelperRef.current) axesHelperRef.current.visible = settings.showAxes
  }, [settings.showGrid, settings.showAxes])

  // Update Model Mesh & Material
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    if (modelMeshRef.current) {
      scene.remove(modelMeshRef.current)
      modelMeshRef.current.geometry.dispose()
      if (Array.isArray(modelMeshRef.current.material)) {
        modelMeshRef.current.material.forEach((m) => m.dispose())
      } else {
        modelMeshRef.current.material.dispose()
      }
      modelMeshRef.current = null
    }

    if (edgesLineRef.current) {
      scene.remove(edgesLineRef.current)
      edgesLineRef.current.geometry.dispose()
      if (Array.isArray(edgesLineRef.current.material)) {
        edgesLineRef.current.material.forEach((m) => m.dispose())
      } else {
        edgesLineRef.current.material.dispose()
      }
      edgesLineRef.current = null
    }

    if (bboxHelperRef.current) {
      scene.remove(bboxHelperRef.current)
      bboxHelperRef.current = null
    }

    if (!geometry) return

    let material: THREE.Material
    switch (settings.renderMode) {
      case 'wireframe':
        material = new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true })
        break
      case 'matcap':
        material = new THREE.MeshNormalMaterial({ flatShading: false })
        break
      case 'xray':
        material = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.38,
          roughness: 0.2,
          metalness: 0.1,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        break
      case 'normals':
        material = new THREE.MeshNormalMaterial({ flatShading: true })
        break
      case 'solid':
      case 'solid-wireframe':
      default:
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(settings.modelColor || '#3b82f6'),
          roughness: 0.45,
          metalness: 0.15,
          flatShading: false,
          side: THREE.DoubleSide,
        })
        break
    }

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    scene.add(mesh)
    modelMeshRef.current = mesh

    if (settings.renderMode === 'solid-wireframe') {
      const edgesGeo = new THREE.EdgesGeometry(geometry, 24)
      const edgesMat = new THREE.LineBasicMaterial({
        color: 0x0f172a,
        linewidth: 1,
        transparent: true,
        opacity: 0.45,
      })
      const edges = new THREE.LineSegments(edgesGeo, edgesMat)
      mesh.add(edges)
      edgesLineRef.current = edges
    }

    if (settings.showBoundingBox && stats) {
      geometry.computeBoundingBox()
      if (geometry.boundingBox) {
        const boxHelper = new THREE.Box3Helper(geometry.boundingBox, new THREE.Color(0x38bdf8))
        scene.add(boxHelper)
        bboxHelperRef.current = boxHelper
      }
    }
  }, [geometry, settings.renderMode, settings.modelColor, settings.showBoundingBox, stats])

  // Center camera on model
  const resetCamera = useCallback(() => {
    if (!geometry || !activeCameraRef.current || !controlsRef.current) return
    geometry.computeBoundingBox()
    const bbox = geometry.boundingBox
    if (!bbox) return

    const size = new THREE.Vector3()
    bbox.getSize(size)
    const center = new THREE.Vector3()
    bbox.getCenter(center)

    const maxDim = Math.max(size.x, size.y, size.z)
    const distance = Math.max(maxDim * 2.2, 50)

    const camera = activeCameraRef.current
    camera.position.set(center.x + distance * 0.8, center.y - distance * 0.8, center.z + distance * 0.6)
    controlsRef.current.target.copy(center)
    controlsRef.current.update()
  }, [geometry])

  // Preset Views
  const setCameraPreset = useCallback(
    (preset: CameraPreset) => {
      if (!geometry || !activeCameraRef.current || !controlsRef.current) return
      geometry.computeBoundingBox()
      const bbox = geometry.boundingBox || new THREE.Box3()
      const center = new THREE.Vector3()
      bbox.getCenter(center)
      const size = new THREE.Vector3()
      bbox.getSize(size)
      const maxDim = Math.max(size.x, size.y, size.z)
      const dist = Math.max(maxDim * 2.4, 60)

      const camera = activeCameraRef.current
      controlsRef.current.target.copy(center)

      switch (preset) {
        case 'top':
          camera.position.set(center.x, center.y, center.z + dist)
          break
        case 'bottom':
          camera.position.set(center.x, center.y, center.z - dist)
          break
        case 'front':
          camera.position.set(center.x, center.y - dist, center.z)
          break
        case 'back':
          camera.position.set(center.x, center.y + dist, center.z)
          break
        case 'left':
          camera.position.set(center.x - dist, center.y, center.z)
          break
        case 'right':
          camera.position.set(center.x + dist, center.y, center.z)
          break
        case 'iso':
        default:
          camera.position.set(center.x + dist * 0.7, center.y - dist * 0.7, center.z + dist * 0.55)
          break
      }
      controlsRef.current.update()
    },
    [geometry]
  )

  // Re-render finished 3D measurements
  useEffect(() => {
    const group = measurementsGroupRef.current
    if (!group) return

    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if ('geometry' in child && (child as THREE.Mesh).geometry) {
        ;(child as THREE.Mesh).geometry.dispose()
      }
    }

    measurements.forEach((m) => {
      if (!m.visible) return

      const isSelected = m.id === selectedMeasurementId
      const p1 = new THREE.Vector3(m.start.x, m.start.y, m.start.z)
      const p2 = new THREE.Vector3(m.end.x, m.end.y, m.end.z)
      const color = new THREE.Color(m.color)
      const highlightColor = isSelected ? 0xffffff : color.getHex()

      const sphereGeo = new THREE.SphereGeometry(isSelected ? 1.5 : 1.1, 16, 16)
      const sphereMat = new THREE.MeshBasicMaterial({
        color: highlightColor,
        depthTest: false,
        transparent: true,
        opacity: 0.95,
      })

      const sphere1 = new THREE.Mesh(sphereGeo, sphereMat)
      sphere1.position.copy(p1)
      sphere1.renderOrder = 900
      group.add(sphere1)

      const sphere2 = new THREE.Mesh(sphereGeo, sphereMat)
      sphere2.position.copy(p2)
      sphere2.renderOrder = 900
      group.add(sphere2)

      const dist = p1.distanceTo(p2)
      if (dist > 0.001) {
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize()
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)

        const cylRadius = isSelected ? 0.6 : 0.35
        const cylGeo = new THREE.CylinderGeometry(cylRadius, cylRadius, dist, 8)
        const cylMat = new THREE.MeshBasicMaterial({
          color: highlightColor,
          depthTest: false,
          transparent: true,
          opacity: 0.9,
        })
        const cyl = new THREE.Mesh(cylGeo, cylMat)
        cyl.position.copy(mid)
        cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
        cyl.renderOrder = 890
        group.add(cyl)

        // Caliper end ticks
        const tickLength = 4
        const arbitrary = Math.abs(dir.z) < 0.99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
        const perp = new THREE.Vector3().crossVectors(dir, arbitrary).normalize().multiplyScalar(tickLength / 2)

        const tickGeo1 = new THREE.BufferGeometry().setFromPoints([p1.clone().add(perp), p1.clone().sub(perp)])
        const tickGeo2 = new THREE.BufferGeometry().setFromPoints([p2.clone().add(perp), p2.clone().sub(perp)])
        const tickMat = new THREE.LineBasicMaterial({
          color: highlightColor,
          depthTest: false,
          linewidth: 2,
        })
        const tickLine1 = new THREE.Line(tickGeo1, tickMat)
        const tickLine2 = new THREE.Line(tickGeo2, tickMat)
        tickLine1.renderOrder = 895
        tickLine2.renderOrder = 895
        group.add(tickLine1)
        group.add(tickLine2)

        if (isSelected && m.type === 'point-to-point') {
          const corner1 = new THREE.Vector3(p2.x, p1.y, p1.z)
          const corner2 = new THREE.Vector3(p2.x, p2.y, p1.z)
          const stepGeo = new THREE.BufferGeometry().setFromPoints([p1, corner1, corner2, p2])
          const stepMat = new THREE.LineDashedMaterial({
            color: 0xf59e0b,
            dashSize: 1.5,
            gapSize: 1,
            depthTest: false,
          })
          const stepLine = new THREE.Line(stepGeo, stepMat)
          stepLine.computeLineDistances()
          stepLine.renderOrder = 880
          group.add(stepLine)
        }
      }
    })
  }, [measurements, selectedMeasurementId])

  // Live guide line when measuring
  useEffect(() => {
    const liveGroup = liveGuideGroupRef.current
    if (!liveGroup) return

    while (liveGroup.children.length > 0) {
      const child = liveGroup.children[0]
      liveGroup.remove(child)
      if ('geometry' in child && (child as THREE.Mesh).geometry) {
        ;(child as THREE.Mesh).geometry.dispose()
      }
    }

    if (!isMeasuringActive || !hoverSnap) return

    // 1. Wall-Thickness mode live preview
    if (measureMode === 'wall-thickness' && modelMeshRef.current) {
      const thicknessResult = measureWallThickness(hoverSnap.point, hoverSnap.normal, modelMeshRef.current)
      if (thicknessResult) {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([hoverSnap.point, thicknessResult.endPoint])
        const lineMat = new THREE.LineBasicMaterial({
          color: 0x38bdf8,
          depthTest: false,
          linewidth: 2,
        })
        const liveLine = new THREE.Line(lineGeo, lineMat)
        liveLine.renderOrder = 950
        liveGroup.add(liveLine)

        const endSphGeo = new THREE.SphereGeometry(1.2, 16, 16)
        const endSphMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, depthTest: false })
        const endSph = new THREE.Mesh(endSphGeo, endSphMat)
        endSph.position.copy(thicknessResult.endPoint)
        endSph.renderOrder = 960
        liveGroup.add(endSph)
      }
    }

    // 2. Point-to-Point, Face-to-Face, Edge-to-Edge with start point placed
    if (startPointData) {
      let targetPt = hoverSnap.point

      if (measureMode === 'edge-to-edge' && startPointData.edge && hoverSnap.edge) {
        const res = calculateClosestPointsBetweenSegments(
          startPointData.edge.start,
          startPointData.edge.end,
          hoverSnap.edge.start,
          hoverSnap.edge.end
        )
        const lineGeo = new THREE.BufferGeometry().setFromPoints([res.closest1, res.closest2])
        const lineMat = new THREE.LineBasicMaterial({ color: 0xf59e0b, depthTest: false, linewidth: 2 })
        const liveLine = new THREE.Line(lineGeo, lineMat)
        liveLine.renderOrder = 950
        liveGroup.add(liveLine)
      } else {
        const lineGeo = new THREE.BufferGeometry().setFromPoints([startPointData.point, targetPt])
        const lineMat = new THREE.LineDashedMaterial({
          color: 0x38bdf8,
          dashSize: 2,
          gapSize: 1,
          depthTest: false,
        })
        const liveLine = new THREE.Line(lineGeo, lineMat)
        liveLine.computeLineDistances()
        liveLine.renderOrder = 950
        liveGroup.add(liveLine)
      }

      const startSphereGeo = new THREE.SphereGeometry(1.4, 16, 16)
      const startSphereMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, depthTest: false })
      const startSphere = new THREE.Mesh(startSphereGeo, startSphereMat)
      startSphere.position.copy(startPointData.point)
      startSphere.renderOrder = 960
      liveGroup.add(startSphere)
    }
  }, [isMeasuringActive, measureMode, startPointData, hoverSnap])

  // Project 3D badges to 2D screen coordinates
  const updateProjectedBadges = useCallback(() => {
    if (!containerRef.current || !activeCameraRef.current) return
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    const camera = activeCameraRef.current

    // Finished measurements
    const badges: ProjectedBadge[] = []
    measurements.forEach((m) => {
      if (!m.visible) return
      const p1 = new THREE.Vector3(m.start.x, m.start.y, m.start.z)
      const p2 = new THREE.Vector3(m.end.x, m.end.y, m.end.z)
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)

      const projected = mid.clone().project(camera)
      if (projected.z < 1) {
        const sx = ((projected.x + 1) * width) / 2
        const sy = ((-projected.y + 1) * height) / 2

        let label = `${m.distance.toFixed(2)} mm`
        if (m.type === 'wall-thickness') {
          label = `📐 Tloušťka: ${m.distance.toFixed(2)} mm`
        } else if (m.type === 'face-to-face') {
          label = `⬜ Stěny: ${(m.perpendicularDistance || m.distance).toFixed(2)} mm`
        } else if (m.type === 'edge-to-edge') {
          label = `📏 Hrany: ${m.distance.toFixed(2)} mm`
        }

        badges.push({
          id: m.id,
          x: sx,
          y: sy,
          text: label,
          subtext: m.name,
          color: m.color,
          isSelected: m.id === selectedMeasurementId,
        })
      }
    })
    setProjectedBadges(badges)

    // Live measurement badge
    if (isMeasuringActive && hoverSnap) {
      if (measureMode === 'wall-thickness' && modelMeshRef.current) {
        const res = measureWallThickness(hoverSnap.point, hoverSnap.normal, modelMeshRef.current)
        if (res) {
          const mid = new THREE.Vector3().addVectors(hoverSnap.point, res.endPoint).multiplyScalar(0.5)
          const projected = mid.clone().project(camera)
          if (projected.z < 1) {
            setLiveBadge({
              id: 'live',
              x: ((projected.x + 1) * width) / 2,
              y: ((-projected.y + 1) * height) / 2,
              text: `📐 Tloušťka stěny: ${res.thickness.toFixed(2)} mm`,
              color: '#38bdf8',
              isSelected: true,
              isLive: true,
            })
          }
        } else {
          setLiveBadge(null)
        }
      } else if (startPointData) {
        let mid = new THREE.Vector3().addVectors(startPointData.point, hoverSnap.point).multiplyScalar(0.5)
        let text = `${startPointData.point.distanceTo(hoverSnap.point).toFixed(2)} mm`

        if (measureMode === 'face-to-face') {
          const res = calculateFaceToFace(startPointData.point, startPointData.normal, hoverSnap.point, hoverSnap.normal)
          text = `⬜ Kolmá vzdálenost: ${res.perpendicularDistance.toFixed(2)} mm (${res.isParallel ? 'Rovnoběžné' : res.angleDegrees.toFixed(1) + '°'})`
        } else if (measureMode === 'edge-to-edge' && startPointData.edge && hoverSnap.edge) {
          const res = calculateClosestPointsBetweenSegments(
            startPointData.edge.start,
            startPointData.edge.end,
            hoverSnap.edge.start,
            hoverSnap.edge.end
          )
          mid = new THREE.Vector3().addVectors(res.closest1, res.closest2).multiplyScalar(0.5)
          text = `📏 Hrany: ${res.distance.toFixed(2)} mm (${res.isParallel ? 'Rovnoběžné' : res.angleDegrees.toFixed(1) + '°'})`
        }

        const projected = mid.clone().project(camera)
        if (projected.z < 1) {
          setLiveBadge({
            id: 'live',
            x: ((projected.x + 1) * width) / 2,
            y: ((-projected.y + 1) * height) / 2,
            text,
            color: '#38bdf8',
            isSelected: true,
            isLive: true,
          })
        } else {
          setLiveBadge(null)
        }
      } else {
        setLiveBadge(null)
      }
    } else {
      setLiveBadge(null)
    }

    // Bounding Box Calipers
    if (settings.showBoxDimensions && stats) {
      const bBadges: BBoxBadge[] = []
      const min = stats.bbox.min
      const max = stats.bbox.max

      const midX = new THREE.Vector3((min.x + max.x) / 2, min.y, min.z).project(camera)
      if (midX.z < 1) {
        bBadges.push({
          axis: 'X',
          x: ((midX.x + 1) * width) / 2,
          y: ((-midX.y + 1) * height) / 2,
          text: `X: ${stats.dimensions.x.toFixed(2)} mm`,
        })
      }

      const midY = new THREE.Vector3(min.x, (min.y + max.y) / 2, min.z).project(camera)
      if (midY.z < 1) {
        bBadges.push({
          axis: 'Y',
          x: ((midY.x + 1) * width) / 2,
          y: ((-midY.y + 1) * height) / 2,
          text: `Y: ${stats.dimensions.y.toFixed(2)} mm`,
        })
      }

      const midZ = new THREE.Vector3(min.x, min.y, (min.z + max.z) / 2).project(camera)
      if (midZ.z < 1) {
        bBadges.push({
          axis: 'Z',
          x: ((midZ.x + 1) * width) / 2,
          y: ((-midZ.y + 1) * height) / 2,
          text: `Z: ${stats.dimensions.z.toFixed(2)} mm`,
        })
      }
      setBboxBadges(bBadges)
    } else {
      setBboxBadges([])
    }
  }, [
    measurements,
    selectedMeasurementId,
    isMeasuringActive,
    measureMode,
    startPointData,
    hoverSnap,
    settings.showBoxDimensions,
    stats,
  ])

  useEffect(() => {
    let animId: number
    const loop = () => {
      animId = requestAnimationFrame(loop)
      updateProjectedBadges()
    }
    loop()
    return () => cancelAnimationFrame(animId)
  }, [updateProjectedBadges])

  // Raycasting & Snapping
  const raycastOnModel = (e: React.PointerEvent<HTMLCanvasElement>): SnapInfo | null => {
    if (!canvasRef.current || !modelMeshRef.current || !activeCameraRef.current) return null

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), activeCameraRef.current)

    const intersects = raycaster.intersectObject(modelMeshRef.current, false)
    if (intersects.length > 0) {
      const hit = intersects[0]
      const snapResult = getSnappedPoint(hit, activeCameraRef.current, rect, {
        snapToVertex: settings.snapToVertex,
        snapToEdge: measureMode === 'edge-to-edge' || settings.snapToEdge,
        snapToFaceCenter: settings.snapToFaceCenter,
        snapTolerancePx: settings.snapTolerancePx,
      })
      return snapResult
    }
    return null
  }

  // Pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setMouseScreenPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    if (!isMeasuringActive) {
      if (snapIndicatorRef.current) snapIndicatorRef.current.visible = false
      if (hoverEdgeLineRef.current) hoverEdgeLineRef.current.visible = false
      setHoverSnap(null)
      return
    }

    const snap = raycastOnModel(e)
    if (snap) {
      setHoverSnap(snap)

      // Reticle position & color
      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.position.copy(snap.point)
        snapIndicatorRef.current.visible = true
        let hex = 0x06b6d4 // Cyan for surface
        if (snap.snapType === 'vertex') hex = 0x10b981 // Green for vertex
        else if (snap.snapType === 'edge') hex = 0xf59e0b // Amber for edge
        else if (snap.snapType === 'face-center') hex = 0xa855f7 // Purple for face center
        ;(snapIndicatorRef.current.material as THREE.MeshBasicMaterial).color.setHex(hex)
      }

      // If snapped to an edge, highlight the edge segment
      if (snap.edge && (snap.snapType === 'edge' || measureMode === 'edge-to-edge')) {
        if (hoverEdgeLineRef.current) {
          hoverEdgeLineRef.current.geometry.setFromPoints([snap.edge.start, snap.edge.end])
          hoverEdgeLineRef.current.visible = true
        }
      } else {
        if (hoverEdgeLineRef.current) hoverEdgeLineRef.current.visible = false
      }
    } else {
      if (snapIndicatorRef.current) snapIndicatorRef.current.visible = false
      if (hoverEdgeLineRef.current) hoverEdgeLineRef.current.visible = false
      setHoverSnap(null)
    }
  }

  // Pointer down (Click to measure)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || !isMeasuringActive) return

    const snap = raycastOnModel(e)
    if (!snap) return

    const colorPalette = ['#06b6d4', '#f97316', '#10b981', '#8b5cf6', '#f43f5e', '#eab308', '#3b82f6']
    const color = colorPalette[measurements.length % colorPalette.length]

    // 1. Wall Thickness Mode (Instant 1-click measure)
    if (measureMode === 'wall-thickness' && modelMeshRef.current) {
      const res = measureWallThickness(snap.point, snap.normal, modelMeshRef.current)
      if (res && res.thickness > 0.01) {
        const deltaX = Math.abs(res.endPoint.x - snap.point.x)
        const deltaY = Math.abs(res.endPoint.y - snap.point.y)
        const deltaZ = Math.abs(res.endPoint.z - snap.point.z)

        const newMeasurement: Measurement = {
          id: `m-${Date.now()}`,
          name: `Tloušťka stěny #${measurements.length + 1}`,
          type: 'wall-thickness',
          start: { x: snap.point.x, y: snap.point.y, z: snap.point.z },
          end: { x: res.endPoint.x, y: res.endPoint.y, z: res.endPoint.z },
          distance: res.thickness,
          deltaX,
          deltaY,
          deltaZ,
          perpendicularDistance: res.thickness,
          details: `Kolmá tloušťka stěny: ${res.thickness.toFixed(2)} mm`,
          color,
          visible: true,
          createdAt: Date.now(),
        }

        onAddMeasurement(newMeasurement)
        onSelectMeasurement(newMeasurement.id)
      }
      return
    }

    // 2. Multi-point modes (Point-to-Point, Face-to-Face, Edge-to-Edge)
    if (!startPointData) {
      // Step 1: establish start point
      setStartPointData({
        point: snap.point,
        normal: snap.normal,
        edge: snap.edge,
      })

      // If edge mode, highlight edge 1
      if (snap.edge && startEdgeLineRef.current) {
        startEdgeLineRef.current.geometry.setFromPoints([snap.edge.start, snap.edge.end])
        startEdgeLineRef.current.visible = true
      }
    } else {
      // Step 2: finish measurement!
      const p1 = startPointData.point
      const p2 = snap.point

      if (measureMode === 'face-to-face') {
        const res = calculateFaceToFace(startPointData.point, startPointData.normal, snap.point, snap.normal)
        if (res.directDistance > 0.01) {
          const newMeasurement: Measurement = {
            id: `m-${Date.now()}`,
            name: `Vzdálenost stěn #${measurements.length + 1}`,
            type: 'face-to-face',
            start: { x: p1.x, y: p1.y, z: p1.z },
            end: { x: p2.x, y: p2.y, z: p2.z },
            distance: res.directDistance,
            deltaX: Math.abs(p2.x - p1.x),
            deltaY: Math.abs(p2.y - p1.y),
            deltaZ: Math.abs(p2.z - p1.z),
            perpendicularDistance: res.perpendicularDistance,
            angleDegrees: res.angleDegrees,
            details: res.isParallel
              ? `Rovnoběžné stěny (rozteč ${res.perpendicularDistance.toFixed(2)} mm)`
              : `Úhel stěn: ${res.angleDegrees.toFixed(1)}° (kolmá vzdálenost: ${res.perpendicularDistance.toFixed(2)} mm)`,
            color,
            visible: true,
            createdAt: Date.now(),
          }
          onAddMeasurement(newMeasurement)
          onSelectMeasurement(newMeasurement.id)
        }
      } else if (measureMode === 'edge-to-edge' && startPointData.edge && snap.edge) {
        const res = calculateClosestPointsBetweenSegments(
          startPointData.edge.start,
          startPointData.edge.end,
          snap.edge.start,
          snap.edge.end
        )
        if (res.distance > 0.001) {
          const newMeasurement: Measurement = {
            id: `m-${Date.now()}`,
            name: `Vzdálenost hran #${measurements.length + 1}`,
            type: 'edge-to-edge',
            start: { x: res.closest1.x, y: res.closest1.y, z: res.closest1.z },
            end: { x: res.closest2.x, y: res.closest2.y, z: res.closest2.z },
            distance: res.distance,
            deltaX: Math.abs(res.closest2.x - res.closest1.x),
            deltaY: Math.abs(res.closest2.y - res.closest1.y),
            deltaZ: Math.abs(res.closest2.z - res.closest1.z),
            angleDegrees: res.angleDegrees,
            details: res.isParallel
              ? `Rovnoběžné hrany (rozteč ${res.distance.toFixed(2)} mm)`
              : `Nejkratší vzdálenost hran (úhel ${res.angleDegrees.toFixed(1)}°)`,
            color,
            visible: true,
            createdAt: Date.now(),
          }
          onAddMeasurement(newMeasurement)
          onSelectMeasurement(newMeasurement.id)
        }
      } else {
        // Point-to-Point
        const distance = p1.distanceTo(p2)
        if (distance > 0.01) {
          const deltaX = Math.abs(p2.x - p1.x)
          const deltaY = Math.abs(p2.y - p1.y)
          const deltaZ = Math.abs(p2.z - p1.z)

          const newMeasurement: Measurement = {
            id: `m-${Date.now()}`,
            name: `Rozměr #${measurements.length + 1}`,
            type: 'point-to-point',
            start: { x: p1.x, y: p1.y, z: p1.z },
            end: { x: p2.x, y: p2.y, z: p2.z },
            distance,
            deltaX,
            deltaY,
            deltaZ,
            color,
            visible: true,
            createdAt: Date.now(),
          }

          onAddMeasurement(newMeasurement)
          onSelectMeasurement(newMeasurement.id)
        }
      }

      setStartPointData(null)
      if (startEdgeLineRef.current) startEdgeLineRef.current.visible = false
    }
  }

  // Escape & M shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setStartPointData(null)
        setIsMeasuringActive(false)
        if (snapIndicatorRef.current) snapIndicatorRef.current.visible = false
        if (hoverEdgeLineRef.current) hoverEdgeLineRef.current.visible = false
        if (startEdgeLineRef.current) startEdgeLineRef.current.visible = false
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMeasuringActive(!isMeasuringActive)
        setStartPointData(null)
        if (startEdgeLineRef.current) startEdgeLineRef.current.visible = false
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isMeasuringActive, setIsMeasuringActive])

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        className={`w-full h-full block ${
          isMeasuringActive
            ? 'cursor-crosshair'
            : 'cursor-grab active:cursor-grabbing'
        }`}
      />

      {/* View Gizmo / Presets */}
      <ViewGizmo
        onSelectPreset={setCameraPreset}
        onResetCamera={resetCamera}
        orthographic={settings.orthographic}
        onToggleOrthographic={() =>
          onChangeSettings({ orthographic: !settings.orthographic })
        }
      />

      {/* Canvas Top Toolbar */}
      <CanvasToolbar
        settings={settings}
        onChangeSettings={onChangeSettings}
        isMeasuringActive={isMeasuringActive}
        onToggleMeasure={() => {
          setIsMeasuringActive(!isMeasuringActive)
          setStartPointData(null)
          if (startEdgeLineRef.current) startEdgeLineRef.current.visible = false
        }}
        measureMode={measureMode}
        setMeasureMode={setMeasureMode}
      />

      {/* Live Active Measuring Status Banner */}
      {isMeasuringActive && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
          <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 rounded-2xl shadow-2xl text-xs text-slate-200">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
            <span>
              {measureMode === 'wall-thickness' && (
                <span>
                  <strong>Režim tloušťky:</strong> Klikněte na stěnu pro okamžité změření kolmé tloušťky materiálu.
                </span>
              )}
              {measureMode === 'face-to-face' && (
                <span>
                  {!startPointData
                    ? 'Krok 1/2: Klikněte na 1. stěnu / rovinu'
                    : 'Krok 2/2: Klikněte na 2. stěnu pro zjištění kolmé vzdálenosti a úhlu'}
                </span>
              )}
              {measureMode === 'edge-to-edge' && (
                <span>
                  {!startPointData
                    ? 'Krok 1/2: Klikněte na 1. hranu modelu'
                    : 'Krok 2/2: Klikněte na 2. hranu pro změření jejich rozteče / nejkratší vzdálenosti'}
                </span>
              )}
              {measureMode === 'point-to-point' && (
                <span>
                  {!startPointData
                    ? 'Krok 1/2: Klikněte na 1. bod na modelu (rohy a hrany se magneticky přichytávají)'
                    : 'Krok 2/2: Klikněte na 2. koncový bod'}
                </span>
              )}
            </span>
            <button
              onClick={() => {
                setStartPointData(null)
                setIsMeasuringActive(false)
                if (startEdgeLineRef.current) startEdgeLineRef.current.visible = false
              }}
              className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[11px] transition-colors"
            >
              Zrušit (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Snap / Hover Tooltip near Cursor */}
      {isMeasuringActive && hoverSnap && mouseScreenPos && (
        <div
          style={{
            transform: `translate(${mouseScreenPos.x + 14}px, ${
              mouseScreenPos.y + 14
            }px)`,
          }}
          className="absolute top-0 left-0 pointer-events-none z-30 bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] shadow-lg flex items-center gap-1.5"
        >
          {hoverSnap.snapType === 'vertex' && (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400 font-semibold">Roh / Vrchol</span>
            </>
          )}
          {hoverSnap.snapType === 'edge' && (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[10px] text-amber-400 font-semibold">Hrana</span>
            </>
          )}
          {hoverSnap.snapType === 'face-center' && (
            <>
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              <span className="text-[10px] text-purple-400 font-semibold">Střed plochy</span>
            </>
          )}
          {hoverSnap.snapType === 'surface' && (
            <>
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-[10px] text-cyan-400 font-semibold">Plocha stěny</span>
            </>
          )}
          <span className="font-mono text-slate-400 text-[10px]">
            [{hoverSnap.point.x.toFixed(1)}, {hoverSnap.point.y.toFixed(1)}, {hoverSnap.point.z.toFixed(1)}]
          </span>
        </div>
      )}

      {/* 2D Projected Measurement Badges */}
      {projectedBadges.map((badge) => (
        <div
          key={badge.id}
          style={{
            transform: `translate(${badge.x}px, ${badge.y}px) translate(-50%, -50%)`,
          }}
          onClick={(e) => {
            e.stopPropagation()
            onSelectMeasurement(badge.id)
          }}
          className={`absolute top-0 left-0 pointer-events-auto z-20 cursor-pointer transition-all duration-150 ${
            badge.isSelected
              ? 'scale-110 shadow-2xl ring-2 ring-white z-30'
              : 'hover:scale-105 opacity-90 hover:opacity-100'
          }`}
        >
          <div
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md shadow-lg border text-white"
            style={{
              backgroundColor: `${badge.color}cc`,
              borderColor: badge.isSelected ? '#ffffff' : `${badge.color}`,
            }}
          >
            <span>{badge.text}</span>
            {badge.isSelected && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteMeasurement(badge.id)
                }}
                className="hover:bg-black/30 p-0.5 rounded text-white/80 hover:text-white transition-colors ml-0.5"
                title="Smazat tuto kótu"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ))}

      {/* Live Measuring In-progress Badge */}
      {liveBadge && (
        <div
          style={{
            transform: `translate(${liveBadge.x}px, ${liveBadge.y}px) translate(-50%, -50%)`,
          }}
          className="absolute top-0 left-0 pointer-events-none z-30 animate-pulse"
        >
          <div className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-500 text-slate-950 shadow-xl border border-cyan-300">
            {liveBadge.text}
          </div>
        </div>
      )}

      {/* Bounding Box Caliper Badges */}
      {bboxBadges.map((bb) => (
        <div
          key={bb.axis}
          style={{
            transform: `translate(${bb.x}px, ${bb.y}px) translate(-50%, -50%)`,
          }}
          className="absolute top-0 left-0 pointer-events-none z-20"
        >
          <div className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-slate-900/90 text-cyan-300 border border-cyan-500/50 shadow-md">
            {bb.text}
          </div>
        </div>
      ))}

      {/* Mouse navigation helper pill */}
      <div className="absolute bottom-3 left-4 z-10 pointer-events-none text-[11px] text-slate-400 bg-slate-900/70 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-slate-800 hidden md:flex items-center gap-3">
        <span>🖱️ <strong>Rotace:</strong> Levý klik + táhnout</span>
        <span>•</span>
        <span>✋ <strong>Posun:</strong> Pravý klik / Shift + táhnout</span>
        <span>•</span>
        <span>🔍 <strong>Zoom:</strong> Kolečko</span>
      </div>
    </div>
  )
}

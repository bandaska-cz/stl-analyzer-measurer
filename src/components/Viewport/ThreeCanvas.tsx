import React, { useEffect, useRef, useState, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type {
  CameraPreset,
  Measurement,
  ModelStats,
  RenderSettings,
} from '../../types'
import { getSnappedPoint } from '../../utils/meshCalculations'
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

  // Interaction state
  const [measureStartPoint, setMeasureStartPoint] = useState<THREE.Vector3 | null>(null)
  const [hoverPoint, setHoverPoint] = useState<THREE.Vector3 | null>(null)
  const [isSnapped, setIsSnapped] = useState<boolean>(false)
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
    persp.up.set(0, 0, 1) // Z is UP (standard in 3D printing & CAD)
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

    // Build Plate Grid (Custom sized for 3D printer bed)
    const grid = new THREE.GridHelper(settings.gridSize, settings.gridSize / 10, 0x4f46e5, 0x1e293b)
    grid.rotation.x = Math.PI / 2
    grid.position.z = -0.01 // Just below Z=0
    scene.add(grid)
    gridHelperRef.current = grid

    // Coordinate Axes Helper (X: Red, Y: Green, Z: Blue)
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

    // Snapping indicator (Glowing sphere with outer ring)
    const snapSphereGeo = new THREE.SphereGeometry(1.2, 16, 16)
    const snapSphereMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      depthTest: false,
      transparent: true,
      opacity: 0.9,
    })
    const snapIndicator = new THREE.Mesh(snapSphereGeo, snapSphereMat)
    snapIndicator.renderOrder = 999
    snapIndicator.visible = false
    scene.add(snapIndicator)
    snapIndicatorRef.current = snapIndicator

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

  // Camera projection toggle (Perspective vs Ortho)
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

  // Update Grid & Axes when settings change
  useEffect(() => {
    if (gridHelperRef.current) {
      gridHelperRef.current.visible = settings.showGrid
    }
    if (axesHelperRef.current) {
      axesHelperRef.current.visible = settings.showAxes
    }
  }, [settings.showGrid, settings.showAxes])

  // Update Model Mesh & Material when geometry or render settings change
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return

    // Clean up previous mesh
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

    // Create materials based on renderMode
    let material: THREE.Material
    switch (settings.renderMode) {
      case 'wireframe':
        material = new THREE.MeshBasicMaterial({
          color: 0x60a5fa,
          wireframe: true,
        })
        break
      case 'matcap':
        material = new THREE.MeshNormalMaterial({
          flatShading: false,
        })
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
        material = new THREE.MeshNormalMaterial({
          flatShading: true,
        })
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

    // If solid-wireframe, add crisp edge highlights
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

    // Bounding Box Helper
    if (settings.showBoundingBox && stats) {
      geometry.computeBoundingBox()
      if (geometry.boundingBox) {
        const boxHelper = new THREE.Box3Helper(geometry.boundingBox, new THREE.Color(0x38bdf8))
        scene.add(boxHelper)
        bboxHelperRef.current = boxHelper
      }
    }
  }, [geometry, settings.renderMode, settings.modelColor, settings.showBoundingBox, stats])

  // Center camera on model when new geometry is loaded
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

  // Preset Views (Top, Front, Side, Iso)
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

  // Re-render finished 3D measurements whenever `measurements` or `selectedMeasurementId` updates
  useEffect(() => {
    const group = measurementsGroupRef.current
    if (!group) return

    // Clear previous measurement 3D objects
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

      // Endpoint spheres
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

      // Connecting 3D line / cylinder for high visibility
      const dist = p1.distanceTo(p2)
      if (dist > 0.001) {
        const dir = new THREE.Vector3().subVectors(p2, p1).normalize()
        const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)

        // Cylinder line
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

        // Caliper end ticks (small crossbars at endpoints)
        const tickLength = 4
        // Find vector perpendicular to direction
        const arbitrary = Math.abs(dir.z) < 0.99 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
        const perp = new THREE.Vector3().crossVectors(dir, arbitrary).normalize().multiplyScalar(tickLength / 2)

        const tickGeo1 = new THREE.BufferGeometry().setFromPoints([
          p1.clone().add(perp),
          p1.clone().sub(perp),
        ])
        const tickGeo2 = new THREE.BufferGeometry().setFromPoints([
          p2.clone().add(perp),
          p2.clone().sub(perp),
        ])
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

        // If selected: show orthogonal delta lines (delta X, delta Y, delta Z steps)
        if (isSelected) {
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

  // Live guide line when measuring in progress
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

    if (isMeasuringActive && measureStartPoint && hoverPoint) {
      // Dynamic dashed line from start to hover point
      const lineGeo = new THREE.BufferGeometry().setFromPoints([measureStartPoint, hoverPoint])
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

      // Start point sphere
      const startSphereGeo = new THREE.SphereGeometry(1.4, 16, 16)
      const startSphereMat = new THREE.MeshBasicMaterial({
        color: 0x06b6d4,
        depthTest: false,
      })
      const startSphere = new THREE.Mesh(startSphereGeo, startSphereMat)
      startSphere.position.copy(measureStartPoint)
      startSphere.renderOrder = 960
      liveGroup.add(startSphere)
    }
  }, [isMeasuringActive, measureStartPoint, hoverPoint])

  // Project 3D positions to 2D screen coordinates on every animation/control change
  const updateProjectedBadges = useCallback(() => {
    if (!containerRef.current || !activeCameraRef.current) return
    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight
    const camera = activeCameraRef.current

    // Project finished measurements
    const badges: ProjectedBadge[] = []
    measurements.forEach((m) => {
      if (!m.visible) return
      const p1 = new THREE.Vector3(m.start.x, m.start.y, m.start.z)
      const p2 = new THREE.Vector3(m.end.x, m.end.y, m.end.z)
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)

      // Check if in front of camera
      const projected = mid.clone().project(camera)
      if (projected.z < 1) {
        const sx = ((projected.x + 1) * width) / 2
        const sy = ((-projected.y + 1) * height) / 2

        badges.push({
          id: m.id,
          x: sx,
          y: sy,
          text: `${m.distance.toFixed(2)} mm`,
          subtext: m.name,
          color: m.color,
          isSelected: m.id === selectedMeasurementId,
        })
      }
    })
    setProjectedBadges(badges)

    // Project live measurement if active
    if (isMeasuringActive && measureStartPoint && hoverPoint) {
      const mid = new THREE.Vector3().addVectors(measureStartPoint, hoverPoint).multiplyScalar(0.5)
      const projected = mid.clone().project(camera)
      if (projected.z < 1) {
        const sx = ((projected.x + 1) * width) / 2
        const sy = ((-projected.y + 1) * height) / 2
        const dist = measureStartPoint.distanceTo(hoverPoint)
        setLiveBadge({
          id: 'live',
          x: sx,
          y: sy,
          text: `${dist.toFixed(2)} mm`,
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

    // Project Bounding Box Calipers if enabled
    if (settings.showBoxDimensions && stats) {
      const bBadges: BBoxBadge[] = []
      const min = stats.bbox.min
      const max = stats.bbox.max

      // X dimension midpoint along front bottom edge [midX, minY, minZ]
      const midX = new THREE.Vector3((min.x + max.x) / 2, min.y, min.z).project(camera)
      if (midX.z < 1) {
        bBadges.push({
          axis: 'X',
          x: ((midX.x + 1) * width) / 2,
          y: ((-midX.y + 1) * height) / 2,
          text: `X: ${stats.dimensions.x.toFixed(2)} mm`,
        })
      }

      // Y dimension midpoint along side bottom edge [minX, midY, minZ]
      const midY = new THREE.Vector3(min.x, (min.y + max.y) / 2, min.z).project(camera)
      if (midY.z < 1) {
        bBadges.push({
          axis: 'Y',
          x: ((midY.x + 1) * width) / 2,
          y: ((-midY.y + 1) * height) / 2,
          text: `Y: ${stats.dimensions.y.toFixed(2)} mm`,
        })
      }

      // Z dimension midpoint along vertical corner edge [minX, minY, midZ]
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
    measureStartPoint,
    hoverPoint,
    settings.showBoxDimensions,
    stats,
  ])

  // Hook into requestAnimationFrame for smooth projected badges
  useEffect(() => {
    let animId: number
    const loop = () => {
      animId = requestAnimationFrame(loop)
      updateProjectedBadges()
    }
    loop()
    return () => cancelAnimationFrame(animId)
  }, [updateProjectedBadges])

  // Handle Raycasting & Pointer Events for Precision Snapping
  const raycastOnModel = (
    e: React.PointerEvent<HTMLCanvasElement>
  ): { point: THREE.Vector3; snapped: boolean } | null => {
    if (!canvasRef.current || !modelMeshRef.current || !activeCameraRef.current) return null

    const rect = canvasRef.current.getBoundingClientRect()
    const mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1

    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera(new THREE.Vector2(mouseX, mouseY), activeCameraRef.current)

    const intersects = raycaster.intersectObject(modelMeshRef.current, false)
    if (intersects.length > 0) {
      const hit = intersects[0]
      if (settings.snapToVertex) {
        const snapResult = getSnappedPoint(
          hit,
          activeCameraRef.current,
          rect,
          settings.snapTolerancePx
        )
        return { point: snapResult.point, snapped: snapResult.isSnapped }
      }
      return { point: hit.point.clone(), snapped: false }
    }
    return null
  }

  // Pointer move: update snap reticle & hover coordinates
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (rect) {
      setMouseScreenPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }

    if (!isMeasuringActive) {
      if (snapIndicatorRef.current) snapIndicatorRef.current.visible = false
      setHoverPoint(null)
      return
    }

    const hit = raycastOnModel(e)
    if (hit) {
      setHoverPoint(hit.point)
      setIsSnapped(hit.snapped)

      if (snapIndicatorRef.current) {
        snapIndicatorRef.current.position.copy(hit.point)
        snapIndicatorRef.current.visible = true
        // Green if snapped to vertex, cyan if surface
        ;(snapIndicatorRef.current.material as THREE.MeshBasicMaterial).color.setHex(
          hit.snapped ? 0x10b981 : 0x06b6d4
        )
      }
    } else {
      if (snapIndicatorRef.current) snapIndicatorRef.current.visible = false
      setHoverPoint(null)
    }
  }

  // Pointer click: set start point or complete measurement
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Only handle primary left click for measuring
    if (e.button !== 0 || !isMeasuringActive) return

    const hit = raycastOnModel(e)
    if (!hit) return

    if (!measureStartPoint) {
      // 1st click: establish start point
      setMeasureStartPoint(hit.point)
    } else {
      // 2nd click: finish measurement!
      const p1 = measureStartPoint
      const p2 = hit.point
      const distance = p1.distanceTo(p2)

      if (distance > 0.01) {
        const deltaX = Math.abs(p2.x - p1.x)
        const deltaY = Math.abs(p2.y - p1.y)
        const deltaZ = Math.abs(p2.z - p1.z)

        const newMeasurement: Measurement = {
          id: `m-${Date.now()}`,
          name: `Rozměr #${measurements.length + 1}`,
          start: { x: p1.x, y: p1.y, z: p1.z },
          end: { x: p2.x, y: p2.y, z: p2.z },
          distance,
          deltaX,
          deltaY,
          deltaZ,
          color: [
            '#06b6d4',
            '#f97316',
            '#10b981',
            '#8b5cf6',
            '#f43f5e',
            '#eab308',
            '#3b82f6',
          ][measurements.length % 7],
          visible: true,
          createdAt: Date.now(),
        }

        onAddMeasurement(newMeasurement)
        onSelectMeasurement(newMeasurement.id)
      }

      // Reset measuring start point
      setMeasureStartPoint(null)
    }
  }

  // Cancel measuring on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMeasureStartPoint(null)
        setIsMeasuringActive(false)
        if (snapIndicatorRef.current) snapIndicatorRef.current.visible = false
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMeasuringActive(!isMeasuringActive)
        setMeasureStartPoint(null)
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
      {/* 3D WebGL Canvas */}
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
          setMeasureStartPoint(null)
        }}
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
              {!measureStartPoint ? (
                <span>
                  <strong>Krok 1/2:</strong> Klikněte na 1. bod na modelu{' '}
                  {settings.snapToVertex && (
                    <span className="text-emerald-400 font-medium">
                      (vrcholy se magneticky přichytávají)
                    </span>
                  )}
                </span>
              ) : (
                <span>
                  <strong>Krok 2/2:</strong> Klikněte na 2. koncový bod pro
                  dokončení měření
                </span>
              )}
            </span>
            <button
              onClick={() => {
                setMeasureStartPoint(null)
                setIsMeasuringActive(false)
              }}
              className="ml-2 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[11px] transition-colors"
            >
              Zrušit (Esc)
            </button>
          </div>
        </div>
      )}

      {/* Snap / Hover Tooltip near Cursor */}
      {isMeasuringActive && hoverPoint && mouseScreenPos && (
        <div
          style={{
            transform: `translate(${mouseScreenPos.x + 14}px, ${
              mouseScreenPos.y + 14
            }px)`,
          }}
          className="absolute top-0 left-0 pointer-events-none z-30 bg-slate-900/90 backdrop-blur-sm border border-slate-700/80 rounded-lg px-2 py-1 text-[11px] shadow-lg flex items-center gap-1.5"
        >
          {isSnapped ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
          )}
          <span className="font-mono text-slate-300">
            [{hoverPoint.x.toFixed(1)}, {hoverPoint.y.toFixed(1)},{' '}
            {hoverPoint.z.toFixed(1)}]
          </span>
          {isSnapped && (
            <span className="text-[10px] text-emerald-400 font-medium">
              Vrchol
            </span>
          )}
        </div>
      )}

      {/* 2D Projected Measurement Badges (Crisp vector UI overlay) */}
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
            📏 {liveBadge.text}
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

      {/* Mouse navigation helper pill in bottom left */}
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

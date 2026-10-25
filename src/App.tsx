import React, { useState, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import type { Measurement, MeasureMode, ModelStats, RenderSettings } from './types'
import { Header } from './components/Header'
import { ThreeCanvas } from './components/Viewport/ThreeCanvas'
import { Tabs, type ActiveTab } from './components/Sidebar/Tabs'
import { MeasurePanel } from './components/Sidebar/MeasurePanel'
import { AnalyzePanel } from './components/Sidebar/AnalyzePanel'
import { TransformPanel } from './components/Sidebar/TransformPanel'
import { HelpModal } from './components/Modals/HelpModal'
import { ExportReportModal } from './components/Modals/ExportReportModal'
import { calculateModelStats } from './utils/meshCalculations'
import { SAMPLE_MODELS } from './utils/sampleModels'
import { loadSTLFromFile, exportBinarySTL } from './utils/stlHandler'
import { Upload } from 'lucide-react'

export function App() {
  // 3D Geometry and Stats
  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [originalGeometry, setOriginalGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [stats, setStats] = useState<ModelStats | null>(null)
  const [originalStats, setOriginalStats] = useState<ModelStats | null>(null)

  // Measurements
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null)
  const [isMeasuringActive, setIsMeasuringActive] = useState<boolean>(false)
  const [measureMode, setMeasureMode] = useState<MeasureMode>('point-to-point')

  // Sidebar navigation
  const [activeTab, setActiveTab] = useState<ActiveTab>('measure')

  // Modals
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false)
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false)

  // Drag and Drop State
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false)

  // Render Settings
  const [settings, setSettings] = useState<RenderSettings>({
    renderMode: 'solid-wireframe',
    modelColor: '#3b82f6',
    showGrid: true,
    gridSize: 220, // 220 mm bed (standard 3D printer)
    showAxes: true,
    showBoundingBox: true,
    showBoxDimensions: false,
    snapToVertex: true,
    snapToEdge: true,
    snapToFaceCenter: false,
    snapTolerancePx: 20,
    orthographic: false,
  })

  // Handle setting active geometry & updating stats
  const setLoadedGeometry = useCallback(
    (geo: THREE.BufferGeometry, name: string, fileSize: number = 0) => {
      // Center geometry on bed (XY centered, Z placed on ground Z=0)
      geo.computeBoundingBox()
      const bbox = geo.boundingBox || new THREE.Box3()
      const center = new THREE.Vector3()
      bbox.getCenter(center)
      geo.translate(-center.x, -center.y, -bbox.min.z)
      geo.computeBoundingBox()

      const newStats = calculateModelStats(geo, name, fileSize)
      setGeometry(geo)
      setOriginalGeometry(geo.clone())
      setStats(newStats)
      setOriginalStats(newStats)
      setMeasurements([])
      setSelectedMeasurementId(null)
    },
    []
  )

  // Load sample model
  const handleSelectSampleModel = useCallback(
    (id: string) => {
      const def = SAMPLE_MODELS.find((m) => m.id === id) || SAMPLE_MODELS[0]
      const geo = def.createGeometry()
      setLoadedGeometry(geo, `${def.name}.stl`, 35000)
    },
    [setLoadedGeometry]
  )

  // Initialize with Calibration Cube on first mount
  useEffect(() => {
    handleSelectSampleModel('calibration-cube')
  }, [handleSelectSampleModel])

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    try {
      const { geometry: loadedGeo, name, size } = await loadSTLFromFile(file)
      setLoadedGeometry(loadedGeo, name, size)
    } catch (err) {
      console.error('Chyba při načítání STL:', err)
      alert('Nepodařilo se načíst STL soubor. Ujistěte se, že jde o platný binární nebo ASCII formát.')
    }
  }

  // Drag and drop event listeners
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return
    setIsDraggingFile(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.toLowerCase().endsWith('.stl')) {
      await handleFileUpload(file)
    } else {
      alert('Prosím přetáhněte soubor ve formátu .STL')
    }
  }

  // Measurement manipulation
  const handleAddMeasurement = (m: Measurement) => {
    setMeasurements((prev) => [...prev, m])
  }

  const handleDeleteMeasurement = (id: string) => {
    setMeasurements((prev) => prev.filter((m) => m.id !== id))
    if (selectedMeasurementId === id) {
      setSelectedMeasurementId(null)
    }
  }

  const handleClearAllMeasurements = () => {
    setMeasurements([])
    setSelectedMeasurementId(null)
  }

  const handleToggleMeasurementVisibility = (id: string) => {
    setMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, visible: !m.visible } : m))
    )
  }

  const handleUpdateMeasurementName = (id: string, name: string) => {
    setMeasurements((prev) =>
      prev.map((m) => (m.id === id ? { ...m, name } : m))
    )
  }

  // --- TRANSFORMATION & SCALING HANDLERS ---

  // 1. Scale to exact dimensions (X, Y, Z in mm)
  const handleScaleDimensions = (targetX: number, targetY: number, targetZ: number) => {
    if (!geometry || !stats) return
    const sx = stats.dimensions.x > 0 ? targetX / stats.dimensions.x : 1
    const sy = stats.dimensions.y > 0 ? targetY / stats.dimensions.y : 1
    const sz = stats.dimensions.z > 0 ? targetZ / stats.dimensions.z : 1

    const newGeo = geometry.clone()
    newGeo.scale(sx, sy, sz)
    newGeo.computeBoundingBox()
    newGeo.computeVertexNormals()

    // Update measurements accordingly
    setMeasurements((prev) =>
      prev.map((m) => {
        const start = { x: m.start.x * sx, y: m.start.y * sy, z: m.start.z * sz }
        const end = { x: m.end.x * sx, y: m.end.y * sy, z: m.end.z * sz }
        const p1 = new THREE.Vector3(start.x, start.y, start.z)
        const p2 = new THREE.Vector3(end.x, end.y, end.z)
        return {
          ...m,
          start,
          end,
          distance: p1.distanceTo(p2),
          deltaX: Math.abs(end.x - start.x),
          deltaY: Math.abs(end.y - start.y),
          deltaZ: Math.abs(end.z - start.z),
        }
      })
    )

    const newStats = calculateModelStats(newGeo, stats.name, stats.fileSize)
    setGeometry(newGeo)
    setStats(newStats)
  }

  // 2. Uniform scale factor
  const handleScaleUniformFactor = (factor: number) => {
    if (!geometry || !stats || factor <= 0) return
    handleScaleDimensions(
      stats.dimensions.x * factor,
      stats.dimensions.y * factor,
      stats.dimensions.z * factor
    )
  }

  // 3. Scale to match a specific measurement
  const handleScaleByMeasurement = (measurementId: string, targetDistance: number) => {
    const measurement = measurements.find((m) => m.id === measurementId)
    if (!measurement || measurement.distance <= 0 || targetDistance <= 0) return
    const factor = targetDistance / measurement.distance
    handleScaleUniformFactor(factor)
  }

  // 4. Rotate 90 degrees around X, Y or Z
  const handleRotateAxis = (axis: 'X' | 'Y' | 'Z', degrees: number) => {
    if (!geometry || !stats) return
    const rad = THREE.MathUtils.degToRad(degrees)
    const newGeo = geometry.clone()

    if (axis === 'X') newGeo.rotateX(rad)
    if (axis === 'Y') newGeo.rotateY(rad)
    if (axis === 'Z') newGeo.rotateZ(rad)

    // Re-place bottom on Z=0
    newGeo.computeBoundingBox()
    const bbox = newGeo.boundingBox || new THREE.Box3()
    newGeo.translate(0, 0, -bbox.min.z)
    newGeo.computeBoundingBox()
    newGeo.computeVertexNormals()

    // Transform measurements
    const rotEuler = new THREE.Euler(
      axis === 'X' ? rad : 0,
      axis === 'Y' ? rad : 0,
      axis === 'Z' ? rad : 0
    )
    setMeasurements((prev) =>
      prev.map((m) => {
        const vStart = new THREE.Vector3(m.start.x, m.start.y, m.start.z).applyEuler(rotEuler)
        const vEnd = new THREE.Vector3(m.end.x, m.end.y, m.end.z).applyEuler(rotEuler)
        vStart.z -= bbox.min.z
        vEnd.z -= bbox.min.z
        return {
          ...m,
          start: { x: vStart.x, y: vStart.y, z: vStart.z },
          end: { x: vEnd.x, y: vEnd.y, z: vEnd.z },
          deltaX: Math.abs(vEnd.x - vStart.x),
          deltaY: Math.abs(vEnd.y - vStart.y),
          deltaZ: Math.abs(vEnd.z - vStart.z),
        }
      })
    )

    const newStats = calculateModelStats(newGeo, stats.name, stats.fileSize)
    setGeometry(newGeo)
    setStats(newStats)
  }

  // 5. Lay flat on bed (Z=0)
  const handleDropToBed = () => {
    if (!geometry || !stats) return
    geometry.computeBoundingBox()
    const bbox = geometry.boundingBox
    if (!bbox) return

    const offsetZ = -bbox.min.z
    const newGeo = geometry.clone()
    newGeo.translate(0, 0, offsetZ)
    newGeo.computeBoundingBox()

    setMeasurements((prev) =>
      prev.map((m) => ({
        ...m,
        start: { ...m.start, z: m.start.z + offsetZ },
        end: { ...m.end, z: m.end.z + offsetZ },
      }))
    )

    const newStats = calculateModelStats(newGeo, stats.name, stats.fileSize)
    setGeometry(newGeo)
    setStats(newStats)
  }

  // 6. Center on bed (X=0, Y=0)
  const handleCenterModel = () => {
    if (!geometry || !stats) return
    geometry.computeBoundingBox()
    const bbox = geometry.boundingBox
    if (!bbox) return

    const center = new THREE.Vector3()
    bbox.getCenter(center)
    const newGeo = geometry.clone()
    newGeo.translate(-center.x, -center.y, 0)
    newGeo.computeBoundingBox()

    setMeasurements((prev) =>
      prev.map((m) => ({
        ...m,
        start: { ...m.start, x: m.start.x - center.x, y: m.start.y - center.y },
        end: { ...m.end, x: m.end.x - center.x, y: m.end.y - center.y },
      }))
    )

    const newStats = calculateModelStats(newGeo, stats.name, stats.fileSize)
    setGeometry(newGeo)
    setStats(newStats)
  }

  // 7. Reset to original
  const handleResetOriginal = () => {
    if (!originalGeometry || !originalStats) return
    setGeometry(originalGeometry.clone())
    setStats(originalStats)
    setMeasurements([])
    setSelectedMeasurementId(null)
  }

  // 8. Export binary STL
  const handleExportSTL = () => {
    if (!geometry || !stats) return
    const filename = stats.name.replace(/\.[^/.]+$/, '') + '_upraveno.stl'
    exportBinarySTL(geometry, filename)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="relative w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans"
    >
      {/* Header bar */}
      <Header
        onFileUpload={handleFileUpload}
        onSelectSampleModel={handleSelectSampleModel}
        onExportSTL={handleExportSTL}
        onOpenReportModal={() => setIsReportOpen(true)}
        onOpenHelpModal={() => setIsHelpOpen(true)}
        stats={stats}
      />

      {/* Main Workspace (Viewport on Left, Sidebar on Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 3D Viewport */}
        <div className="flex-1 relative h-full">
          <ThreeCanvas
            geometry={geometry}
            stats={stats}
            settings={settings}
            onChangeSettings={(st) => setSettings((prev) => ({ ...prev, ...st }))}
            measurements={measurements}
            selectedMeasurementId={selectedMeasurementId}
            onSelectMeasurement={setSelectedMeasurementId}
            onAddMeasurement={handleAddMeasurement}
            onDeleteMeasurement={handleDeleteMeasurement}
            isMeasuringActive={isMeasuringActive}
            setIsMeasuringActive={setIsMeasuringActive}
            measureMode={measureMode}
            setMeasureMode={setMeasureMode}
          />
        </div>

        {/* Right Sidebar Panel */}
        <aside className="w-80 md:w-96 border-l border-slate-800 bg-slate-950/95 backdrop-blur-md flex flex-col shrink-0 z-20 shadow-2xl">
          {/* Navigation Tabs */}
          <Tabs
            activeTab={activeTab}
            onChangeTab={setActiveTab}
            measurementCount={measurements.length}
          />

          {/* Panel Content (Scrollable) */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'measure' && (
              <MeasurePanel
                measurements={measurements}
                selectedMeasurementId={selectedMeasurementId}
                onSelectMeasurement={setSelectedMeasurementId}
                onDeleteMeasurement={handleDeleteMeasurement}
                onClearAllMeasurements={handleClearAllMeasurements}
                onToggleVisibility={handleToggleMeasurementVisibility}
                onUpdateName={handleUpdateMeasurementName}
                isMeasuringActive={isMeasuringActive}
                onToggleMeasure={() => setIsMeasuringActive(!isMeasuringActive)}
                settings={settings}
                onChangeSettings={(st) => setSettings((prev) => ({ ...prev, ...st }))}
                onScaleByMeasurement={handleScaleByMeasurement}
                measureMode={measureMode}
                setMeasureMode={setMeasureMode}
              />
            )}

            {activeTab === 'analyze' && <AnalyzePanel stats={stats} />}

            {activeTab === 'transform' && (
              <TransformPanel
                stats={stats}
                onScaleDimensions={handleScaleDimensions}
                onScaleUniformFactor={handleScaleUniformFactor}
                onRotateAxis={handleRotateAxis}
                onDropToBed={handleDropToBed}
                onCenterModel={handleCenterModel}
                onResetOriginal={handleResetOriginal}
                onExportSTL={handleExportSTL}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Drag & Drop Visual Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-50 bg-indigo-950/80 backdrop-blur-md border-4 border-dashed border-indigo-400 flex flex-col items-center justify-center gap-4 text-white pointer-events-none">
          <Upload className="w-16 h-16 text-indigo-400 animate-bounce" />
          <h2 className="text-2xl font-bold">Přetáhněte sem STL soubor</h2>
          <p className="text-sm text-slate-300">
            Aplikace model automaticky analyzuje a připraví k měření.
          </p>
        </div>
      )}

      {/* Help Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Export Report Modal */}
      <ExportReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        stats={stats}
        measurements={measurements}
      />
    </div>
  )
}
export default App

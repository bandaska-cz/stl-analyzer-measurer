import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js'
import type { Measurement, ModelStats } from '../types'
import { formatMm } from './meshCalculations'

/**
 * Parses an STL file (binary or ASCII) and returns BufferGeometry with computed normals.
 */
export async function loadSTLFromFile(file: File): Promise<{
  geometry: THREE.BufferGeometry
  name: string
  size: number
}> {
  const buffer = await file.arrayBuffer()
  const loader = new STLLoader()
  const geometry = loader.parse(buffer)

  // Ensure normals and bounding box are computed
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals()
  }
  geometry.computeBoundingBox()

  return {
    geometry,
    name: file.name,
    size: file.size,
  }
}

/**
 * Exports a BufferGeometry as a binary STL file and triggers automatic download.
 */
export function exportBinarySTL(
  geometry: THREE.BufferGeometry,
  filename: string = 'model_upraveno.stl'
): void {
  // Create temporary mesh to pass to exporter
  const material = new THREE.MeshStandardMaterial()
  const mesh = new THREE.Mesh(geometry.clone(), material)

  const exporter = new STLExporter()
  const result = exporter.parse(mesh, { binary: true })

  const blob = new Blob([result], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.stl') ? filename : `${filename}.stl`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Generates and downloads a detailed measurement and inspection report.
 */
export function exportMeasurementReport(
  stats: ModelStats,
  measurements: Measurement[],
  materialName: string,
  weightGrams: number,
  format: 'txt' | 'json' = 'txt'
): void {
  const baseName = stats.name.replace(/\.[^/.]+$/, '')
  let content = ''
  let mimeType = 'text/plain'
  let extension = 'txt'

  if (format === 'json') {
    mimeType = 'application/json'
    extension = 'json'
    const reportData = {
      modelName: stats.name,
      exportDate: new Date().toISOString(),
      dimensionsMm: stats.dimensions,
      volumeCm3: stats.volume,
      surfaceAreaCm2: stats.surfaceArea,
      meshHealth: {
        triangles: stats.triangleCount,
        vertices: stats.vertexCount,
        isWatertight: stats.isWatertight,
      },
      materialEstimate: {
        material: materialName,
        weightGrams: Number(weightGrams.toFixed(2)),
      },
      measurements: measurements.map((m) => ({
        id: m.id,
        name: m.name,
        distanceMm: Number(m.distance.toFixed(3)),
        deltaX: Number(m.deltaX.toFixed(3)),
        deltaY: Number(m.deltaY.toFixed(3)),
        deltaZ: Number(m.deltaZ.toFixed(3)),
        start: m.start,
        end: m.end,
      })),
    }
    content = JSON.stringify(reportData, null, 2)
  } else {
    // Formatted text report
    content = `=====================================================
PROTOKOL O MĚŘENÍ A ANALÝZE 3D MODELU (STL)
Vygenerováno: ${new Date().toLocaleString('cs-CZ')}
=====================================================

1. ZÁKLADNÍ INFORMACE O MODELU
-----------------------------------------------------
Název souboru:      ${stats.name}
Rozměry (Š × H × V): ${formatMm(stats.dimensions.x)} × ${formatMm(stats.dimensions.y)} × ${formatMm(stats.dimensions.z)}
Objem:              ${stats.volume.toFixed(2)} cm³ (${stats.volumeMm3.toFixed(0)} mm³)
Povrch:             ${stats.surfaceArea.toFixed(2)} cm² (${stats.surfaceAreaMm2.toFixed(0)} mm²)
Odhadovaná váha:    ${weightGrams.toFixed(1)} g (${materialName})
Počet trojúhelníků: ${stats.triangleCount.toLocaleString('cs-CZ')}
Počet vrcholů:      ${stats.vertexCount.toLocaleString('cs-CZ')}
Vodotěsnost:        ${stats.isWatertight ? 'ANO (Uzavřený manifold)' : 'NE (Obsahuje otevřené hrany)'}

2. NAMĚŘENÉ KÓTY A VZDÁLENOSTI
-----------------------------------------------------
Celkem naměřeno rozměrů: ${measurements.length}
`
    if (measurements.length === 0) {
      content += `Žádné uložené měření.\n`
    } else {
      measurements.forEach((m, idx) => {
        content += `\n[#${idx + 1}] ${m.name}
  Vzdálenost (3D):  ${formatMm(m.distance, 3)}
  Projekce ΔX:      ${formatMm(m.deltaX, 3)}
  Projekce ΔY:      ${formatMm(m.deltaY, 3)}
  Projekce ΔZ:      ${formatMm(m.deltaZ, 3)}
  Bod A:            [X: ${m.start.x.toFixed(2)}, Y: ${m.start.y.toFixed(2)}, Z: ${m.start.z.toFixed(2)}] mm
  Bod B:            [X: ${m.end.x.toFixed(2)}, Y: ${m.end.y.toFixed(2)}, Z: ${m.end.z.toFixed(2)}] mm
`
      })
    }

    content += `\n=====================================================
Vytvořeno pomocí aplikace STL Analyzer & Measurer
=====================================================`
  }

  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${baseName}_protokol_mereni.${extension}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}


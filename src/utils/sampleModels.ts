import * as THREE from 'three'
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface SampleModelDefinition {
  id: string
  name: string
  description: string
  createGeometry: () => THREE.BufferGeometry
}

export const SAMPLE_MODELS: SampleModelDefinition[] = [
  {
    id: 'calibration-cube',
    name: 'Kalibrační kostka (20×20×20 mm)',
    description: 'Přesná testovací kostka s rozměry 20×20×20 mm pro ověření přesnosti měření',
    createGeometry: () => {
      // Clean, exact 20x20x20 mm calibration cube with segmented faces for easy vertex snapping
      const geo = new THREE.BoxGeometry(20, 20, 20, 4, 4, 4)
      geo.computeVertexNormals()
      return geo
    },
  },
  {
    id: 'stepped-bracket',
    name: 'Mechanická konzole s osazením',
    description: 'Technická součástka s různými výškami stěn (60×40×35 mm) a montážním otvorem',
    createGeometry: () => {
      // Base plate: 60x40x8 mm
      const base = new THREE.BoxGeometry(60, 40, 8)
      base.translate(0, 0, 4)

      // Vertical wall: 20x40x27 mm at the end
      const wall = new THREE.BoxGeometry(20, 40, 27)
      wall.translate(-20, 0, 8 + 13.5)

      // Rib / gusset: triangle or stepped support
      const step = new THREE.BoxGeometry(15, 20, 12)
      step.translate(-2.5, 0, 8 + 6)

      // Boss / cylinder on base
      const boss = new THREE.CylinderGeometry(8, 8, 10, 24)
      boss.rotateX(Math.PI / 2)
      boss.translate(15, 0, 8 + 5)

      const merged = BufferGeometryUtils.mergeGeometries([base, wall, step, boss])
      merged.computeVertexNormals()
      return merged
    },
  },
  {
    id: 'flange-coupling',
    name: 'Příruba s osazením (Ø 50 mm)',
    description: 'Kruhová součástka s osazením pro měření průměrů, roztečí a tloušťky materiálu',
    createGeometry: () => {
      // Base flange disc: dia 50mm, height 8mm
      const flange = new THREE.CylinderGeometry(25, 25, 8, 32)
      flange.rotateX(Math.PI / 2)
      flange.translate(0, 0, 4)

      // Central cylindrical boss: dia 26mm, height 16mm
      const boss = new THREE.CylinderGeometry(13, 13, 16, 32)
      boss.rotateX(Math.PI / 2)
      boss.translate(0, 0, 8 + 8)

      // 4 perimeter pin lugs
      const lug1 = new THREE.CylinderGeometry(3.5, 3.5, 6, 16)
      lug1.rotateX(Math.PI / 2)
      lug1.translate(18, 0, 8 + 3)

      const lug2 = new THREE.CylinderGeometry(3.5, 3.5, 6, 16)
      lug2.rotateX(Math.PI / 2)
      lug2.translate(-18, 0, 8 + 3)

      const lug3 = new THREE.CylinderGeometry(3.5, 3.5, 6, 16)
      lug3.rotateX(Math.PI / 2)
      lug3.translate(0, 18, 8 + 3)

      const lug4 = new THREE.CylinderGeometry(3.5, 3.5, 6, 16)
      lug4.rotateX(Math.PI / 2)
      lug4.translate(0, -18, 8 + 3)

      const merged = BufferGeometryUtils.mergeGeometries([flange, boss, lug1, lug2, lug3, lug4])
      merged.computeVertexNormals()
      return merged
    },
  },
]


import React, { useState } from 'react'
import type { ModelStats, MaterialInfo } from '../../types'
import { MATERIAL_PRESETS } from '../../types'
import { formatBytes, formatMm } from '../../utils/meshCalculations'
import {
  Box,
  ShieldCheck,
  AlertTriangle,
  Scale,
  Activity,
} from 'lucide-react'

interface AnalyzePanelProps {
  stats: ModelStats | null
}

export const AnalyzePanel: React.FC<AnalyzePanelProps> = ({ stats }) => {
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialInfo>(MATERIAL_PRESETS[0])
  const [infillPercent, setInfillPercent] = useState<number>(20)
  const pricePerKg = 550 // CZK / kg average

  if (!stats) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs">
        Žádný model není načten.
      </div>
    )
  }

  // Weight calculation:
  // Solid volume in cm3 * density
  // Effective volume = shell + infill interior.
  // Approximate for 3D printing:
  // Effective weight = volumeCm3 * density * (0.25 + 0.75 * (infillPercent / 100))
  const effectiveRatio = infillPercent === 100 ? 1.0 : 0.2 + 0.8 * (infillPercent / 100)
  const estimatedWeightG = stats.volume * selectedMaterial.density * effectiveRatio
  const estimatedCostCzk = (estimatedWeightG / 1000) * pricePerKg

  const maxDimension = Math.max(stats.dimensions.x, stats.dimensions.y, stats.dimensions.z, 0.001)

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* 1. Bounding Box Dimensions Card */}
      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Box className="w-4 h-4 text-cyan-400" />
            Rozměry ohraničení (Bounding Box)
          </span>
          <span className="text-[11px] font-mono text-slate-400">v milimetrech</span>
        </div>

        <div className="flex flex-col gap-2 font-mono text-xs">
          {/* X axis */}
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-red-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80 inline-block" />
              Šířka (X):
            </span>
            <span className="text-sm font-bold text-white">{formatMm(stats.dimensions.x)}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full"
              style={{ width: `${(stats.dimensions.x / maxDimension) * 100}%` }}
            />
          </div>

          {/* Y axis */}
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80 inline-block" />
              Hloubka (Y):
            </span>
            <span className="text-sm font-bold text-white">{formatMm(stats.dimensions.y)}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${(stats.dimensions.y / maxDimension) * 100}%` }}
            />
          </div>

          {/* Z axis */}
          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 text-blue-400 font-bold">
              <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/80 inline-block" />
              Výška (Z):
            </span>
            <span className="text-sm font-bold text-white">{formatMm(stats.dimensions.z)}</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full"
              style={{ width: `${(stats.dimensions.z / maxDimension) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Geometric Volume & Surface Area */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Volume */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400 font-medium">Objem modelu</span>
          <span className="text-base font-bold font-mono text-cyan-300">
            {stats.volume.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">cm³</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {stats.volumeMm3.toFixed(0)} mm³
          </span>
        </div>

        {/* Surface Area */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-1">
          <span className="text-[11px] text-slate-400 font-medium">Plocha povrchu</span>
          <span className="text-base font-bold font-mono text-indigo-300">
            {stats.surfaceArea.toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">cm²</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {stats.surfaceAreaMm2.toFixed(0)} mm²
          </span>
        </div>
      </div>

      {/* 3. Weight & Cost Estimator for 3D Printing */}
      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-amber-400" />
            Odhad hmotnosti a ceny (3D tisk)
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Material Select */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-400">Materiál filamentu</label>
            <select
              value={selectedMaterial.id}
              onChange={(e) => {
                const found = MATERIAL_PRESETS.find((m) => m.id === e.target.value)
                if (found) setSelectedMaterial(found)
              }}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {MATERIAL_PRESETS.map((mat) => (
                <option key={mat.id} value={mat.id}>
                  {mat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Infill */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Výplň (Infill)</span>
              <span className="font-mono text-amber-300 font-semibold">{infillPercent} %</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={infillPercent}
              onChange={(e) => setInfillPercent(Number(e.target.value))}
              className="accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer mt-2"
            />
          </div>
        </div>

        {/* Calculated Weight & Cost Display */}
        <div className="p-2.5 bg-slate-950/70 rounded-lg border border-slate-800/80 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Odhadovaná váha výtisku:</span>
            <span className="text-lg font-bold font-mono text-amber-400">
              {estimatedWeightG.toFixed(1)} g
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-400">Cena filamentu (~550 Kč/kg):</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              {estimatedCostCzk.toFixed(1)} Kč
            </span>
          </div>
        </div>
      </div>

      {/* 4. Mesh Quality & Integrity Check */}
      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2.5 text-xs">
        <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-purple-400" />
          Kvalita sítě a topologie
        </span>

        {/* Watertight badge */}
        <div className="flex items-center justify-between py-1 border-b border-slate-800/60">
          <span className="text-slate-400">Vodotěsnost (Manifold):</span>
          {stats.isWatertight ? (
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Uzavřený model (OK)
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-semibold">
              <AlertTriangle className="w-4 h-4" />
              Otevřené hrany
            </span>
          )}
        </div>

        {/* Triangle Count */}
        <div className="flex items-center justify-between py-0.5">
          <span className="text-slate-400">Počet trojúhelníků:</span>
          <span className="font-mono font-medium text-slate-200">
            {stats.triangleCount.toLocaleString('cs-CZ')}
          </span>
        </div>

        {/* Vertex Count */}
        <div className="flex items-center justify-between py-0.5">
          <span className="text-slate-400">Počet vrcholů:</span>
          <span className="font-mono font-medium text-slate-200">
            {stats.vertexCount.toLocaleString('cs-CZ')}
          </span>
        </div>

        {/* File Size */}
        <div className="flex items-center justify-between py-0.5">
          <span className="text-slate-400">Velikost STL souboru:</span>
          <span className="font-mono font-medium text-slate-200">
            {formatBytes(stats.fileSize)}
          </span>
        </div>
      </div>
    </div>
  )
}

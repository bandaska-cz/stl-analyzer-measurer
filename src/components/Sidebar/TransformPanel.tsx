import React, { useState, useEffect } from 'react'
import type { ModelStats } from '../../types'
import {
  Scale,
  Lock,
  Unlock,
  RotateCw,
  ArrowDownToLine,
  Compass,
  Download,
  RotateCcw,
} from 'lucide-react'

interface TransformPanelProps {
  stats: ModelStats | null
  onScaleDimensions: (targetX: number, targetY: number, targetZ: number) => void
  onScaleUniformFactor: (factor: number) => void
  onRotateAxis: (axis: 'X' | 'Y' | 'Z', degrees: number) => void
  onDropToBed: () => void
  onCenterModel: () => void
  onResetOriginal: () => void
  onExportSTL: () => void
}

export const TransformPanel: React.FC<TransformPanelProps> = ({
  stats,
  onScaleDimensions,
  onScaleUniformFactor,
  onRotateAxis,
  onDropToBed,
  onCenterModel,
  onResetOriginal,
  onExportSTL,
}) => {
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true)
  const [targetX, setTargetX] = useState<string>('')
  const [targetY, setTargetY] = useState<string>('')
  const [targetZ, setTargetZ] = useState<string>('')
  const [percentScale, setPercentScale] = useState<string>('100')

  // Synchronize target inputs when stats change
  useEffect(() => {
    if (stats) {
      setTargetX(stats.dimensions.x.toFixed(2))
      setTargetY(stats.dimensions.y.toFixed(2))
      setTargetZ(stats.dimensions.z.toFixed(2))
    }
  }, [stats?.dimensions.x, stats?.dimensions.y, stats?.dimensions.z])

  if (!stats) {
    return (
      <div className="p-6 text-center text-slate-500 text-xs">
        Žádný model není načten.
      </div>
    )
  }

  // Handle changing X
  const handleXChange = (valStr: string) => {
    setTargetX(valStr)
    const newX = parseFloat(valStr)
    if (lockAspectRatio && !isNaN(newX) && newX > 0 && stats.dimensions.x > 0) {
      const ratio = newX / stats.dimensions.x
      setTargetY((stats.dimensions.y * ratio).toFixed(2))
      setTargetZ((stats.dimensions.z * ratio).toFixed(2))
    }
  }

  // Handle changing Y
  const handleYChange = (valStr: string) => {
    setTargetY(valStr)
    const newY = parseFloat(valStr)
    if (lockAspectRatio && !isNaN(newY) && newY > 0 && stats.dimensions.y > 0) {
      const ratio = newY / stats.dimensions.y
      setTargetX((stats.dimensions.x * ratio).toFixed(2))
      setTargetZ((stats.dimensions.z * ratio).toFixed(2))
    }
  }

  // Handle changing Z
  const handleZChange = (valStr: string) => {
    setTargetZ(valStr)
    const newZ = parseFloat(valStr)
    if (lockAspectRatio && !isNaN(newZ) && newZ > 0 && stats.dimensions.z > 0) {
      const ratio = newZ / stats.dimensions.z
      setTargetX((stats.dimensions.x * ratio).toFixed(2))
      setTargetY((stats.dimensions.y * ratio).toFixed(2))
    }
  }

  const handleApplyDimensions = () => {
    const x = parseFloat(targetX)
    const y = parseFloat(targetY)
    const z = parseFloat(targetZ)
    if (!isNaN(x) && !isNaN(y) && !isNaN(z) && x > 0 && y > 0 && z > 0) {
      onScaleDimensions(x, y, z)
    }
  }

  const handleApplyPercentage = () => {
    const p = parseFloat(percentScale)
    if (!isNaN(p) && p > 0) {
      onScaleUniformFactor(p / 100)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* 1. Dimensional Resizing (mm) */}
      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-indigo-400" />
            Zadat cílové rozměry (mm)
          </span>

          <button
            onClick={() => setLockAspectRatio(!lockAspectRatio)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              lockAspectRatio
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Zamknout poměr stran (rovnoměrné zvětšení/zmenšení)"
          >
            {lockAspectRatio ? (
              <>
                <Lock className="w-3 h-3" />
                <span>Poměr zamčen</span>
              </>
            ) : (
              <>
                <Unlock className="w-3 h-3" />
                <span>Odemčeno</span>
              </>
            )}
          </button>
        </div>

        {/* Inputs for X, Y, Z */}
        <div className="grid grid-cols-3 gap-2">
          {/* Target X */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-red-400 font-bold">Šířka (X)</span>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={targetX}
                onChange={(e) => handleXChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 pointer-events-none">
                mm
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Pův: {stats.dimensions.x.toFixed(1)}
            </span>
          </div>

          {/* Target Y */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-emerald-400 font-bold">Hloubka (Y)</span>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={targetY}
                onChange={(e) => handleYChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 pointer-events-none">
                mm
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Pův: {stats.dimensions.y.toFixed(1)}
            </span>
          </div>

          {/* Target Z */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-mono text-blue-400 font-bold">Výška (Z)</span>
            <div className="relative">
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={targetZ}
                onChange={(e) => handleZChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 pointer-events-none">
                mm
              </span>
            </div>
            <span className="text-[10px] text-slate-500">
              Pův: {stats.dimensions.z.toFixed(1)}
            </span>
          </div>
        </div>

        <button
          onClick={handleApplyDimensions}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
        >
          <Scale className="w-3.5 h-3.5" />
          <span>Aplikovat novou velikost</span>
        </button>
      </div>

      {/* 2. Scale by Percentage */}
      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Změna velikosti v procentech (%)
        </span>

        {/* Quick percentage chips */}
        <div className="grid grid-cols-5 gap-1.5">
          {[50, 75, 125, 150, 200].map((pct) => (
            <button
              key={pct}
              onClick={() => onScaleUniformFactor(pct / 100)}
              className="py-1 px-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-mono font-medium transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="number"
            value={percentScale}
            onChange={(e) => setPercentScale(e.target.value)}
            className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono focus:outline-none"
            placeholder="100"
          />
          <span className="text-xs text-slate-400">%</span>

          <button
            onClick={handleApplyPercentage}
            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Přepočítat
          </button>
        </div>

        {/* Inch <-> mm quick conversion */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={() => onScaleUniformFactor(25.4)}
            className="flex-1 py-1 px-2 bg-slate-800/80 hover:bg-indigo-900/40 text-indigo-300 rounded text-[11px] transition-colors border border-indigo-500/30"
            title="Převést model vytvořený v palcích do milimetrů (×25.4)"
          >
            Palce → mm (×25.4)
          </button>
          <button
            onClick={() => onScaleUniformFactor(1 / 25.4)}
            className="flex-1 py-1 px-2 bg-slate-800/80 hover:bg-indigo-900/40 text-indigo-300 rounded text-[11px] transition-colors border border-indigo-500/30"
            title="Převést milimetry do palců (÷25.4)"
          >
            mm → Palce (÷25.4)
          </button>
        </div>
      </div>

      {/* 3. Orientation & Bed Alignment */}
      <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2.5">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Orientace a usazení na podložku
        </span>

        {/* Rotate 90 deg */}
        <div className="grid grid-cols-3 gap-1.5">
          <button
            onClick={() => onRotateAxis('X', 90)}
            className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            title="Otočit o 90 stupňů kolem osy X"
          >
            <RotateCw className="w-3 h-3 text-red-400" />
            <span>Otočit X</span>
          </button>
          <button
            onClick={() => onRotateAxis('Y', 90)}
            className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            title="Otočit o 90 stupňů kolem osy Y"
          >
            <RotateCw className="w-3 h-3 text-emerald-400" />
            <span>Otočit Y</span>
          </button>
          <button
            onClick={() => onRotateAxis('Z', 90)}
            className="flex items-center justify-center gap-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition-colors"
            title="Otočit o 90 stupňů kolem osy Z"
          >
            <RotateCw className="w-3 h-3 text-blue-400" />
            <span>Otočit Z</span>
          </button>
        </div>

        {/* Lay flat & Center */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onDropToBed}
            className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            title="Položit spodní hranu modelu na rovinu podložky (Z=0)"
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
            <span>Položit na podložku</span>
          </button>
          <button
            onClick={onCenterModel}
            className="flex items-center justify-center gap-1.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            title="Vycentrovat model na střed podložky (X=0, Y=0)"
          >
            <Compass className="w-3.5 h-3.5 text-indigo-400" />
            <span>Vycentrovat</span>
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={onResetOriginal}
          className="mt-1 flex items-center justify-center gap-1.5 py-1 px-2 text-slate-400 hover:text-slate-200 text-xs transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Vrátit původní stav před úpravami</span>
        </button>
      </div>

      {/* 4. Export Modified STL */}
      <div className="pt-1">
        <button
          onClick={onExportSTL}
          className="w-full py-3 px-4 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/25 transition-all text-xs"
        >
          <Download className="w-4 h-4" />
          <span>Stáhnout upravený model (STL)</span>
        </button>
        <p className="text-[11px] text-slate-500 text-center mt-1.5">
          Exportuje binární STL se všemi aplikovanými rozměry pro 3D slicer.
        </p>
      </div>
    </div>
  )
}

import React from 'react'
import type { MeasureMode, RenderSettings } from '../../types'
import {
  Grid,
  Magnet,
  Maximize2,
  Box,
  Ruler,
} from 'lucide-react'

interface CanvasToolbarProps {
  settings: RenderSettings
  onChangeSettings: (settings: Partial<RenderSettings>) => void
  isMeasuringActive: boolean
  onToggleMeasure: () => void
  measureMode: MeasureMode
  setMeasureMode: (mode: MeasureMode) => void
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  settings,
  onChangeSettings,
  isMeasuringActive,
  onToggleMeasure,
  measureMode,
  setMeasureMode,
}) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl text-xs">
        {/* Render mode dropdown / buttons */}
        <div className="flex items-center gap-0.5 bg-slate-800/80 p-0.5 rounded-xl border border-slate-700/50">
          <button
            onClick={() => onChangeSettings({ renderMode: 'solid-wireframe' })}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              settings.renderMode === 'solid-wireframe'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
            title="Těleso se zvýrazněnými hranami (Doporučeno pro měření)"
          >
            Hrany
          </button>
          <button
            onClick={() => onChangeSettings({ renderMode: 'solid' })}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              settings.renderMode === 'solid'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
            title="Hladký stínovaný povrch"
          >
            Hladký
          </button>
          <button
            onClick={() => onChangeSettings({ renderMode: 'matcap' })}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              settings.renderMode === 'matcap'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
            title="Matcap (Zvýraznění detailů a vrstev)"
          >
            Matcap
          </button>
          <button
            onClick={() => onChangeSettings({ renderMode: 'xray' })}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              settings.renderMode === 'xray'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
            title="Rentgen / Průhledný režim pro vnitřní dutiny"
          >
            X-Ray
          </button>
          <button
            onClick={() => onChangeSettings({ renderMode: 'wireframe' })}
            className={`px-2.5 py-1.5 rounded-lg font-medium transition-all ${
              settings.renderMode === 'wireframe'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
            }`}
            title="Drátěný model (Wireframe sítí)"
          >
            Síť
          </button>
        </div>

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Ruler toggle */}
        <button
          onClick={onToggleMeasure}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
            isMeasuringActive
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
              : 'bg-slate-800/80 text-cyan-400 border-slate-700/50 hover:bg-slate-700/50'
          }`}
          title="Aktivovat / deaktivovat pravítko (Klávesa M)"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Pravítko</span>
        </button>

        {/* Measurement mode quick selector (Visible when measuring is active) */}
        {isMeasuringActive && (
          <div className="flex items-center gap-0.5 bg-slate-800/90 p-0.5 rounded-xl border border-cyan-500/40">
            <button
              onClick={() => setMeasureMode('point-to-point')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                measureMode === 'point-to-point'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Bod – Bod (Rohy a vrcholy)"
            >
              Bod–Bod
            </button>
            <button
              onClick={() => setMeasureMode('wall-thickness')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                measureMode === 'wall-thickness'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Kolmá tloušťka stěny skrz materiál (1 klik)"
            >
              Tloušťka
            </button>
            <button
              onClick={() => setMeasureMode('face-to-face')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                measureMode === 'face-to-face'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Kolmá vzdálenost a úhel dvou stěn (2 kliky)"
            >
              Stěny
            </button>
            <button
              onClick={() => setMeasureMode('edge-to-edge')}
              className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                measureMode === 'edge-to-edge'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="Nejkratší vzdálenost dvou hran (2 kliky)"
            >
              Hrany
            </button>
          </div>
        )}

        <div className="w-px h-5 bg-slate-700 mx-1" />

        {/* Snapping toggle */}
        <button
          onClick={() => onChangeSettings({ snapToVertex: !settings.snapToVertex })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
            settings.snapToVertex || settings.snapToEdge
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-200'
          }`}
          title="Magnetické přichytávání (Rohy a hrany)"
        >
          <Magnet className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Magnet</span>
        </button>

        {/* Bounding box toggle */}
        <button
          onClick={() => onChangeSettings({ showBoundingBox: !settings.showBoundingBox })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
            settings.showBoundingBox
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-sm'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-200'
          }`}
          title="Zobrazit ohraničující kvádr (Bounding Box)"
        >
          <Box className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kvádr</span>
        </button>

        {/* Bounding box dimensions caliper toggle */}
        <button
          onClick={() => onChangeSettings({ showBoxDimensions: !settings.showBoxDimensions })}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition-all ${
            settings.showBoxDimensions
              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-200'
          }`}
          title="Zobrazit 3D kóty rozměrů ohraničení (X, Y, Z)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Kóty X/Y/Z</span>
        </button>

        {/* Grid toggle */}
        <button
          onClick={() => onChangeSettings({ showGrid: !settings.showGrid })}
          className={`p-1.5 rounded-xl border transition-all ${
            settings.showGrid
              ? 'bg-slate-700 text-indigo-300 border-slate-600'
              : 'bg-slate-800/80 text-slate-500 border-slate-700/50 hover:text-slate-300'
          }`}
          title="Zobrazit / skrýt mřížku tiskové podložky"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

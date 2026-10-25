import React from 'react'
import type { CameraPreset } from '../../types'
import { Box, RotateCcw } from 'lucide-react'

interface ViewGizmoProps {
  onSelectPreset: (preset: CameraPreset) => void
  onResetCamera: () => void
  orthographic: boolean
  onToggleOrthographic: () => void
}

export const ViewGizmo: React.FC<ViewGizmoProps> = ({
  onSelectPreset,
  onResetCamera,
  orthographic,
  onToggleOrthographic,
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2 pointer-events-none">
      {/* View Presets Floating Widget */}
      <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl p-1.5 shadow-xl flex flex-col gap-1 text-xs">
        <div className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 uppercase tracking-wider text-center">
          Pohled kamery
        </div>
        
        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={() => onSelectPreset('top')}
            className="px-2 py-1.5 bg-slate-800 hover:bg-indigo-600/80 hover:text-white rounded text-slate-300 font-medium transition-colors text-center"
            title="Pohled shora (Top)"
          >
            Shora
          </button>
          <button
            onClick={() => onSelectPreset('iso')}
            className="px-2 py-1.5 bg-indigo-950/70 border border-indigo-500/40 hover:bg-indigo-600 hover:text-white rounded text-indigo-300 font-medium transition-colors text-center"
            title="Izometrický 3D pohled"
          >
            3D Iso
          </button>
          <button
            onClick={() => onSelectPreset('bottom')}
            className="px-2 py-1.5 bg-slate-800 hover:bg-indigo-600/80 hover:text-white rounded text-slate-300 font-medium transition-colors text-center"
            title="Pohled zdola (Bottom)"
          >
            Zdola
          </button>

          <button
            onClick={() => onSelectPreset('left')}
            className="px-2 py-1.5 bg-slate-800 hover:bg-indigo-600/80 hover:text-white rounded text-slate-300 font-medium transition-colors text-center"
            title="Pohled zleva (Left)"
          >
            Zleva
          </button>
          <button
            onClick={() => onSelectPreset('front')}
            className="px-2 py-1.5 bg-slate-800 hover:bg-indigo-600/80 hover:text-white rounded text-slate-300 font-medium transition-colors text-center"
            title="Pohled zepředu (Front)"
          >
            Zepředu
          </button>
          <button
            onClick={() => onSelectPreset('right')}
            className="px-2 py-1.5 bg-slate-800 hover:bg-indigo-600/80 hover:text-white rounded text-slate-300 font-medium transition-colors text-center"
            title="Pohled zprava (Right)"
          >
            Zprava
          </button>
        </div>

        <div className="h-px bg-slate-700/60 my-0.5" />

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleOrthographic}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded transition-colors ${
              orthographic
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Přepnout mezi perspektivní a ortografickou projekcí (CAD)"
          >
            <Box className="w-3.5 h-3.5" />
            <span>{orthographic ? 'Orto CAD' : 'Perspektiva'}</span>
          </button>

          <button
            onClick={onResetCamera}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
            title="Vycentrovat model a obnovit kameru"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

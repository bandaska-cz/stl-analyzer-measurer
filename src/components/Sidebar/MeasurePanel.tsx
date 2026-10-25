import React, { useState } from 'react'
import type { Measurement, RenderSettings } from '../../types'
import {
  Ruler,
  Magnet,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Check,
  Scale,
} from 'lucide-react'

interface MeasurePanelProps {
  measurements: Measurement[]
  selectedMeasurementId: string | null
  onSelectMeasurement: (id: string | null) => void
  onDeleteMeasurement: (id: string) => void
  onClearAllMeasurements: () => void
  onToggleVisibility: (id: string) => void
  onUpdateName: (id: string, name: string) => void
  isMeasuringActive: boolean
  onToggleMeasure: () => void
  settings: RenderSettings
  onChangeSettings: (settings: Partial<RenderSettings>) => void
  onScaleByMeasurement: (measurementId: string, targetDistance: number) => void
}

export const MeasurePanel: React.FC<MeasurePanelProps> = ({
  measurements,
  selectedMeasurementId,
  onSelectMeasurement,
  onDeleteMeasurement,
  onClearAllMeasurements,
  onToggleVisibility,
  onUpdateName,
  isMeasuringActive,
  onToggleMeasure,
  settings,
  onChangeSettings,
  onScaleByMeasurement,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState<string>('')
  const [scalingId, setScalingId] = useState<string | null>(null)
  const [targetDimInput, setTargetDimInput] = useState<string>('')

  const handleStartEdit = (m: Measurement) => {
    setEditingId(m.id)
    setEditingName(m.name)
  }

  const handleSaveEdit = (id: string) => {
    if (editingName.trim()) {
      onUpdateName(id, editingName.trim())
    }
    setEditingId(null)
  }

  const handleStartScale = (m: Measurement) => {
    setScalingId(m.id)
    setTargetDimInput(m.distance.toFixed(2))
  }

  const handleApplyScale = (m: Measurement) => {
    const target = parseFloat(targetDimInput)
    if (!isNaN(target) && target > 0) {
      onScaleByMeasurement(m.id, target)
      setScalingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* Primary Ruler Action Button */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onToggleMeasure}
          className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2.5 transition-all shadow-lg ${
            isMeasuringActive
              ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 ring-4 ring-cyan-500/30 animate-pulse'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25'
          }`}
        >
          <Ruler className="w-5 h-5" />
          <span>
            {isMeasuringActive ? 'Měření aktivní (Klikněte na model)' : 'Spustit pravítko (Klávesa M)'}
          </span>
        </button>

        <p className="text-xs text-slate-400 px-1">
          {isMeasuringActive
            ? 'Kliknutím vyberte 1. a 2. bod na povrchu modelu. Klávesou Esc měření zrušíte.'
            : 'Měřte vzdálenosti mezi dvěma libovolnými body nebo vrcholy s přesností na 0.01 mm.'}
        </p>
      </div>

      {/* Snap Settings Card */}
      <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
            <Magnet className="w-4 h-4 text-emerald-400" />
            <span>Magnetické přichytávání k vrcholům</span>
          </label>
          <input
            type="checkbox"
            checked={settings.snapToVertex}
            onChange={(e) => onChangeSettings({ snapToVertex: e.target.checked })}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-xs">
          <span className="text-slate-400">Kóty ohraničení (X, Y, Z)</span>
          <button
            onClick={() => onChangeSettings({ showBoxDimensions: !settings.showBoxDimensions })}
            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
              settings.showBoxDimensions
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {settings.showBoxDimensions ? 'Zobrazeno' : 'Skryto'}
          </button>
        </div>
      </div>

      {/* Measurements List Header */}
      <div className="flex items-center justify-between pt-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Uložená měření ({measurements.length})
        </h3>
        {measurements.length > 0 && (
          <button
            onClick={onClearAllMeasurements}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Smazat vše
          </button>
        )}
      </div>

      {/* Measurements Empty State */}
      {measurements.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/40 text-slate-400 flex flex-col items-center gap-2">
          <Ruler className="w-8 h-8 text-slate-600" />
          <p className="text-xs">
            Zatím jste neprovedli žádné měření. Klikněte na <strong>Spustit pravítko</strong> výše a klikněte na 2 body na modelu.
          </p>
        </div>
      ) : (
        /* Measurements Cards */
        <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
          {measurements.map((m) => {
            const isSelected = m.id === selectedMeasurementId
            const isEditing = m.id === editingId
            const isScaling = m.id === scalingId

            return (
              <div
                key={m.id}
                onClick={() => onSelectMeasurement(m.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                  isSelected
                    ? 'bg-slate-800/90 border-cyan-500/60 shadow-md ring-1 ring-cyan-500/40'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                {/* Header: Color Swatch, Name & Actions */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: m.color }}
                    />
                    {isEditing ? (
                      <div
                        className="flex items-center gap-1 flex-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(m.id)
                          }}
                          className="bg-slate-950 border border-slate-700 px-2 py-0.5 rounded text-xs text-white w-full focus:outline-none focus:border-cyan-500"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveEdit(m.id)}
                          className="p-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {m.name}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center gap-1 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isEditing && (
                      <button
                        onClick={() => handleStartEdit(m)}
                        className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                        title="Přejmenovat"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => onToggleVisibility(m.id)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                      title={m.visible ? 'Skrýt kótu' : 'Zobrazit kótu'}
                    >
                      {m.visible ? (
                        <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>
                    <button
                      onClick={() => onDeleteMeasurement(m.id)}
                      className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800"
                      title="Smazat měření"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main 3D Distance Display */}
                <div className="flex items-baseline justify-between">
                  <span className="text-xl font-bold font-mono tracking-tight text-white">
                    {m.distance.toFixed(2)}{' '}
                    <span className="text-xs font-normal text-slate-400">mm</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Přímá vzdálenost</span>
                </div>

                {/* Delta XYZ Breakdown */}
                <div className="grid grid-cols-3 gap-1 py-1.5 px-2 bg-slate-950/60 rounded-lg text-[11px] font-mono border border-slate-800/80">
                  <div className="text-center">
                    <span className="text-red-400">ΔX: </span>
                    <span className="text-slate-200">{m.deltaX.toFixed(1)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-emerald-400">ΔY: </span>
                    <span className="text-slate-200">{m.deltaY.toFixed(1)}</span>
                  </div>
                  <div className="text-center">
                    <span className="text-blue-400">ΔZ: </span>
                    <span className="text-slate-200">{m.deltaZ.toFixed(1)}</span>
                  </div>
                </div>

                {/* Scale by measurement feature */}
                {isScaling ? (
                  <div
                    className="p-2 bg-indigo-950/50 border border-indigo-500/40 rounded-lg flex flex-col gap-2 mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-[11px] font-medium text-indigo-300">
                      Zadejte požadovaný rozměr pro celou součástku:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="0.1"
                        value={targetDimInput}
                        onChange={(e) => setTargetDimInput(e.target.value)}
                        className="bg-slate-900 border border-indigo-500/50 px-2 py-1 rounded text-xs text-white font-mono w-24 focus:outline-none"
                      />
                      <span className="text-xs text-slate-400">mm</span>
                      <button
                        onClick={() => handleApplyScale(m)}
                        className="ml-auto px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium transition-colors"
                      >
                        Přepočítat model
                      </button>
                      <button
                        onClick={() => setScalingId(null)}
                        className="px-1.5 py-1 text-slate-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartScale(m)
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-slate-700/50 text-[11px] transition-colors"
                  >
                    <Scale className="w-3.5 h-3.5" />
                    <span>Škálovat model podle tohoto rozměru</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

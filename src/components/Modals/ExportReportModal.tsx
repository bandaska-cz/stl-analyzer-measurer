import React, { useState } from 'react'
import { X, FileText, Download, Check, Copy } from 'lucide-react'
import type { Measurement, ModelStats } from '../../types'
import { formatMm } from '../../utils/meshCalculations'
import { exportMeasurementReport } from '../../utils/stlHandler'

interface ExportReportModalProps {
  isOpen: boolean
  onClose: () => void
  stats: ModelStats | null
  measurements: Measurement[]
}

export const ExportReportModal: React.FC<ExportReportModalProps> = ({
  isOpen,
  onClose,
  stats,
  measurements,
}) => {
  const [copied, setCopied] = useState<boolean>(false)

  if (!isOpen || !stats) return null

  const weightEstimate = stats.volume * 1.24 * 0.36 // PLA 20% infill approx
  const materialName = 'PLA (1.24 g/cm³, 20% infill)'

  const handleCopyText = () => {
    let text = `Protokol o měření - ${stats.name}\n`
    text += `Rozměry: ${formatMm(stats.dimensions.x)} × ${formatMm(stats.dimensions.y)} × ${formatMm(stats.dimensions.z)}\n`
    text += `Objem: ${stats.volume.toFixed(2)} cm³\n`
    text += `Plocha povrchu: ${stats.surfaceArea.toFixed(2)} cm²\n`
    text += `Počet trojúhelníků: ${stats.triangleCount}\n`
    text += `Naměřené rozměry:\n`
    measurements.forEach((m, idx) => {
      text += `  #${idx + 1} ${m.name}: ${formatMm(m.distance)} (ΔX: ${formatMm(m.deltaX)}, ΔY: ${formatMm(m.deltaY)}, ΔZ: ${formatMm(m.deltaZ)})\n`
    })

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl p-6 text-slate-200 flex flex-col gap-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Protokol o měření a analýze</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Preview */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs max-h-80 overflow-y-auto flex flex-col gap-3">
          <div className="border-b border-slate-800 pb-2">
            <div className="text-white font-bold">{stats.name}</div>
            <div className="text-slate-400">
              Rozměry: {formatMm(stats.dimensions.x)} × {formatMm(stats.dimensions.y)} × {formatMm(stats.dimensions.z)}
            </div>
            <div className="text-slate-400">
              Objem: {stats.volume.toFixed(2)} cm³ | Povrch: {stats.surfaceArea.toFixed(2)} cm²
            </div>
            <div className="text-slate-400">
              Trojúhelníky: {stats.triangleCount.toLocaleString()} | Manifold: {stats.isWatertight ? 'ANO' : 'NE'}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-slate-300 font-bold uppercase text-[11px]">
              Seznam kót ({measurements.length}):
            </span>
            {measurements.length === 0 ? (
              <span className="text-slate-500 italic">Žádné uložené kóty.</span>
            ) : (
              measurements.map((m, idx) => (
                <div
                  key={m.id}
                  className="p-2 rounded bg-slate-900 border border-slate-800/80 flex flex-col gap-1"
                >
                  <div className="flex justify-between items-center text-white">
                    <span>
                      #{idx + 1} {m.name}
                    </span>
                    <span className="font-bold text-cyan-400">{formatMm(m.distance, 2)}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex gap-3">
                    <span>ΔX: {formatMm(m.deltaX, 1)}</span>
                    <span>ΔY: {formatMm(m.deltaY, 1)}</span>
                    <span>ΔZ: {formatMm(m.deltaZ, 1)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Zkopírováno' : 'Kopírovat do schránky'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                exportMeasurementReport(stats, measurements, materialName, weightEstimate, 'txt')
              }
              className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Stáhnout TXT</span>
            </button>
            <button
              onClick={() =>
                exportMeasurementReport(stats, measurements, materialName, weightEstimate, 'json')
              }
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Stáhnout JSON</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


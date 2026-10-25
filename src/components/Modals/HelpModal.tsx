import React from 'react'
import { X, Ruler, Scale, Magnet } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 text-slate-200 flex flex-col gap-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Ruler className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white">Nápověda & Ovládání</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 text-xs">
          {/* Section 1: Measuring */}
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              1. Jak přesně měřit rozměry (Pravítko)
            </h3>
            <p className="text-slate-300 leading-relaxed">
              Stiskněte tlačítko <strong>Spustit pravítko</strong> (nebo klávesu <code>M</code>). Kurzor se změní na nitkový kříž. Kliknutím na model zvolte <strong>první bod</strong>, poté přejeďte myší a klikněte na <strong>druhý bod</strong>. Vzdálenost se okamžitě spočítá a zobrazí se 3D kóta s přímou vzdáleností i rozpadem ΔX, ΔY, ΔZ.
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center gap-2 text-slate-400">
              <Magnet className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Magnetické přichytávání:</strong> Při najetí blízko vrcholu nebo hrany se kurzor magneticky přichytí přesně k vrcholu trojúhelníkové sítě (zelený bod).
              </span>
            </div>
          </div>

          {/* Section 2: Resizing */}
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-amber-400 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              2. Úprava velikosti modelu
            </h3>
            <p className="text-slate-300 leading-relaxed">
              V záložce <strong>Upravit velikost</strong> můžete:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Zadat přesné rozměry v milimetrech se zamčeným nebo odemčeným poměrem stran.</li>
              <li>Zvětšit / zmenšit model o procenta (např. 150 % nebo 50 %).</li>
              <li>Převést model z palců do milimetrů (×25.4) jedním klikem.</li>
              <li>Škálovat model <strong>přímo podle naměřené kóty</strong> (v záložce Měření).</li>
            </ul>
          </div>

          {/* Section 3: Shortcuts */}
          <div className="flex flex-col gap-1.5">
            <h3 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">
              Klávesové zkratky a myš
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-white font-bold">Levé tlačítko myši</span>: Rotace pohledu / Měření
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-white font-bold">Pravé tl. / Shift</span>: Posun pohledu (Pan)
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-white font-bold">Kolečko myši</span>: Přiblížení / Oddálení (Zoom)
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800">
                <span className="text-white font-bold">Klávesa M</span>: Spustit / Ukončit pravítko
              </div>
              <div className="p-2 bg-slate-950/60 rounded border border-slate-800 col-span-2">
                <span className="text-white font-bold">Klávesa Escape</span>: Zrušit aktivní měření
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Rozumím
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useRef, useState, useEffect } from 'react'
import {
  Upload,
  Download,
  FileText,
  HelpCircle,
  Box,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { SAMPLE_MODELS } from '../utils/sampleModels'
import type { ModelStats } from '../types'

interface HeaderProps {
  onFileUpload: (file: File) => void
  onSelectSampleModel: (id: string) => void
  onExportSTL: () => void
  onOpenReportModal: () => void
  onOpenHelpModal: () => void
  stats: ModelStats | null
}

export const Header: React.FC<HeaderProps> = ({
  onFileUpload,
  onSelectSampleModel,
  onExportSTL,
  onOpenReportModal,
  onOpenHelpModal,
  stats,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [isSampleMenuOpen, setIsSampleMenuOpen] = useState<boolean>(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
      // Reset input value so same file can be uploaded again if needed
      e.target.value = ''
    }
  }

  // Handle closing sample menu on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSampleMenuOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsSampleMenuOpen(false)
      }
    }

    if (isSampleMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSampleMenuOpen])

  return (
    <header className="h-14 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 flex items-center justify-between shrink-0 z-30">
      {/* Left: App Logo & Current File */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
          <Box className="w-5 h-5" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white">
              STL Analyzer & Ruler
            </span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded">
              v1.0
            </span>
          </div>
          {stats ? (
            <span className="text-[11px] text-slate-400 truncate max-w-[200px] md:max-w-[320px]">
              {stats.name} ({stats.dimensions.x.toFixed(1)} ×{' '}
              {stats.dimensions.y.toFixed(1)} × {stats.dimensions.z.toFixed(1)} mm)
            </span>
          ) : (
            <span className="text-[11px] text-slate-500">Měření a úprava 3D modelů</span>
          )}
        </div>
      </div>

      {/* Center / Right Actions */}
      <div className="flex items-center gap-2">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".stl"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-indigo-500/25 transition-all"
        >
          <Upload className="w-4 h-4" />
          <span className="hidden sm:inline">Nahrát STL</span>
        </button>

        {/* Sample Models Dropdown (Click to toggle with outside click detection) */}
        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setIsSampleMenuOpen((prev) => !prev)}
            aria-expanded={isSampleMenuOpen}
            aria-haspopup="true"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              isSampleMenuOpen
                ? 'bg-slate-700 text-white border-indigo-500/60 shadow-inner'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Ukázkové modely</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${
                isSampleMenuOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isSampleMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-50">
              <div className="text-[10px] font-bold uppercase text-slate-400 px-2 py-1">
                Vybrat testovací model
              </div>
              {SAMPLE_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelectSampleModel(model.id)
                    setIsSampleMenuOpen(false)
                  }}
                  className="text-left px-2.5 py-2 hover:bg-slate-800 rounded-lg transition-colors flex flex-col text-slate-200"
                >
                  <span className="text-xs font-semibold text-white">{model.name}</span>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {model.description}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-5 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Export STL Button */}
        <button
          onClick={onExportSTL}
          disabled={!stats}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-emerald-600/90 hover:text-white text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-medium transition-all disabled:opacity-40 disabled:pointer-events-none"
          title="Stáhnout upravený nebo původní STL soubor"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export STL</span>
        </button>

        {/* Export Report */}
        <button
          onClick={onOpenReportModal}
          disabled={!stats}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium border border-slate-700/60 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          title="Zobrazit a exportovat protokol o měření"
        >
          <FileText className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden md:inline">Protokol</span>
        </button>

        {/* Help button */}
        <button
          onClick={onOpenHelpModal}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          title="Nápověda a klávesové zkratky"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}

import React from 'react'
import { Ruler, Activity, Scale } from 'lucide-react'

export type ActiveTab = 'measure' | 'analyze' | 'transform'

interface TabsProps {
  activeTab: ActiveTab
  onChangeTab: (tab: ActiveTab) => void
  measurementCount: number
}

export const Tabs: React.FC<TabsProps> = ({
  activeTab,
  onChangeTab,
  measurementCount,
}) => {
  return (
    <div className="flex border-b border-slate-800 bg-slate-950/80 p-1.5 gap-1 shrink-0">
      {/* Measure Tab */}
      <button
        onClick={() => onChangeTab('measure')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
          activeTab === 'measure'
            ? 'bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
      >
        <Ruler className="w-3.5 h-3.5" />
        <span>Měření</span>
        {measurementCount > 0 && (
          <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 rounded-full text-[10px] font-mono">
            {measurementCount}
          </span>
        )}
      </button>

      {/* Analyze Tab */}
      <button
        onClick={() => onChangeTab('analyze')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
          activeTab === 'analyze'
            ? 'bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
      >
        <Activity className="w-3.5 h-3.5" />
        <span>Analýza</span>
      </button>

      {/* Transform Tab */}
      <button
        onClick={() => onChangeTab('transform')}
        className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
          activeTab === 'transform'
            ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700/60'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
        }`}
      >
        <Scale className="w-3.5 h-3.5" />
        <span>Upravit velikost</span>
      </button>
    </div>
  )
}


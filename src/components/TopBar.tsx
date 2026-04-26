'use client'

import { EXAMPLES } from '@/data/examples'
import type { ExampleAutomaton } from '@/types/automaton'

interface TopBarProps {
  onLoadExample: (example: ExampleAutomaton) => void
  onNewAutomaton: () => void
}

export default function TopBar({ onLoadExample, onNewAutomaton }: TopBarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-4 shrink-0 shadow-sm">
      <div className="flex items-center gap-2 mr-2">
        <span className="text-2xl select-none">🔄</span>
        <span className="font-bold text-slate-800 text-lg leading-tight">
          FA Visualizer
        </span>
        <span className="text-xs text-slate-400 font-normal hidden sm:inline">
          Finite Automata Explorer
        </span>
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:block">
          Load example:
        </label>
        <select
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[220px]"
          defaultValue=""
          onChange={(e) => {
            const idx = Number(e.target.value)
            if (!isNaN(idx) && EXAMPLES[idx]) {
              onLoadExample(EXAMPLES[idx])
            }
            e.target.value = ''
          }}
        >
          <option value="" disabled>
            Choose an example…
          </option>
          {EXAMPLES.map((ex, i) => (
            <option key={i} value={i}>
              {ex.type}: {ex.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={onNewAutomaton}
        className="ml-auto text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
      >
        + New
      </button>
    </header>
  )
}

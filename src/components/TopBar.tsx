'use client'

import { useState, useMemo } from 'react'
import type { DiagramId, DiagramMeta } from '@/types/diagrams'
import { exampleIndexFromId, isExampleDiagramId } from '@/lib/diagramIds'

interface TopBarProps {
  onNewAutomaton: () => void

  diagrams: DiagramMeta[]
  selectedDiagramId: DiagramId | null
  onSelectDiagram: (id: DiagramId) => void
  onCreateDiagram: () => void
  onRenameDiagram: () => void
  onResetExample: () => void
  onDeleteDiagram: () => void
}

export default function TopBar({
  onNewAutomaton,
  diagrams = [],
  selectedDiagramId,
  onSelectDiagram,
  onCreateDiagram,
  onRenameDiagram,
  onResetExample,
  onDeleteDiagram,
}: TopBarProps) {
  const isExample = selectedDiagramId ? isExampleDiagramId(selectedDiagramId) : false
  const handleNew = () => {
    onNewAutomaton()
  }

  const { customDiagrams, exampleDiagrams } = useMemo(() => {
    const customs = diagrams.filter((d) => !isExampleDiagramId(d.id))
    const examples = diagrams
      .filter((d) => isExampleDiagramId(d.id))
      .sort((a, b) => (exampleIndexFromId(a.id) ?? 999) - (exampleIndexFromId(b.id) ?? 999))

    customs.sort((a, b) => {
      const aa = (a.description || a.id).toLocaleLowerCase()
      const bb = (b.description || b.id).toLocaleLowerCase()
      return aa.localeCompare(bb)
    })

    return { customDiagrams: customs, exampleDiagrams: examples }
  }, [diagrams])

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

      <div className="flex items-center gap-2 min-w-0">
        <label className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:block">
          Diagram:
        </label>
        <select
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[260px] truncate"
          value={selectedDiagramId ?? ''}
          onChange={(e) => {
            const id = e.target.value
            if (id) onSelectDiagram(id)
          }}
        >
          {diagrams.length === 0 ? (
            <option value="" disabled>
              Loading…
            </option>
          ) : selectedDiagramId ? null : (
            <option value="" disabled>
              Choose a diagram…
            </option>
          )}
          {customDiagrams.length > 0 && (
            <optgroup label="My diagrams">
              {customDiagrams.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.description || d.id}
                </option>
              ))}
            </optgroup>
          )}

          {exampleDiagrams.length > 0 && (
            <optgroup label="Examples">
              {exampleDiagrams.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.description || d.id}
                </option>
              ))}
            </optgroup>
          )}
        </select>

        <button
          onClick={onCreateDiagram}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          + New
        </button>

        {isExample ? (
          <button
            onClick={onResetExample}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Reset example back to its original state"
          >
            Reset example
          </button>
        ) : selectedDiagramId ? (
          <>
            <button
              onClick={onRenameDiagram}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Rename current diagram"
            >
              Rename
            </button>

            <button
              onClick={onDeleteDiagram}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Delete current diagram"
            >
              Delete
            </button>
          </>
        ) : null}
      </div>

      {!isExample && (
        <button
          onClick={handleNew}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
          title="Clear canvas (does not delete the diagram)"
        >
          Clear
        </button>
      )}
    </header>
  )
}

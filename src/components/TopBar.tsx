'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
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
  onRegex: () => void
  explainMode: 'off' | 'optionA' | 'optionB' | 'optionC'
  onExplainModeChange: (mode: 'off' | 'optionA' | 'optionB' | 'optionC') => void
  showConvertToDfa: boolean
  onConvertToDfa: () => void
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
  onRegex,
  explainMode,
  onExplainModeChange,
  showConvertToDfa,
  onConvertToDfa,
}: TopBarProps) {
  const isExample = selectedDiagramId ? isExampleDiagramId(selectedDiagramId) : false
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const handleNew = () => {
    onNewAutomaton()
  }

  useEffect(() => {
    if (!menuOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      const el = menuRef.current
      if (!el) return
      if (e.target instanceof Node && el.contains(e.target)) return
      setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [menuOpen])

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
      </div>

      <div className="h-6 w-px bg-slate-200" />

      <div className="flex items-center gap-2 min-w-0">
        <label className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:block">
          Diagram:
        </label>
        <select
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 max-w-[312px] truncate"
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

        <button
          onClick={onRegex}
          className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
          title="Create a new NFA from a regex"
        >
          + New (Regex)
        </button>

        {/* Hamburger menu (non-examples only) */}
        {!isExample && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-700 hover:bg-slate-50 transition-colors"
              title="Menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              ☰
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden z-50"
                role="menu"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    handleNew()
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Clear
                </button>

                {showConvertToDfa && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      onConvertToDfa()
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Convert to DFA
                  </button>
                )}

                {selectedDiagramId && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onRenameDiagram()
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Rename
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        onDeleteDiagram()
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {isExample ? (
          <button
            onClick={onResetExample}
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Reset example back to its original state"
          >
            Reset example
          </button>
        ) : selectedDiagramId ? (
          null
        ) : null}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 whitespace-nowrap hidden sm:block">
            Explain:
          </label>
          <select
            className="text-sm border border-slate-300 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
            value={explainMode}
            onChange={(e) => onExplainModeChange(e.target.value as any)}
          >
            <option value="off">Off</option>
            <option value="optionA">Option A</option>
            <option value="optionB">Option B</option>
            <option value="optionC">Option C</option>
          </select>
        </div>
      </div>
    </header>
  )
}

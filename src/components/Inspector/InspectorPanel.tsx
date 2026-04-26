'use client'

import { useState, useEffect } from 'react'
import type { StateNode, TransitionEdge } from '@/types/automaton'

interface InspectorPanelProps {
  selectedNode: StateNode | null
  selectedEdge: TransitionEdge | null
  onUpdateNode: (id: string, patch: Partial<StateNode['data']>) => void
  onUpdateEdge: (id: string, symbols: string[]) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
  onAddSelfLoop: (nodeId: string) => void
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
          checked ? 'bg-indigo-500' : 'bg-slate-300'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? 'translate-x-4' : ''
          }`}
        />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </label>
  )
}

export default function InspectorPanel({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
  onAddSelfLoop,
}: InspectorPanelProps) {
  const [labelDraft, setLabelDraft] = useState('')
  const [symbolsDraft, setSymbolsDraft] = useState('')

  useEffect(() => {
    if (selectedNode) setLabelDraft(selectedNode.data.label)
  }, [selectedNode?.id, selectedNode?.data.label])

  useEffect(() => {
    if (selectedEdge) setSymbolsDraft((selectedEdge.data?.symbols ?? []).join(', '))
  }, [selectedEdge?.id, selectedEdge?.data?.symbols])

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="p-4 text-center text-slate-400 text-sm mt-4">
        <div className="text-3xl mb-2">🖱️</div>
        <p>Click a state or transition to inspect and edit it.</p>
        <p className="mt-2">Drag from a state's edge to create transitions.</p>
      </div>
    )
  }

  if (selectedNode) {
    const { isStart, isAccepting } = selectedNode.data
    return (
      <div className="p-4 flex flex-col gap-4">
        <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">State</h3>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">Label</label>
          <input
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => onUpdateNode(selectedNode.id, { label: labelDraft.trim() || selectedNode.data.label })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onUpdateNode(selectedNode.id, { label: labelDraft.trim() || selectedNode.data.label })
                e.currentTarget.blur()
              }
            }}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>

        <div className="flex flex-col gap-3">
          <Toggle
            checked={isStart}
            onChange={(v) => onUpdateNode(selectedNode.id, { isStart: v })}
            label="Start state"
          />
          <Toggle
            checked={isAccepting}
            onChange={(v) => onUpdateNode(selectedNode.id, { isAccepting: v })}
            label="Accepting state"
          />
        </div>

        <button
          onClick={() => onAddSelfLoop(selectedNode.id)}
          className="text-sm text-indigo-600 border border-indigo-300 rounded-lg py-1.5 hover:bg-indigo-50 transition-colors"
        >
          + Add self-loop
        </button>

        <button
          onClick={() => onDeleteNode(selectedNode.id)}
          className="text-sm text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition-colors"
        >
          Delete state
        </button>
      </div>
    )
  }

  if (selectedEdge) {
    const applySymbols = () => {
      const parsed = symbolsDraft
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      onUpdateEdge(selectedEdge.id, parsed.length ? parsed : ['a'])
    }

    return (
      <div className="p-4 flex flex-col gap-4">
        <h3 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Transition</h3>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500">
            Symbols <span className="text-slate-400">(comma-separated)</span>
          </label>
          <input
            value={symbolsDraft}
            onChange={(e) => setSymbolsDraft(e.target.value)}
            onBlur={applySymbols}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                applySymbols()
                e.currentTarget.blur()
              }
            }}
            placeholder="e.g. a, b, ε"
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <p className="text-xs text-slate-400">Use ε for epsilon. Separate multiple symbols with commas.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {['a', 'b', '0', '1', 'ε'].map((sym) => (
            <button
              key={sym}
              onClick={() => {
                const current = symbolsDraft
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                if (!current.includes(sym)) {
                  const next = [...current, sym].join(', ')
                  setSymbolsDraft(next)
                  onUpdateEdge(selectedEdge.id, [...current, sym])
                }
              }}
              className="text-xs border border-slate-300 rounded px-2 py-1 hover:bg-slate-100 transition-colors"
            >
              {sym}
            </button>
          ))}
        </div>

        <button
          onClick={() => onDeleteEdge(selectedEdge.id)}
          className="text-sm text-red-600 border border-red-200 rounded-lg py-1.5 hover:bg-red-50 transition-colors"
        >
          Delete transition
        </button>
      </div>
    )
  }

  return null
}
